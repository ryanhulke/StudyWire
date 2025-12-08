from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ...db import get_session
from ...models import SourceChunk
from ...schemas import SourceChunkRead

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search/chunks", response_model=List[SourceChunkRead])
def search_chunks(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> List[SourceChunkRead]:
    """
    Simple text search over chunk text; case-sensitive contains search.
    """
    try:
        statement = (
            select(SourceChunk)
            .where(SourceChunk.text.contains(q))
            .limit(limit)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
