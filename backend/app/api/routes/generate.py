from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...db import get_session
from ...llm_client import call_llm_for_cards
from ...models import Source, SourceChunk
from ...schemas import (
    GenerateCardsRequest,
    GenerateCardsResponse,
    GeneratedCard,
)

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate_cards", response_model=GenerateCardsResponse)
async def generate_cards(
    req: GenerateCardsRequest,
    session: Session = Depends(get_session),
) -> GenerateCardsResponse:
    combined_text = "\n"
    source = session.get(Source, req.source_id)
    if source is not None:
        if req.chunk_ids:
            stmt = (
                select(SourceChunk)
                .where(
                    SourceChunk.source_id == source.id,
                    SourceChunk.id.in_(req.chunk_ids),
                )
                .order_by(SourceChunk.id)
            )
        else:
            stmt = (
                select(SourceChunk)
                .where(SourceChunk.source_id == source.id)
                .order_by(SourceChunk.id)
            )

        chunks: List[SourceChunk] = session.exec(stmt).all()
        if not chunks:
            raise HTTPException(
                status_code=400, detail="No chunks found for requested source"
            )

        combined_text += "\n\n".join(ch.text for ch in chunks)
        
    try:
        card_dicts = await call_llm_for_cards(
            combined_text, req.instructions, req.num_cards, req.temperature
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    generated_cards = [
        GeneratedCard(front=c["front"], back=c["back"]) for c in card_dicts
    ]
    return GenerateCardsResponse(cards=generated_cards)
