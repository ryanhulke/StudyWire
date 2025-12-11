import React, { useState } from "react";
import { ReviewView } from "./views/ReviewView";
import { SourcesView } from "./views/SourcesView";
import { CardsView } from "./views/CardsView";
import { PracticeView } from "./views/PracticeView";

type Tab = "review" | "practice" | "create" | "cards";

export const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>("review");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Study Wire</h1>
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
            className={tab === "create" ? "active" : ""}
            onClick={() => setTab("create")}
          >
            Create
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
        {tab === "create" && <SourcesView />}
        {tab === "cards" && <CardsView />}
      </main>
    </div>
  );
};
