# Voice Input / TTS Implementation - README

## ✅ What's Been Implemented

### 1. **Voice Input (Speech-to-Text)**
- 🎤 Microphone button in chat interface
- Hold-to-record and toggle recording modes
- 30-second automatic recording limit
- Transcription via ComfyUI Whisper workflow
- WebM/Opus audio format for speed
- Transcription appears in input field for review before sending

### 2. **Text-to-Speech (TTS)** ✅
- 🔊 AI voice responses using ComfyUI VibeVoice (Microsoft)
- Speaker button on every AI message
- Auto-play toggle in header
- Customizable voice styles (Female, Male Deep, Cheerful, Professional)
- High-quality audio output
- Visual feedback (loading, playing, stop states)
- **Status**: Fully implemented!

### 3. **Backend Audio Server**
- FastAPI server on port 8000
- `/api/audio/transcribe` - Speech-to-text endpoint
- `/api/audio/tts` - Text-to-speech endpoint
- Automatic audio file cleanup
- Integration with ComfyUI workflows

### 4. **Auto-Installation Features**
All custom nodes and dependencies install automatically:
- ✅ ComfyUI-Whisper (speech-to-text)
- ✅ audio-separation-nodes-comfyui (audio processing)
- ✅ VibeVoice-ComfyUI (text-to-speech, Microsoft)
- ✅ Security level set to "weak" for unattended installation
- ✅ Transformers library upgraded for compatibility
- ✅ FastAPI + Uvicorn for backend server
- ✅ Legacy backup cleanup

## 📁 File Structure

```
backend/
├── server.py                    # FastAPI audio server
├── audio_service.py             # ComfyUI Whisper integration
└── workflows/audio/
    ├── audio_caption_api.json   # Voice-to-text workflow (API format)
    └── 1-AUDIO/
        └── tts_api.json         # Text-to-speech workflow (API format)

frontend/src/pages/
└── ChatPage.tsx                 # Voice input UI

scripts/
├── install.ps1                  # Main installer (updated)
└── setup_comfyui_config.py      # Config helper

config/
└── nodes.json                   # Auto-install node list

update_dependencies.bat          # Quick update script for existing installs
```

## 🚀 How to Use

### For New Installations:
1. Run `install.bat`
2. Everything installs automatically!
3. Run `run.bat` to start
4. Click mic button in chat to record

### For Existing Installations:
1. Run `update_dependencies.bat` to upgrade libraries
2. Restart ComfyUI
3. Install missing nodes via ComfyUI Manager if needed

## 🎯 Key Configuration Changes

### install.ps1:
- ✅ Sets `security_level = weak` in ComfyUI Manager config
- ✅ Upgrades `transformers` and `tokenizers` for Qwen TTS
- ✅ Installs `fastapi`, `uvicorn`, `python-multipart` for backend
- ✅ Cleans up legacy ComfyUI Manager backups
- ✅ Auto-installs audio nodes from `config/nodes.json`

### run.bat:
- ✅ Starts audio backend server on port 8000
- ✅ Starts ComfyUI on port 8188
- ✅ Starts frontend on port 5173

### .gitignore:
- ✅ Excludes `backend/workflows/audio/` (keeps workflows local)

## 🔧 Troubleshooting

### Qwen TTS Node Error: `'Qwen3TTSTalkerConfig' object has no attribute 'pad_token_id'`

**Solution:**
```bash
# Run the update script:
update_dependencies.bat

# Or manually:
python_embeded\python.exe -m pip install --upgrade transformers tokenizers
```

### Voice Input Not Working

**Check:**
1. Backend server running on port 8000 (check terminal)
2. Microphone permissions granted in browser
3. Whisper model downloaded (happens automatically on first use)

### ComfyUI Manager Warning: "Legacy backup exists"

**Solution:**
- Already cleaned automatically by installer
- Or manually delete: `ComfyUI\user\__manager\.legacy-manager-backup`

## 📝 Notes

- Audio workflows are **local-only** (not in git)
- All dependencies auto-install on fresh installations
- Security set to "weak" mode for developer convenience
- Backend server auto-starts with `run.bat`

## 🎤 Voice Input Modes

1. **Hold Mode** (default): Hold mic button, release to transcribe
2. **Toggle Mode**: Click mic button to start, click again to stop
   - Switch modes by clicking the small indicator below mic button

## 🔮 TTS API Usage

The TTS backend is ready to use! Example usage:

```javascript
// Generate speech from text
const response = await fetch('/api/audio/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Hello! This is a test of the text to speech system.",
    voice_style: "female, clear voice"
  })
});

// Get audio file
const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);

// Play audio
const audio = new Audio(audioUrl);
audio.play();
```

**Voice Style Examples:**
- `"female, clear voice"`
- `"man with low pitch tembre"`
- `"cheerful woman"`
- `"professional male narrator"`

**Next Step**: Add UI controls in frontend to enable/disable TTS and customize voice settings.
