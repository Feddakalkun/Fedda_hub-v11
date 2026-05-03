import json
import os
import uuid
from typing import Any, Dict, Optional

class WorkflowService:
    def __init__(self, workflows_dir: str):
        self.workflows_dir = workflows_dir
        self.mapping_file = os.path.join(os.path.dirname(__file__), "..", "config", "workflow_api.json")

    def load_mapping(self) -> Dict[str, Any]:
        if not os.path.exists(self.mapping_file):
            return {}
        with open(self.mapping_file, "r") as f:
            return json.load(f)

    def load_runtime_settings(self) -> Dict[str, Any]:
        settings_path = os.path.join(os.path.dirname(__file__), "..", "config", "runtime_settings.json")
        if not os.path.exists(settings_path):
            return {}
        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def get_workflow_path(self, filename: str) -> str:
        # 1. Try direct path from workflows_dir
        direct_path = os.path.join(self.workflows_dir, filename)
        if os.path.exists(direct_path):
            return direct_path
        
        # 2. Recursive search for just the basename if direct fails
        basename = os.path.basename(filename)
        for root, _, files in os.walk(self.workflows_dir):
            if basename in files:
                return os.path.join(root, basename)
        return ""

    def is_api_format(self, data: dict) -> bool:
        if 'nodes' in data or 'links' in data:
            return False
        for v in data.values():
            if isinstance(v, dict) and 'class_type' in v:
                return True
        return False

    def convert_ui_to_api(self, data: dict) -> dict:
        """
        Robust ComfyUI GUI → API format converter.
        Ported from dev_tools/convert_workflows.py
        """
        class_widget_key_map = {
            # Core literal/helper nodes
            "Int": ["Number"],
            "Float": ["Number"],
            "String Literal": ["string"],
            "SimpleMath+": ["value"],
            "LoadImage": ["image", "upload"],
            "VHS_LoadVideo": ["video", "force_rate", "custom_width", "custom_height", "frame_load_cap", "skip_first_frames", "select_every_nth", "format", "videopreview"],
            # WanVideo wrapper nodes (legacy list-based widget exports)
            "WanVideoModelLoader": ["model", "base_precision", "quantization", "load_device", "attention_mode", "profile"],
            "WanVideoVAELoader": ["model_name", "precision", "tile", "cpu_offload"],
            "WanVideoLoraSelect": ["lora", "strength", "inverse", "force_offload"],
            "WanVideoTextEncodeCached": ["model_name", "precision", "positive_prompt", "negative_prompt", "quantization", "use_disk_cache", "device", "cache_positive", "cache_negative"],
            "HuggingFaceDownloader": ["download_links", "auto_download", "max_concurrent_downloads", "max_download_speed_mbps", "enable_resume", "validate_files", "auto_organize", "enable_notifications", "download_path", "button_state"],
            "OnnxDetectionModelLoader": ["vitpose_model", "yolo_model", "onnx_device"],
            "WanVideoContextOptions": ["context_schedule", "context_frames", "context_stride", "context_overlap", "freenoise", "verbose", "context_mode"],
            "WanVideoEncode": ["enable_vae_tiling", "tile_x", "tile_y", "tile_stride_x", "tile_stride_y", "tile_stride_t", "batch_size"],
            "WanVideoImageToVideoEncode": ["width", "height", "num_frames", "start_latent_strength", "end_latent_strength", "noise_aug_strength", "force_offload", "crop", "keep_aspect", "pad_mode"],
            "WanVideoClipVisionEncode": ["strength_1", "strength_2", "crop", "combine_embeds", "force_offload", "mode", "weight"],
            "WanVideoAddSteadyDancerEmbeds": ["pose_strength_spatial", "pose_strength_temporal", "start_percent", "end_percent"],
            "WanVideoBlockSwap": ["blocks_to_swap", "offload_img_emb", "offload_txt_emb", "enabled", "img_emb_start", "txt_emb_start", "verbose"],
            "WanVideoSamplerSettings": ["steps", "cfg", "shift", "seed", "riflex_freq_index", "force_offload", "scheduler", "eta", "s_churn", "use_dynamic_cfg", "sampler", "start_step", "end_step", "debug"],
            "WanVideoDecode": ["enable_vae_tiling", "tile_x", "tile_y", "tile_stride_x", "tile_stride_y", "decoder_mode"],
            "GetImageRangeFromBatch": ["start_index", "num_frames"],
            "CLIPVisionLoader": ["clip_name"],
            "ImageResizeKJv2": ["width", "height", "upscale_method", "crop", "pad_color", "crop_position", "divisible_by", "keep_proportion"],
            "DrawViTPose": ["width", "height", "body_stick_width", "retarget_padding", "hand_stick_width", "draw_head"],
            "RIFE VFI": ["ckpt_name", "multiplier", "batch_size", "fast_mode", "ensemble", "scale_factor"],
            "ImageConcatMulti": ["inputcount", "direction", "match_image_size", "image_3"],
        }

        links = {}
        for l in data.get('links', []):
            links[l[0]] = l

        api = {}
        for node in data.get('nodes', []):
            node_id = str(node['id'])
            class_type = node.get('type', 'Unknown')
            mapped_keys = class_widget_key_map.get(class_type, [])
            node_inputs = node.get('inputs', []) or []
            raw_widget_values = node.get('widgets_values', []) or []
            widget_values_dict = raw_widget_values if isinstance(raw_widget_values, dict) else None
            widget_values_list = list(raw_widget_values) if isinstance(raw_widget_values, list) else []
            if widget_values_dict is None and not widget_values_list and raw_widget_values not in (None, ""):
                widget_values_list = [raw_widget_values]
            
            resolved = {}
            widget_idx = 0

            for inp in node_inputs:
                name = inp.get('name', '')
                link_id = inp.get('link')
                is_widget = 'widget' in inp

                if link_id is not None:
                    lnk = links.get(link_id)
                    if lnk:
                        resolved[name] = [str(lnk[1]), lnk[2]]
                elif is_widget:
                    widget_name = (inp.get('widget') or {}).get('name')
                    if widget_values_dict is not None:
                        # Newer ComfyUI exports can store widgets as a dict keyed by widget name.
                        # Prefer name lookup so values never shift between inputs.
                        key = widget_name or name
                        if key in widget_values_dict:
                            resolved[name] = widget_values_dict[key]
                    else:
                        if widget_idx < len(widget_values_list):
                            resolved[name] = widget_values_list[widget_idx]
                            widget_idx += 1
                else:
                    if widget_values_dict is not None:
                        # For non-widget inputs with dict-backed widgets, fill by matching name if present.
                        if name in widget_values_dict:
                            resolved[name] = widget_values_dict[name]
                    else:
                        # Only consume positional list widgets for unknown node types.
                        # Known legacy nodes are handled by explicit class_widget_key_map below.
                        if not mapped_keys and widget_idx < len(widget_values_list):
                            resolved[name] = widget_values_list[widget_idx]
                            widget_idx += 1

            if not node_inputs:
                if widget_values_dict is not None:
                    # Preserve named widget keys for nodes that expose only widgets.
                    for k, v in widget_values_dict.items():
                        resolved[str(k)] = v
                elif widget_values_list:
                    for i, v in enumerate(widget_values_list):
                        resolved[f'_widget_{i}'] = v
            elif widget_values_dict is not None:
                # Some Comfy exports keep required widget fields only in widgets_values dict
                # and do not mirror them into node.inputs. Preserve every missing key.
                for k, v in widget_values_dict.items():
                    key = str(k)
                    if key not in resolved:
                        resolved[key] = v

            # Legacy fallback: map list/scalar widgets by known class_type key order.
            # This avoids missing required inputs for nodes whose UI export omits widget metadata.
            if widget_values_dict is None and widget_values_list:
                if mapped_keys:
                    for i, key in enumerate(mapped_keys):
                        if i < len(widget_values_list) and key not in resolved:
                            resolved[key] = widget_values_list[i]

            api[node_id] = {
                'inputs': resolved,
                'class_type': class_type
            }
        return api

    def prepare_payload(self, workflow_id: str, user_params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Loads workflow, injects params into UI structure, then converts to API structure.
        """
        mappings = self.load_mapping()
        if workflow_id not in mappings:
            return None

        mapping = mappings[workflow_id]
        path = self.get_workflow_path(mapping.get("filename"))
        if not path or not os.path.exists(path):
            return None

        with open(path, "r", encoding="utf-8") as f:
            workflow = json.load(f)

        # 1. Inject parameters
        is_api = self.is_api_format(workflow)
        print(f"[WorkflowService] Preparing payload. is_api={is_api}")

        # Ensure LoRA placeholders are handled even when frontend sends no `loras`.
        # Without this, workflows with a baked-in default LoRA name can fail validation
        # on machines that don't have that specific file installed.
        effective_params = dict(user_params or {})
        for input_key, input_info in mapping.get("inputs", {}).items():
            if input_info.get("type") == "loras" and input_key not in effective_params:
                effective_params[input_key] = []

        for param_key, param_value in effective_params.items():
            if param_key in mapping["inputs"]:
                input_info = mapping["inputs"][param_key]
                node_ids_raw = input_info.get("node_ids")
                if isinstance(node_ids_raw, list) and node_ids_raw:
                    target_node_ids = [str(n) for n in node_ids_raw]
                else:
                    target_node_ids = [str(input_info["node_id"])]
                
                print(f"  > Injecting '{param_key}' -> Nodes {target_node_ids} (value: {param_value})")

                if input_info.get("type") == "nsfw_toggle":
                    # When NSFW is disabled, turn off all non-base LoRA slots in every
                    # Power Lora Loader node (lora_1 is always the base WAN model LoRA).
                    if not param_value:
                        for wf_node in workflow.values():
                            if not isinstance(wf_node, dict):
                                continue
                            if wf_node.get("class_type") != "Power Lora Loader (rgthree)":
                                continue
                            for slot_key, slot_val in wf_node.get("inputs", {}).items():
                                if slot_key.startswith("lora_") and slot_key != "lora_1" and isinstance(slot_val, dict):
                                    slot_val["on"] = False
                        print(f"  [OK] NSFW disabled — all non-base LoRA slots turned off")
                    else:
                        print(f"  [OK] NSFW enabled — workflow LoRA slots unchanged")
                    continue

                if input_info.get("type") == "loras" and isinstance(param_value, list):
                    # Dynamic LoRA chain: replace the placeholder node with a chain of
                    # LoraLoader / LoraLoaderModelOnly nodes, then rewire downstream refs.
                    node_id = target_node_ids[0]
                    if node_id not in workflow:
                        print(f"  [WARN] LoRA placeholder node {node_id} not found")
                        continue

                    placeholder   = workflow[node_id]
                    model_source  = placeholder["inputs"].get("model", ["16", 0])
                    clip_source   = placeholder["inputs"].get("clip")          # None for ModelOnly
                    model_only    = clip_source is None

                    del workflow[node_id]

                    active_loras = [l for l in param_value if l.get("name")]

                    if not active_loras:
                        # No LoRAs — bypass: rewire all downstream refs to upstream sources
                        for nid, node in workflow.items():
                            for key, val in list(node.get("inputs", {}).items()):
                                if isinstance(val, list) and len(val) == 2 and str(val[0]) == node_id:
                                    node["inputs"][key] = model_source if val[1] == 0 else (clip_source or ["18", 0])
                    else:
                        curr_model = model_source
                        curr_clip  = clip_source
                        last_id    = None

                        for i, lora_data in enumerate(active_loras[:5]):
                            lid = f"_lora_{i}"
                            if model_only:
                                workflow[lid] = {
                                    "inputs": {
                                        "lora_name":      lora_data["name"],
                                        "strength_model": float(lora_data.get("strength", 1.0)),
                                        "model":          curr_model,
                                    },
                                    "class_type": "LoraLoaderModelOnly",
                                }
                            else:
                                workflow[lid] = {
                                    "inputs": {
                                        "lora_name":      lora_data["name"],
                                        "strength_model": float(lora_data.get("strength", 1.0)),
                                        "strength_clip":  float(lora_data.get("strength", 1.0)),
                                        "model":          curr_model,
                                        "clip":           curr_clip,
                                    },
                                    "class_type": "LoraLoader",
                                }
                                curr_clip = [lid, 1]
                            curr_model = [lid, 0]
                            last_id    = lid

                        # Rewire every downstream ref that pointed at the old placeholder
                        for nid, node in workflow.items():
                            if nid.startswith("_lora_"):
                                continue
                            for key, val in list(node.get("inputs", {}).items()):
                                if isinstance(val, list) and len(val) == 2 and str(val[0]) == node_id:
                                    node["inputs"][key] = [last_id, val[1]]

                        print(f"  [OK] Injected {len(active_loras)} LoRA(s): {[l['name'] for l in active_loras]}")
                    continue

                if input_info.get("type") == "seed_sequence":
                    input_key = input_info.get("input_key") or param_key
                    try:
                        base_seed = int(param_value)
                    except Exception:
                        base_seed = 0
                    for idx, node_id in enumerate(target_node_ids):
                        if node_id in workflow:
                            if "inputs" not in workflow[node_id]:
                                workflow[node_id]["inputs"] = {}
                            workflow[node_id]["inputs"][input_key] = base_seed + idx
                        else:
                            print(f"    [WARN] Node {node_id} NOT FOUND in workflow!")
                    continue

                if is_api:
                    # API Format Injection
                    input_keys = input_info.get("input_keys")
                    if isinstance(input_keys, list) and input_keys:
                        target_input_keys = [str(k) for k in input_keys if str(k).strip()]
                    else:
                        target_input_keys = [input_info.get("input_key") or param_key]
                    for node_id in target_node_ids:
                        if node_id in workflow:
                            if "inputs" not in workflow[node_id]:
                                workflow[node_id]["inputs"] = {}
                            for input_key in target_input_keys:
                                workflow[node_id]["inputs"][input_key] = param_value
                        else:
                            print(f"    [WARN] Node {node_id} NOT FOUND in workflow!")
                else:
                    # UI Format Injection
                    w_idx = input_info.get("widget_index")
                    for node_id in target_node_ids:
                        found = False
                        for node in workflow.get("nodes", []):
                            if str(node["id"]) == node_id:
                                found = True
                                if "widgets_values" in node and w_idx is not None:
                                    if w_idx < len(node["widgets_values"]):
                                        node["widgets_values"][w_idx] = param_value
                                        print(f"    [OK] Updated widget[{w_idx}]")
                                break
                        if not found:
                            print(f"    [WARN] Node {node_id} NOT FOUND in UI nodes!")
        
        # 2. Convert to final API format for ComfyUI if needed
        if not is_api:
            workflow = self.convert_ui_to_api(workflow)
            # UI workflow exports vary a lot across Comfy/node versions.
            # Re-apply mapped params directly on the converted API payload so
            # critical runtime values (image/video/prompt/size/etc.) are always correct.
            for param_key, param_value in effective_params.items():
                input_info = mapping.get("inputs", {}).get(param_key)
                if not input_info:
                    continue
                node_ids_raw = input_info.get("node_ids")
                if isinstance(node_ids_raw, list) and node_ids_raw:
                    target_node_ids = [str(n) for n in node_ids_raw]
                else:
                    target_node_ids = [str(input_info["node_id"])]
                input_keys = input_info.get("input_keys")
                if isinstance(input_keys, list) and input_keys:
                    target_input_keys = [str(k) for k in input_keys if str(k).strip()]
                else:
                    target_input_keys = [input_info.get("input_key") or param_key]

                for node_id in target_node_ids:
                    if node_id not in workflow:
                        continue
                    node_inputs = workflow[node_id].setdefault("inputs", {})
                    for input_key in target_input_keys:
                        node_inputs[input_key] = param_value

        # 3. Auto-inject Hugging Face token into downloader nodes when configured
        hf_token = str(self.load_runtime_settings().get("hf_token") or "").strip()
        if hf_token:
            for wf_node in workflow.values():
                if not isinstance(wf_node, dict):
                    continue
                if wf_node.get("class_type") != "HuggingFaceDownloader":
                    continue
                inputs = wf_node.setdefault("inputs", {})
                inputs["hf_token"] = hf_token

        # 4. Safety defaults for node-schema drift (Comfy/custom-node updates)
        # Keep WAN 2.1 Steady Dancer runnable even when optional widget fields are
        # reshuffled by new exports.
        for wf_node in workflow.values():
            if not isinstance(wf_node, dict):
                continue
            ctype = wf_node.get("class_type")
            inputs = wf_node.setdefault("inputs", {})
            if ctype == "VHS_VideoCombine":
                # Explicitly enforce valid/typed defaults expected by current VHS schema.
                inputs["pingpong"] = bool(inputs.get("pingpong", False))
                try:
                    inputs["loop_count"] = int(inputs.get("loop_count", 0))
                except Exception:
                    inputs["loop_count"] = 0
                fmt = str(inputs.get("format") or "video/h264-mp4")
                if fmt == "crf" or not fmt.startswith(("video/", "image/")):
                    fmt = "video/h264-mp4"
                inputs["format"] = fmt
                inputs["filename_prefix"] = str(inputs.get("filename_prefix") or "WAN21_SteadyDancer")
                try:
                    inputs["frame_rate"] = float(inputs.get("frame_rate", 24))
                except Exception:
                    inputs["frame_rate"] = 24.0
                inputs["save_output"] = bool(inputs.get("save_output", True))
                # Avoid metadata parse crash: extra_pnginfo missing workflow dict.
                inputs["save_metadata"] = False
                inputs.pop("videopreview", None)
            elif ctype == "HuggingFaceDownloader":
                # Newer schema requires these fields and max_concurrent_downloads >= 1.
                inputs["auto_download"] = bool(inputs.get("auto_download", False))
                inputs["auto_organize"] = bool(inputs.get("auto_organize", True))
                try:
                    mcd = int(inputs.get("max_concurrent_downloads", 3))
                except Exception:
                    mcd = 3
                inputs["max_concurrent_downloads"] = max(1, mcd)
                try:
                    inputs["max_download_speed_mbps"] = int(inputs.get("max_download_speed_mbps", 0))
                except Exception:
                    inputs["max_download_speed_mbps"] = 0
                inputs["enable_resume"] = bool(inputs.get("enable_resume", True))
                inputs["validate_files"] = bool(inputs.get("validate_files", True))
                inputs["download_links"] = str(inputs.get("download_links") or "")
                inputs["enable_notifications"] = bool(inputs.get("enable_notifications", False))
            elif ctype == "OnnxDetectionModelLoader":
                inputs["onnx_device"] = str(inputs.get("onnx_device") or "CUDAExecutionProvider")
                inputs["yolo_model"] = str(inputs.get("yolo_model") or "yolov10m.onnx")
                inputs["vitpose_model"] = str(inputs.get("vitpose_model") or "vitpose-l-wholebody.onnx")
            elif ctype == "DrawViTPose":
                inputs["body_stick_width"] = int(inputs.get("body_stick_width", 16))
                inputs["hand_stick_width"] = int(inputs.get("hand_stick_width", -1))
                inputs["retarget_padding"] = int(inputs.get("retarget_padding", -1))
                inputs["draw_head"] = bool(inputs.get("draw_head", True))
            elif ctype == "ImageResizeKJv2":
                inputs["crop_position"] = str(inputs.get("crop_position") or "center")
                inputs["upscale_method"] = str(inputs.get("upscale_method") or "lanczos")
                # Newer KJNodes expects an enum string, not bool.
                kp = inputs.get("keep_proportion", "crop")
                if isinstance(kp, bool):
                    kp = "crop" if kp else "stretch"
                kp = str(kp)
                if kp not in {"stretch", "resize", "pad", "pad_edge", "pad_edge_pixel", "crop", "pillarbox_blur", "total_pixels"}:
                    kp = "crop"
                inputs["keep_proportion"] = kp
                inputs["divisible_by"] = int(inputs.get("divisible_by", 16))
                inputs["pad_color"] = str(inputs.get("pad_color") or "0, 0, 0")
            elif ctype == "WanVideoContextOptions":
                inputs["context_schedule"] = str(inputs.get("context_schedule") or "uniform_standard")
                inputs["context_frames"] = int(inputs.get("context_frames", 81))
                # Newer WanVideoContextOptions schemas require context_stride >= 4.
                # Clamp to avoid prompt validation failure from stale UI/workflow values.
                inputs["context_stride"] = max(4, int(inputs.get("context_stride", 4)))
                inputs["context_overlap"] = int(inputs.get("context_overlap", 4))
                inputs["freenoise"] = bool(inputs.get("freenoise", True))
                inputs["verbose"] = bool(inputs.get("verbose", False))
            elif ctype == "WanVideoEncode":
                inputs["enable_vae_tiling"] = bool(inputs.get("enable_vae_tiling", False))
                inputs["tile_x"] = int(inputs.get("tile_x", 272))
                inputs["tile_y"] = int(inputs.get("tile_y", 272))
                inputs["tile_stride_x"] = int(inputs.get("tile_stride_x", 144))
                inputs["tile_stride_y"] = int(inputs.get("tile_stride_y", 128))
            elif ctype == "WanVideoImageToVideoEncode":
                inputs["start_latent_strength"] = float(inputs.get("start_latent_strength", 0))
                inputs["end_latent_strength"] = float(inputs.get("end_latent_strength", 1))
                inputs["noise_aug_strength"] = float(inputs.get("noise_aug_strength", 1))
                inputs["force_offload"] = bool(inputs.get("force_offload", True))
            elif ctype == "WanVideoClipVisionEncode":
                inputs["crop"] = str(inputs.get("crop") or "center")
                inputs["strength_2"] = float(inputs.get("strength_2", 1))
                inputs["combine_embeds"] = str(inputs.get("combine_embeds") or "average")
                inputs["strength_1"] = float(inputs.get("strength_1", 1))
                inputs["force_offload"] = bool(inputs.get("force_offload", True))
            elif ctype == "WanVideoAddSteadyDancerEmbeds":
                inputs["pose_strength_spatial"] = float(inputs.get("pose_strength_spatial", 1))
                inputs["pose_strength_temporal"] = float(inputs.get("pose_strength_temporal", 1))
                inputs["start_percent"] = float(inputs.get("start_percent", 0))
                inputs["end_percent"] = float(inputs.get("end_percent", 1))
            elif ctype == "WanVideoBlockSwap":
                inputs["blocks_to_swap"] = int(inputs.get("blocks_to_swap", 4))
                inputs["offload_txt_emb"] = bool(inputs.get("offload_txt_emb", False))
                inputs["offload_img_emb"] = bool(inputs.get("offload_img_emb", False))
            elif ctype == "WanVideoTextEncodeCached":
                inputs["negative_prompt"] = str(inputs.get("negative_prompt") or "")
                inputs["quantization"] = str(inputs.get("quantization") or "disabled")
                inputs["precision"] = str(inputs.get("precision") or "bf16")
                inputs["device"] = str(inputs.get("device") or "offload_device")
                inputs["use_disk_cache"] = bool(inputs.get("use_disk_cache", False))
            elif ctype == "WanVideoSamplerSettings":
                inputs["shift"] = float(inputs.get("shift", 5))
                inputs["riflex_freq_index"] = int(inputs.get("riflex_freq_index", 0))
                inputs["scheduler"] = str(inputs.get("scheduler") or "dpm++_sde")
                inputs["force_offload"] = bool(inputs.get("force_offload", True))
                inputs["steps"] = int(inputs.get("steps", 4))
                inputs["seed"] = int(inputs.get("seed", 1))
                inputs["cfg"] = float(inputs.get("cfg", 1))
            elif ctype == "WanVideoDecode":
                inputs["tile_x"] = int(inputs.get("tile_x", 272))
                inputs["tile_y"] = int(inputs.get("tile_y", 272))
                inputs["tile_stride_x"] = int(inputs.get("tile_stride_x", 144))
                inputs["tile_stride_y"] = int(inputs.get("tile_stride_y", 128))
            elif ctype == "GetImageRangeFromBatch":
                inputs["num_frames"] = int(inputs.get("num_frames", 1))
                inputs["start_index"] = int(inputs.get("start_index", 0))
            elif ctype == "CLIPVisionLoader":
                inputs["clip_name"] = str(inputs.get("clip_name") or "clip_vision_h.safetensors")
            elif ctype == "RIFE VFI":
                inputs["ensemble"] = bool(inputs.get("ensemble", True))
                inputs["scale_factor"] = float(inputs.get("scale_factor", 1))
                inputs["dtype"] = str(inputs.get("dtype") or "float16")
                inputs["batch_size"] = int(inputs.get("batch_size", 2))
                inputs["fast_mode"] = bool(inputs.get("fast_mode", False))
                inputs["clear_cache_after_n_frames"] = int(inputs.get("clear_cache_after_n_frames", 10))
                inputs["torch_compile"] = bool(inputs.get("torch_compile", False))
                inputs["ckpt_name"] = str(inputs.get("ckpt_name") or "rife49.pth")
                inputs["multiplier"] = int(inputs.get("multiplier", 2))
            elif ctype == "ImageConcatMulti":
                inputs["direction"] = str(inputs.get("direction") or "left")
                inputs["match_image_size"] = bool(inputs.get("match_image_size", True))
                inputs["inputcount"] = int(inputs.get("inputcount", 2))

        # 5. SteadyDancer frame alignment guard:
        # Keep loaded frame count aligned to 4 only.
        if workflow_id == "wan21-steady-dancer":
            try:
                node75 = workflow.get("75", {}).get("inputs", {})
                raw_cap = int(node75.get("frame_load_cap", 0))
                if raw_cap > 0:
                    aligned_cap = raw_cap - (raw_cap % 4)
                    if aligned_cap <= 0:
                        aligned_cap = 4
                    node75["frame_load_cap"] = aligned_cap
            except Exception:
                pass
            
        return workflow

# Initialize service with dynamic path relative to this file
script_dir = os.path.dirname(os.path.abspath(__file__))
default_workflows = os.path.join(script_dir, "workflows")
workflow_service = WorkflowService(workflows_dir=default_workflows)
