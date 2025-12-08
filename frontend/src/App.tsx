import React, { useState } from "react";
import { ReviewView } from "./views/ReviewView";
import { SourcesView } from "./views/SourcesView";
import { CardsView } from "./views/CardsView";
import { PracticeView } from "./views/PracticeView";

type Tab = "review" | "practice" | "sources" | "cards";

export const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>("review");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Study Tool</h1>
        <nav className="app-nav">
          <button
            className={tab === "review" ? "active" : ""}
            onClick={() => setTab("review")}
          >
            Today
          </button>
          <button
            className={tab === "practice" ? "active" : ""}
            onClick={() => setTab("practice")}
          >
            Practice
          </button>
          <button
            className={tab === "sources" ? "active" : ""}
            onClick={() => setTab("sources")}
          >
            Sources
          </button>
          <button
            className={tab === "cards" ? "active" : ""}
            onClick={() => setTab("cards")}
          >
            Cards
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === "review" && <ReviewView />}
        {tab === "practice" && <PracticeView />}
        {tab === "sources" && <SourcesView />}
        {tab === "cards" && <CardsView />}
      </main>
    </div>
  );
};
