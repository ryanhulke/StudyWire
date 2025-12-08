#!/usr/bin/env bash
set -e

# ---- Activate conda env ----
# Adjust if your miniconda path is different
source "$HOME/apps/miniconda3/etc/profile.d/conda.sh"
conda activate study

# ---- Logs dir ----
LOG_DIR="$HOME/.local/share/study"
mkdir -p "$LOG_DIR"

# ---- Start llama.cpp server if not running ----
if ! pgrep -u "$USER" -x llama-server >/dev/null 2>&1; then
  nohup "$HOME/apps/llama.cpp/build/bin/llama-server" \
    -m "$HOME/apps/llama.cpp/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf" \
    -ngl 20 \
    -c 4096 \
    --host 127.0.0.1 \
    --port 8080 \
    --api-key sk-local-test \
    > "$LOG_DIR/llama-server.log" 2>&1 &
fi

# ---- Start backend (FastAPI/uvicorn) if not running ----
cd "$HOME/apps/Study/backend"
if ! pgrep -u "$USER" -f "uvicorn app.main:app" >/dev/null 2>&1; then
  nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 \
    > "$LOG_DIR/backend.log" 2>&1 &
fi
