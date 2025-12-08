from pathlib import Path
import os

# Root of your Obsidian vault / notes
NOTES_ROOT = Path(
    os.environ.get("NOTES_ROOT", Path.home() / "Notes")
).expanduser()

# SQLite DB URL
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./study_tool.db")

# Local LLM configuration
LLM_API_BASE = os.environ.get("LLM_API_BASE", "http://127.0.0.1:8080/v1")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "sk-local-test")
LLM_MODEL_NAME = os.environ.get("LLM_MODEL_NAME", "qwen")
