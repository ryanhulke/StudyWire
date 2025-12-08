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
from .db import engine, init_db


app = FastAPI(title="Study Tool Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with Session(engine) as session:
        ensure_default_deck(session)


# Include routers
app.include_router(health.router)
app.include_router(sources.router)
app.include_router(search.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(review.router)
app.include_router(generate.router)
app.include_router(practice.router)
