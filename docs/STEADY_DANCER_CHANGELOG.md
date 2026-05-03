# Steady Dancer Change Log (v11)

## 2026-04-30

### UX and flow changes
- Reworked WAN 2.1 Steady Dancer page into a cleaner linear flow:
  - pick source video/start point
  - capture start frame
  - generate character with Z-Image
  - run motion transfer
- Removed old cluttered sections and reduced duplicated controls.
- Added clearer button flow:
  - `Capture start frame`
  - `Generate with Z-Image`
  - `Run`
- Added `Latest Z-Image output` preview and clear action.
- Kept `Reference Image` as the image used by final Steady Dancer run.

### Frame and preview behavior
- Start/end are controlled in seconds and mapped internally to frames.
- Start-point preview seeking is synced to video current time.
- Start-frame capture updates the reference image path in Comfy input.

### Z-Image integration
- Z-Image img2img is started from selected start frame.
- Added robust output promotion path handling:
  - fallback recursive output lookup in backend if expected subfolder does not match.
- Added cache-busting on reference image preview URL refresh after promotion.

### Missing-node and validation fixes
- Installed required custom node repos for workflow compatibility:
  - `ComfyUI/custom_nodes/ComfyLiterals` (provides `Float` node)
  - `ComfyUI/custom_nodes/ComfyUI-WanAnimatePreprocess` (provides `OnnxDetectionModelLoader` and pose nodes)
- Added automated model check/download for Steady Dancer ONNX detection models:
  - `ComfyUI/models/detection/vitpose-l-wholebody.onnx`
  - `ComfyUI/models/detection/yolov10m.onnx`

### Installer/update automation
- Added script: `scripts/ensure_steady_dancer_detection_models.ps1`
- Wired into:
  - `scripts/install_lite.ps1`
  - `scripts/update_logic.ps1`
- This ensures fresh install and updates automatically fetch required detection models and avoid `Prompt outputs failed validation` due to missing ONNX files.

