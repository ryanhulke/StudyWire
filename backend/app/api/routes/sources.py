from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...config import NOTES_ROOT
from ...content_manager import scan_notes_root
from ...db import get_session
from ...models import Source, SourceChunk
from ...schemas import SourceChunkRead, SourceRead

router = APIRouter(prefix="/api", tags=["sources"])


@router.post("/reindex")
def reindex_notes(
    session: Session = Depends(get_session),
) -> dict:
    processed = scan_notes_root(session, NOTES_ROOT)
    return {"processed_sources": processed}


@router.get("/sources", response_model=List[SourceRead])
def list_sources(
    session: Session = Depends(get_session),
) -> List[SourceRead]:
    statement = select(Source).order_by(Source.path)
    sources = session.exec(statement).all()
    return [
        SourceRead(
            id=src.id,
            path=src.path,
            title=src.title,
            type=src.type,
        )
        for src in sources
    ]


@router.get("/sources/{source_id}", response_model=SourceRead)
def get_source(
    source_id: int,
    session: Session = Depends(get_session),
) -> SourceRead:
    src = session.get(Source, source_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return SourceRead(
        id=src.id,
        path=src.path,
        title=src.title,
        type=src.type,
    )


@router.get(
    "/sources/{source_id}/chunks", response_model=List[SourceChunkRead]
)
def list_source_chunks(
    source_id: int,
    session: Session = Depends(get_session),
) -> List[SourceChunkRead]:
    src = session.get(Source, source_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Source not found")

    statement = (
        select(SourceChunk)
        .where(SourceChunk.source_id == source_id)
        .order_by(SourceChunk.id)
    )
    chunks = session.exec(statement).all()
    return [
        SourceChunkRead(
            id=ch.id,
            kind=ch.kind,
            loc=ch.loc,
            text=ch.text,
        )
        for ch in chunks
    ]
