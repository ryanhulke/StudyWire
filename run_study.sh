#!/usr/bin/env bash
set -e

# needed for WebKit on my archlinux system
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# Paths
STUDY_ROOT="$HOME/apps/Study"
FRONTEND_BIN="$STUDY_ROOT/frontend/src-tauri/target/release/Study"
BACKEND_DIR="$STUDY_ROOT/backend"
PY_ENV="$HOME/apps/miniconda3/envs/study"
LLAMA_BIN="$HOME/apps/llama.cpp/build/bin/llama-server"

# start llama.cpp server
"$LLAMA_BIN" \
  -m "$HOME/apps/llama.cpp/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf" \
  -ngl 20 \
  -c 4096 \
  --host 127.0.0.1 \
  --port 8080 \
  --api-key sk-local-test \
  >"$STUDY_ROOT/llama.log" 2>&1 &
LLAMA_PID=$!

# start FastAPI backend
cd "$BACKEND_DIR"
"$PY_ENV/bin/uvicorn" app.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  >"$STUDY_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

cleanup() {
  echo "Stopping backend (PID $BACKEND_PID) and LLM (PID $LLAMA_PID)..."
  kill "$BACKEND_PID" "$LLAMA_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$LLAMA_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# run tauri app in the foreground
"$FRONTEND_BIN"
