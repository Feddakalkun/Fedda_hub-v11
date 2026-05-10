"""
Convert one ComfyUI workflow JSON to API format (flattened node graph).

Usage:
  python dev_tools/convert_one_workflow_to_api.py --input "path\\workflow.json"
  python dev_tools/convert_one_workflow_to_api.py --input "path\\workflow.json" --output "path\\workflow_api.json"
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict


def is_api_format(data: Dict[str, Any]) -> bool:
    if "nodes" in data or "links" in data:
        return False
    for value in data.values():
        if isinstance(value, dict) and "class_type" in value:
            return True
    return False


def convert_ui_to_api(data: Dict[str, Any]) -> Dict[str, Any]:
    # link_id -> [id, from_node, from_slot, to_node, to_slot, type]
    links: Dict[int, Any] = {}
    for link in data.get("links", []):
        links[link[0]] = link

    # Known legacy nodes where widgets are positional and not always declared in inputs.
    class_widget_key_map = {
        "Int": ["Number"],
        "Float": ["Number"],
        "String Literal": ["string"],
        "SimpleMath+": ["value"],
        "LoadImage": ["image", "upload"],
        "VHS_LoadVideo": [
            "video",
            "force_rate",
            "custom_width",
            "custom_height",
            "frame_load_cap",
            "skip_first_frames",
            "select_every_nth",
            "format",
            "videopreview",
        ],
    }

    api: Dict[str, Any] = {}

    for node in data.get("nodes", []):
        node_id = str(node["id"])
        class_type = node.get("type", "Unknown")
        mapped_keys = class_widget_key_map.get(class_type, [])

        node_inputs = node.get("inputs", []) or []
        raw_widget_values = node.get("widgets_values", []) or []
        widget_values_dict = raw_widget_values if isinstance(raw_widget_values, dict) else None
        widget_values_list = list(raw_widget_values) if isinstance(raw_widget_values, list) else []
        if widget_values_dict is None and not widget_values_list and raw_widget_values not in (None, ""):
            widget_values_list = [raw_widget_values]

        resolved: Dict[str, Any] = {}
        widget_idx = 0

        for inp in node_inputs:
            name = inp.get("name", "")
            link_id = inp.get("link")
            is_widget = "widget" in inp

            if link_id is not None:
                lnk = links.get(link_id)
                if lnk:
                    resolved[name] = [str(lnk[1]), lnk[2]]
                continue

            if is_widget:
                widget_name = (inp.get("widget") or {}).get("name")
                if widget_values_dict is not None:
                    key = widget_name or name
                    if key in widget_values_dict:
                        resolved[name] = widget_values_dict[key]
                else:
                    if widget_idx < len(widget_values_list):
                        resolved[name] = widget_values_list[widget_idx]
                        widget_idx += 1
                continue

            if widget_values_dict is not None:
                if name in widget_values_dict:
                    resolved[name] = widget_values_dict[name]
            else:
                if not mapped_keys and widget_idx < len(widget_values_list):
                    resolved[name] = widget_values_list[widget_idx]
                    widget_idx += 1

        if not node_inputs:
            if widget_values_dict is not None:
                for key, value in widget_values_dict.items():
                    resolved[str(key)] = value
            elif widget_values_list:
                for idx, value in enumerate(widget_values_list):
                    resolved[f"_widget_{idx}"] = value
        elif widget_values_dict is not None:
            for key, value in widget_values_dict.items():
                key = str(key)
                if key not in resolved:
                    resolved[key] = value

        if widget_values_dict is None and widget_values_list and mapped_keys:
            for idx, key in enumerate(mapped_keys):
                if idx < len(widget_values_list) and key not in resolved:
                    resolved[key] = widget_values_list[idx]

        api[node_id] = {
            "inputs": resolved,
            "class_type": class_type,
        }

    return api


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input ComfyUI JSON file")
    parser.add_argument("--output", required=False, help="Output API JSON file")
    args = parser.parse_args()

    in_path = Path(args.input).expanduser().resolve()
    if not in_path.exists():
        raise FileNotFoundError(f"Input not found: {in_path}")

    out_path = Path(args.output).expanduser().resolve() if args.output else in_path.with_name(f"{in_path.stem}_api.json")

    with in_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if is_api_format(data):
        converted = data
        status = "already API format"
    else:
        converted = convert_ui_to_api(data)
        status = f"converted ({len(converted)} nodes)"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)

    print(f"[OK] {status}")
    print(f"[IN]  {in_path}")
    print(f"[OUT] {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

