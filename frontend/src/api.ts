import type {
  Source,
  SourceChunk,
  Deck,
  Card,
  ReviewCard,
  GeneratedCard
} from "./types";

const API_BASE = "http://127.0.0.1:8000/api";

async function handleResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

export async function getReviewSummary(): Promise<{ due_count: number }> {
  const resp = await fetch(`${API_BASE}/review/summary`);
  return handleResponse<{ due_count: number }>(resp);
}

export async function getNextReviewCard(): Promise<ReviewCard | null> {
  const resp = await fetch(`${API_BASE}/review/next`);
  if (resp.status === 404) {
    return null;
  }
  return handleResponse<ReviewCard>(resp);
}

export async function answerReview(
  cardId: number,
  rating: number,
  durationMs = 0
): Promise<{
  status: string;
  card_id: number;
  next_due: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
}> {
  const resp = await fetch(`${API_BASE}/review/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_id: cardId,
      rating,
      duration_ms: durationMs
    })
  });
  return handleResponse(resp);
}

export async function listSources(): Promise<Source[]> {
  const resp = await fetch(`${API_BASE}/sources`);
  return handleResponse<Source[]>(resp);
}

export async function getSourceChunks(
  sourceId: number
): Promise<SourceChunk[]> {
  const resp = await fetch(`${API_BASE}/sources/${sourceId}/chunks`);
  return handleResponse<SourceChunk[]>(resp);
}

export async function listDecks(): Promise<Deck[]> {
  const resp = await fetch(`${API_BASE}/decks`);
  return handleResponse<Deck[]>(resp);
}

export async function createDeck(
  name: string,
  description = ""
): Promise<Deck> {
  const resp = await fetch(`${API_BASE}/decks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description })
  });
  return handleResponse<Deck>(resp);
}

export async function listCards(deckId?: number): Promise<Card[]> {
  const url =
    deckId !== undefined
      ? `${API_BASE}/cards?deck_id=${encodeURIComponent(deckId)}`
      : `${API_BASE}/cards`;
  const resp = await fetch(url);
  return handleResponse<Card[]>(resp);
}

export async function deleteCard(cardId: number): Promise<void> {
  const resp = await fetch(`${API_BASE}/cards/${cardId}`, {
    method: "DELETE"
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to delete card: ${text}`);
  }
}

export async function bulkCreateCards(
  deckId: number,
  cards: {
    front: string;
    back: string;
    card_type?: string;
    tags?: string[];
    source_id?: number | null;
    source_chunk_id?: number | null;
  }[]
): Promise<Card[]> {
  const resp = await fetch(`${API_BASE}/cards/bulk_create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deck_id: deckId,
      cards
    })
  });
  return handleResponse<Card[]>(resp);
}

export async function generateCardsFromSource(params: {
  source_id: number;
  chunk_ids?: number[];
  num_cards: number;
  temperature: number;
}): Promise<GeneratedCard[]> {
  const resp = await fetch(`${API_BASE}/generate_cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await handleResponse<{ cards: GeneratedCard[] }>(resp);
  return data.cards;
}


export type PracticePool = 'due_recent' | 'all' | 'new_only';

export interface PracticeCard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  source_id?: number | null;
  source_chunk_id?: number | null;
}

export async function fetchPracticeCards(params: {
  deckId: number;
  pool: PracticePool;
  limit?: number;
}): Promise<PracticeCard[]> {
  const qs = new URLSearchParams({
    deck_id: String(params.deckId),
    pool: params.pool
  });
  if (params.limit) {
    qs.set("limit", String(params.limit));
  }

  const res = await fetch(`${API_BASE}/practice/cards?` + qs.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch practice cards: ${res.status}`);
  }
  return res.json();
}

