# FEDDA Hub v7

FEDDA Hub v7 is a local AI studio built around ComfyUI, a FastAPI backend, and a React frontend.

## Structure

- `frontend/` - React + Vite + TypeScript UI
- `backend/` - FastAPI services, workflow routing, model helpers
- `scripts/` - install, update, and maintenance scripts
- `runpod/` - container and deployment files for hosted setups
- `config/` - app configuration, catalogs, and workflow metadata

## Local setup

Use the top-level setup flow if you want the full guided install:

- `FEDDA_Setup.bat` in the parent workspace clones or updates this repo
- the repo `install.bat` handles Full or Lite installation

To run an existing install locally, use `run.bat`.

## Notes

- Large models, ComfyUI, Python runtimes, and other generated runtime assets are installed outside normal git tracking.
- User-specific runtime state and logs should stay out of the repository.
