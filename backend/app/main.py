import asyncio
import logging
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .api.deps import ensure_default_deck
from .api.routes import (
    cards,
    decks,
    generate,
    health,
    review,
    search,
    sources,
    practice,
)
from .config import NOTES_ROOT
from .content_manager import scan_notes_root
from .db import engine, init_db


app = FastAPI(title="Study Tool Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logger = logging.getLogger(__name__)

SCAN_INTERVAL_SECONDS = 300
_notes_scan_task: Optional[asyncio.Task[None]] = None


async def scan_notes_once() -> None:
    with Session(engine) as session:
        processed = scan_notes_root(session, NOTES_ROOT)
    logger.info("Notes scan complete: %s sources processed", processed)


async def schedule_note_scans() -> None:
    while True:
        await asyncio.sleep(SCAN_INTERVAL_SECONDS)
        try:
            await scan_notes_once()
        except Exception:
            logger.exception("Failed to scan notes root")


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    with Session(engine) as session:
        ensure_default_deck(session)
    await scan_notes_once()

    global _notes_scan_task
    _notes_scan_task = asyncio.create_task(schedule_note_scans())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _notes_scan_task
    if _notes_scan_task is not None:
        _notes_scan_task.cancel()
        try:
            await _notes_scan_task
        except asyncio.CancelledError:
            pass


# Include routers
app.include_router(health.router)
app.include_router(sources.router)
app.include_router(search.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(review.router)
app.include_router(generate.router)
app.include_router(practice.router)
