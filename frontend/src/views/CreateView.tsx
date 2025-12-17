// src/views/SourcesView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listSources,
  getSourceChunks,
  listDecks,
  generateCardsFromSource,
  bulkCreateCards
} from "../api";
import type { Source, SourceChunk, Deck, GeneratedCard } from "../types";
import { RenderMath } from "../components/RenderMath";
import { Collapse } from "../components/Collapse";

interface SelectableGeneratedCard extends GeneratedCard {
  selected: boolean;
}

export const SourcesView: React.FC = () => {
  // Left column state
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [selectedChunkIds, setSelectedChunkIds] = useState<number[]>([]);

  // Deck / generation controls
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [numCards, setNumCards] = useState(10);
  const [temperature, setTemperature] = useState(0.0);

  // Instructions
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);

    // Source panel animation control
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingSourceId, setPendingSourceId] = useState<number | null>(null);

  // Generated cards + async flags
  const [generated, setGenerated] = useState<SelectableGeneratedCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Messages
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [srcs, ds] = await Promise.all([listSources(), listDecks()]);
        setSources(srcs);
        setDecks(ds);
        if (ds.length > 0) {
          setSelectedDeckId(ds[0].id);
        }
      } catch (e) {
        setError(`Failed to load sources or decks: ${(e as Error).message}`);
      }
    }
    void init();
  }, []);

  const selectedSource: Source | null = useMemo(
    () => sources.find((s) => s.id === selectedSourceId) ?? null,
    [sources, selectedSourceId]
  );

  const filteredSources = useMemo(() => {
    const f = sourceFilter.toLowerCase();
    if (!f) return sources;
    return sources.filter(
      (s) =>
        s.title.toLowerCase().includes(f) ||
        s.path.toLowerCase().includes(f)
    );
  }, [sources, sourceFilter]);

  const allChunksSelected = chunks.length > 0 && selectedChunkIds.length === chunks.length;
  const noChunksSelected = selectedChunkIds.length === 0;
  const hasInstructions = instructions.trim().length > 0;
  const hasSourceContext = selectedSourceId !== null && selectedChunkIds.length > 0;
  const canGenerate = (hasInstructions || hasSourceContext) && !!selectedDeckId;

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  async function loadSourceChunks(sourceId: number) {
    // Selecting a different source
    setSelectedSourceId(sourceId);
    setChunks([]);
    setSelectedChunkIds([]);
    setGenerated([]);
    resetMessages();

    // UX rule: if instructions are empty, collapse to the button
    if (!instructions.trim()) {
      setShowInstructions(false);
    }

    try {
      const data = await getSourceChunks(sourceId);
      setChunks(data);
    } catch (e) {
      setError(`Failed to load chunks: ${(e as Error).message}`);
    }
  }

  function handleSourceClick(id: number) {
    if (selectedSourceId === null) {
      void loadSourceChunks(id);
      setPendingSourceId(null);
      setPanelOpen(true);
      return;
    }

    if (id === selectedSourceId) {
      setPendingSourceId(null);
      setPanelOpen(false);
      setShowInstructions(true);
      return;
    }

    setPendingSourceId(id);
    setPanelOpen(false);
  }

  function handleSourcePanelRest(open: boolean) {
    // We only care about the "closed" event
    if (open) return;

    if (pendingSourceId !== null) {
      // We have a new source to open after closing the old one
      const nextId = pendingSourceId;
      setPendingSourceId(null);
      void loadSourceChunks(nextId);
      setPanelOpen(true);
      return;
    }

    // No pending source: this was a real deselect
    if (selectedSourceId !== null) {
      setSelectedSourceId(null);
      setChunks([]);
      setSelectedChunkIds([]);
      setGenerated([]);
      resetMessages();
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
    resetMessages();

    if (!hasInstructions && !hasSourceContext) {
      setError(
        "Add custom instructions or select a source to enable generation."
      );
      return;
    }
    if (!selectedDeckId) {
      setError("Select a deck first.");
      return;
    }

    setIsGenerating(true);
    setGenerated([]);

    try {
      const payload: any = {
        num_cards: numCards,
        temperature,
        instructions: instructions.trim()
      };

      if (hasSourceContext && selectedSourceId) {
        payload.source_id = selectedSourceId;
        if (selectedChunkIds.length) {
          payload.chunk_ids = selectedChunkIds;
        }
      }

      const cards = await generateCardsFromSource(payload);
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
    resetMessages();

    if (!selectedDeckId) {
      setError("Select a deck first.");
      return;
    }
    const selected = generated.filter((g) => g.selected);
    if (!selected.length) {
      setError("No generated cards selected to save.");
      return;
    }

    setIsSaving(true);
    try {
      const firstChunkId =
        hasSourceContext && selectedChunkIds.length > 0
          ? selectedChunkIds[0]
          : null;

      await bulkCreateCards(
        selectedDeckId,
        selected.map((g) => ({
          front: g.front,
          back: g.back,
          card_type: "basic",
          tags: ["generated"],
          source_id: hasSourceContext ? selectedSourceId : null,
          source_chunk_id: firstChunkId
        }))
      );
      setMessage(`Saved ${selected.length} cards to deck.`);
    } catch (e) {
      setError(`Failed to save cards: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Create flashcards</h2>
      <p style={{ marginTop: 0, fontSize: "0.9rem", color: "#cbd5e1" }}>
        Use your notes and textbooks, your own instructions, or both.
      </p>

      <div className="split-layout" style={{ gap: "1.5rem", marginTop: "0.75rem" }}>
        {/* LEFT COLUMN: sources */}
        <div>
          <h3 style={{ marginTop: 0 }}>Sources</h3>
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
                className={
                  "source-item" +
                  (s.id === selectedSourceId ? " source-item-selected" : "")
                }
                onClick={() => handleSourceClick(s.id)}
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
              <p style={{ fontSize: "0.85rem" }}>
                No sources match this filter.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* selected source panel – only when something is selected */}
          <Collapse
            isOpen={panelOpen}
            durationMs={250}
            onRest={handleSourcePanelRest}
          >
          {selectedSourceId != null && selectedSource && (
            <div
              style={{
                borderRadius: "0.5rem",
                border: "1px solid #262626",
                backgroundColor: "#282828ff",
                padding: "0.75rem",
                marginBottom: "0.75rem"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "0.75rem"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem" }}>
                    Selected source
                  </h3>
                  <p
                    className="monospace-small"
                    style={{
                      marginTop: "0.25rem",
                      marginBottom: "0.5rem",
                      color: "#9ca3af"
                    }}
                  >
                    {selectedSource.path}
                  </p>
                </div>
              </div>

              <div
                className="button-row"
                style={{ marginBottom: "0.5rem", marginTop: "0.25rem" }}
              >
                <button
                  className="button small"
                  onClick={selectAllChunks}
                  disabled={!chunks.length || allChunksSelected}
                >
                  Select all sections
                </button>
                <button
                  className="button small"
                  onClick={clearChunkSelection}
                  disabled={!chunks.length || noChunksSelected}
                >
                  Clear selection
                </button>
              </div>

              <div
                className="list"
                style={{
                  border: "1px solid #25252555",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                  maxHeight: "40vh"
                }}
              >
                {chunks.map((c) => {
                  const selected = selectedChunkIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={
                        "chunk-item" +
                        (selected
                          ? " chunk-item-selected"
                          : " chunk-item-unselected")
                      }
                      onClick={() => toggleChunk(c.id)}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          marginBottom: "0.15rem"
                        }}
                      >
                        {c.loc}{" "}
                        <span className="badge" style={{ marginLeft: 4 }}>
                          {c.kind}
                        </span>
                      </div>
                      <div className="monospace-small">
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
            </div>
          )}
          </Collapse>
          
          {/* Instructions + generation card */}
          <div
            style={{
              borderRadius: "0.5rem",
              border: "1px solid #262626",
              backgroundColor: "#363636ff",
              padding: "0.75rem"
            }}
          >
            {/* Custom instructions area */}
            <Collapse isOpen={showInstructions} durationMs={200}>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}
                >
                  <div>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "0.15rem",
                        fontSize: "0.95rem"
                      }}
                    >
                      Instructions
                    </h3>
                    <p
                      style={{
                        marginTop: 0,
                        fontSize: "0.85rem",
                        color: "#9ca3af"
                      }}
                    >
                      Optional. Describe the flashcards you want.
                    </p>
                  </div>
                  {selectedSourceId !== null && (
                    <button
                      className="button small"
                      onClick={() => setShowInstructions(false)}
                    >
                      Hide
                    </button>
                  )}
                </div>

                <textarea
                  className="textarea"
                  rows={4}
                  placeholder={
                    selectedSourceId == null
                      ? `"Make 15 English→Spanish travel phrases as flashcards."`
                      : `"From the selected biochem slides, generate conceptual cards only."`
                  }
                  value={instructions}
                  onChange={(e) => {
                    setInstructions(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>
            </Collapse>

            {!showInstructions && (
              <button
                className="button small"
                onClick={() => setShowInstructions(true)}
              >
                + Add custom instructions (optional)
              </button>
            )}

            {/* Generation controls */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.75rem",
                marginTop: "0.75rem",
                marginBottom: "0.5rem"
              }}
            >
              <div>
                <label style={{ fontSize: "0.8rem", display: "block" }}>
                  Deck
                </label>
                <select
                  className="select"
                  value={selectedDeckId ?? ""}
                  onChange={(e) =>
                    setSelectedDeckId(
                      e.target.value ? Number(e.target.value) : null
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
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", display: "block" }}>
                  Number of cards
                </label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={50}
                  value={numCards}
                  onChange={(e) =>
                    setNumCards(
                      Math.max(1, Math.min(50, Number(e.target.value) || 1))
                    )
                  }
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", display: "block" }}>
                  Temperature
                </label>
                <input
                  className="input"
                  type="number"
                  step={0.1}
                  min={0}
                  max={1.5}
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              {hasSourceContext && hasInstructions
                ? "We'll use both your instructions and the selected sections."
                : hasSourceContext
                ? "We'll generate cards from the selected source sections."
                : hasInstructions
                ? "We'll generate cards from your instructions only."
                : selectedSourceId !== null
                ? "Select at least one section or add instructions to enable generation."
                : "Add a source or custom instructions to enable generation."}
            </p>

            <div className="button-row" style={{ marginTop: "0.5rem" }}>
              <button
                className="button primary"
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
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
              <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>
            )}

            {/* Generated cards preview */}
            <div style={{ marginTop: "0.75rem" }}>
              <h4 style={{ marginTop: 0, fontSize: "0.9rem" }}>
                Generated cards
              </h4>
              {!generated.length && (
                <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                  No cards generated yet. Add a source or instructions and click
                  “Generate cards”.
                </p>
              )}

              {generated.length > 0 && (
                <div className="list">
                  {generated.map((g, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #2e2e2e",
                        borderRadius: "0.5rem",
                        padding: "0.5rem 0.6rem",
                        marginBottom: "0.4rem",
                        backgroundColor: g.selected ? "#444444ff" : "#323232"
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
                        <RenderMath
                          text={g.front}
                          className="monospace-small"
                        />
                      </div>
                      <div style={{ fontSize: "0.8rem" }}>
                        <strong>Back:</strong>{" "}
                        <RenderMath
                          text={g.back}
                          className="monospace-small"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
