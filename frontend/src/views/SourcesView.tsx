import React, { useEffect, useState } from "react";
import {
  listSources,
  getSourceChunks,
  listDecks,
  generateCardsFromSource,
  bulkCreateCards
} from "../api";
import type {
  Source,
  SourceChunk,
  Deck,
  GeneratedCard
} from "../types";

interface SelectableGeneratedCard extends GeneratedCard {
  selected: boolean;
}

export const SourcesView: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [selectedChunkIds, setSelectedChunkIds] = useState<number[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);

  const [numCards, setNumCards] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  const [generated, setGenerated] = useState<SelectableGeneratedCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [srcs, ds] = await Promise.all([
          listSources(),
          listDecks()
        ]);
        setSources(srcs);
        setDecks(ds);
        if (ds.length > 0) {
          setSelectedDeckId(ds[0].id);
        }
      } catch (e) {
        setError(`Failed to load sources or decks: ${(e as Error).message}`);
      }
    }
    init().catch(() => undefined);
  }, []);

  async function loadSourceChunks(sourceId: number) {
    setSelectedSourceId(sourceId);
    setChunks([]);
    setSelectedChunkIds([]);
    setGenerated([]);
    setMessage(null);
    setError(null);
    try {
      const data = await getSourceChunks(sourceId);
      setChunks(data);
      // For convenience, preselect the first few chunks but do not force it
      const initial = data.slice(0, 3).map((c) => c.id);
      setSelectedChunkIds(initial);
    } catch (e) {
      setError(`Failed to load chunks: ${(e as Error).message}`);
    }
  }

  function toggleChunk(id: number) {
    setSelectedChunkIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllChunks() {
    setSelectedChunkIds(chunks.map((c) => c.id));
  }

  function clearChunkSelection() {
    setSelectedChunkIds([]);
  }

  async function handleGenerate() {
    if (!selectedSourceId) {
      setError("Select a source first.");
      return;
    }
    if (!selectedDeckId) {
      setError("Select a deck first.");
      return;
    }
    setError(null);
    setMessage(null);
    setGenerated([]);
    setIsGenerating(true);
    try {
      const cards = await generateCardsFromSource({
        source_id: selectedSourceId,
        chunk_ids: selectedChunkIds.length ? selectedChunkIds : undefined,
        num_cards: numCards,
        temperature
      });
      const withSelection: SelectableGeneratedCard[] = cards.map((c) => ({
        ...c,
        selected: true
      }));
      setGenerated(withSelection);
      setMessage(`Generated ${withSelection.length} cards.`);
    } catch (e) {
      setError(`Failed to generate cards: ${(e as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleGeneratedSelection(index: number) {
    setGenerated((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  async function handleSaveGenerated() {
    if (!selectedDeckId) {
      setError("Select a deck first.");
      return;
    }
    const selected = generated.filter((g) => g.selected);
    if (!selected.length) {
      setError("No generated cards selected to save.");
      return;
    }
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const firstChunkId =
        selectedChunkIds.length > 0 ? selectedChunkIds[0] : null;
      await bulkCreateCards(
        selectedDeckId,
        selected.map((g) => ({
          front: g.front,
          back: g.back,
          card_type: "basic",
          tags: ["auto"],
          source_id: selectedSourceId,
          source_chunk_id: firstChunkId
        }))
      );
      setMessage(`Saved ${selected.length} cards to deck ${selectedDeckId}.`);
    } catch (e) {
      setError(`Failed to save cards: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredSources = sources.filter((s) => {
    const f = sourceFilter.toLowerCase();
    if (!f) return true;
    return (
      s.title.toLowerCase().includes(f) ||
      s.path.toLowerCase().includes(f)
    );
  });

  return (
    <div className="card">
      <h2>Sources and flashcard generation</h2>
      <div className="split-layout">
        <div>
          <h3>Sources</h3>
          <input
            className="input"
            placeholder="Filter by title or path"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          />
          <div className="list" style={{ marginTop: "0.5rem" }}>
            {filteredSources.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "0.35rem 0.5rem",
                  borderRadius: "0.375rem",
                  marginBottom: "0.25rem",
                  cursor: "pointer",
                  backgroundColor:
                    s.id === selectedSourceId ? "#1f2937" : "transparent"
                }}
                onClick={() => loadSourceChunks(s.id)}
              >
                <div style={{ fontSize: "0.9rem" }}>{s.title}</div>
                <div
                  className="monospace-small"
                  style={{ color: "#94a3b8" }}
                >
                  {s.path}
                </div>
              </div>
            ))}
            {!filteredSources.length && (
              <p style={{ fontSize: "0.85rem" }}>No sources match filter.</p>
            )}
          </div>
        </div>

        <div>
          <h3>Selected source</h3>
          {selectedSourceId == null && (
            <p>Select a source on the left to view chunks.</p>
          )}

          {selectedSourceId != null && (
            <>
              <div className="button-row" style={{ marginBottom: "0.5rem" }}>
                <button
                  className="button small"
                  onClick={selectAllChunks}
                  disabled={!chunks.length}
                >
                  Select all chunks
                </button>
                <button
                  className="button small"
                  onClick={clearChunkSelection}
                  disabled={!chunks.length}
                >
                  Clear selection
                </button>
              </div>

              <div className="list" style={{ border: "1px solid #1f2937", borderRadius: "0.5rem", padding: "0.5rem" }}>
                {chunks.map((c) => {
                  const selected = selectedChunkIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      style={{
                        borderRadius: "0.375rem",
                        padding: "0.4rem 0.5rem",
                        marginBottom: "0.35rem",
                        backgroundColor: selected ? "#1f2937" : "#0f172a",
                        border: "1px solid #1f2937",
                        cursor: "pointer"
                      }}
                      onClick={() => toggleChunk(c.id)}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        {c.loc}{" "}
                        <span className="badge">{c.kind}</span>
                      </div>
                      <div
                        className="monospace-small"
                        style={{ marginTop: "0.25rem" }}
                      >
                        {c.text.length > 260
                          ? c.text.slice(0, 260) + "..."
                          : c.text}
                      </div>
                    </div>
                  );
                })}
                {!chunks.length && (
                  <p style={{ fontSize: "0.85rem" }}>
                    This source has no chunks yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid #1f2937"
                }}
              >
                <h4 style={{ marginTop: 0 }}>Generate flashcards</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "0.5rem",
                    marginBottom: "0.5rem"
                  }}
                >
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>
                      Deck
                      <select
                        className="select"
                        value={selectedDeckId ?? ""}
                        onChange={(e) =>
                          setSelectedDeckId(
                            e.target.value
                              ? Number(e.target.value)
                              : null
                          )
                        }
                      >
                        <option value="">Select deck</option>
                        {decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>
                      Number of cards
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={50}
                        value={numCards}
                        onChange={(e) =>
                          setNumCards(
                            Math.max(1, Math.min(50, Number(e.target.value)))
                          )
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>
                      Temperature
                      <input
                        className="input"
                        type="number"
                        step={0.1}
                        min={0}
                        max={1.5}
                        value={temperature}
                        onChange={(e) =>
                          setTemperature(Number(e.target.value))
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="button-row" style={{ marginBottom: "0.5rem" }}>
                  <button
                    className="button primary"
                    onClick={handleGenerate}
                    disabled={isGenerating || !chunks.length}
                  >
                    {isGenerating ? "Generating..." : "Generate cards"}
                  </button>
                  <button
                    className="button"
                    onClick={handleSaveGenerated}
                    disabled={isSaving || !generated.length}
                  >
                    {isSaving ? "Saving..." : "Save selected to deck"}
                  </button>
                </div>

                {message && (
                  <p style={{ color: "#34d399", fontSize: "0.85rem" }}>
                    {message}
                  </p>
                )}
                {error && (
                  <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>
                    {error}
                  </p>
                )}

                {generated.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <h4 style={{ marginTop: 0 }}>Generated cards</h4>
                    <div className="list">
                      {generated.map((g, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #1f2937",
                            borderRadius: "0.5rem",
                            padding: "0.5rem 0.6rem",
                            marginBottom: "0.35rem",
                            backgroundColor: g.selected
                              ? "#1f2937"
                              : "#0f172a"
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.25rem"
                            }}
                          >
                            <strong style={{ fontSize: "0.85rem" }}>
                              Card {idx + 1}
                            </strong>
                            <button
                              className="button small"
                              onClick={() => toggleGeneratedSelection(idx)}
                            >
                              {g.selected ? "Deselect" : "Select"}
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              marginBottom: "0.25rem"
                            }}
                          >
                            <strong>Front:</strong>{" "}
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {g.front}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.8rem" }}>
                            <strong>Back:</strong>{" "}
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {g.back}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
