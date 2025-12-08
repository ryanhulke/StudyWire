from fastapi import APIRouter

from ...config import NOTES_ROOT

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "notes_root": str(NOTES_ROOT)}
