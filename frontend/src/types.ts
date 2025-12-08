export interface Source {
  id: number;
  path: string;
  title: string;
  type: string;
}

export interface SourceChunk {
  id: number;
  kind: string;
  loc: string;
  text: string;
}

export interface Deck {
  id: number;
  name: string;
  description: string;
}

export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  card_type: string;
  tags: string[];
  source_id: number | null;
  source_chunk_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCard {
  card_id: number;
  deck_id: number;
  front: string;
  back: string;
  source_id: number | null;
  source_chunk_id: number | null;
  due: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
}

export interface GeneratedCard {
  front: string;
  back: string;
}
