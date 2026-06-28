import React, { useState } from "react";
import { Plus, Eye, Check, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Trash2, Library, GraduationCap } from "lucide-react";
import { FlashcardSet, Flashcard } from "../types";

interface FlashcardsProps {
  sets: FlashcardSet[];
  onAddSet: (title: string, description: string, cards: Flashcard[]) => void;
  onDeleteSet: (id: string) => void;
}

export default function Flashcards({ sets, onAddSet, onDeleteSet }: FlashcardsProps) {
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Manual Set Creation States
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [newCards, setNewCards] = useState<{ front: string; back: string }[]>([
    { front: "", back: "" },
  ]);

  // General AI flashcard generation by topic direct helper
  const [topicPrompt, setTopicPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSet = sets.find((s) => s.id === selectedSetId);

  const handleAddCardRow = () => {
    setNewCards([...newCards, { front: "", back: "" }]);
  };

  const handleCardRowChange = (index: number, field: "front" | "back", value: string) => {
    const updated = [...newCards];
    updated[index][field] = value;
    setNewCards(updated);
  };

  const handleRemoveCardRow = (index: number) => {
    if (newCards.length === 1) return;
    setNewCards(newCards.filter((_, idx) => idx !== index));
  };

  const handleSaveSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetTitle.trim()) return;

    const validCards = newCards
      .filter((c) => c.front.trim() && c.back.trim())
      .map((c) => ({
        id: Math.random().toString(36).substr(2, 9),
        front: c.front.trim(),
        back: c.back.trim(),
      }));

    if (validCards.length === 0) {
      alert("Please provide at least one valid flashcard with both a Front question and Back answer.");
      return;
    }

    onAddSet(newSetTitle.trim(), newSetDescription.trim() || "Manual collection", validCards);
    setIsCreatingSet(false);
    setNewSetTitle("");
    setNewSetDescription("");
    setNewCards([{ front: "", back: "" }]);
  };

  const handleGenerateFromTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicPrompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicPrompt.trim() }),
      });

      if (!res.ok) throw new Error("Could not construct flashcards");
      const data = await res.json();

      const newSet: FlashcardSet = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title || `Flashcards: ${topicPrompt}`,
        description: data.description || `AI-generated flashcards on ${topicPrompt}`,
        cards: (data.cards || []).map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          front: c.front,
          back: c.back,
        })),
      };

      onAddSet(newSet.title, newSet.description, newSet.cards);
      setSelectedSetId(newSet.id);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setTopicPrompt("");
    } catch (e: any) {
      alert(`AI Flashcards failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextCard = () => {
    if (!activeSet) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % activeSet.cards.length);
    }, 150);
  };

  const handlePrevCard = () => {
    if (!activeSet) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + activeSet.cards.length) % activeSet.cards.length);
    }, 150);
  };

  return (
    <div id="flashcards_tab" className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Side list of cards sets */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[580px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Library className="w-4 h-4 text-slate-800" />
            Study Collections
          </h3>
          <button
            id="new_set_btn"
            onClick={() => {
              setIsCreatingSet(true);
              setSelectedSetId("");
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New Set
          </button>
        </div>

        {/* Proactive Generator */}
        <form onSubmit={handleGenerateFromTopic} className="mb-4 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
          <label className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
            ✧ Proactive Topic Generator
          </label>
          <div className="flex gap-1.5">
            <input
              id="ai_topic_input"
              type="text"
              placeholder="e.g. Photo-synthesis, Calculus..."
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
              disabled={isGenerating}
              className="flex-1 bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            />
            <button
              id="ai_topic_gen_btn"
              type="submit"
              disabled={isGenerating}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center disabled:opacity-50"
            >
              {isGenerating ? "..." : "AI Set"}
            </button>
          </div>
        </form>

        {/* Set list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {sets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No flashcard decks. Use the proactive AI topic builder or create a set manually above.
            </div>
          ) : (
            sets.map((set) => (
              <div
                key={set.id}
                id={`set_item_${set.id}`}
                onClick={() => {
                  setSelectedSetId(set.id);
                  setIsCreatingSet(false);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedSetId === set.id
                    ? "bg-slate-50 border-slate-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{set.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{set.description}</p>
                  </div>
                  {confirmDeleteId === set.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSet(set.id);
                          if (selectedSetId === set.id) setSelectedSetId("");
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`delete_set_${set.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(set.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {set.cards.length} cards
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                    Study <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Review Workspace */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-[580px]">
        {isCreatingSet ? (
          /* Manual Set Builder Form */
          <form onSubmit={handleSaveSet} className="flex flex-col h-full justify-between">
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Create Study Set</h4>
                <p className="text-[11px] text-slate-400">Design custom memory triggers for your active subjects.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Set Title</label>
                  <input
                    id="set_title_input"
                    type="text"
                    placeholder="e.g. Physics Ch 3 Formulas"
                    value={newSetTitle}
                    onChange={(e) => setNewSetTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Brief Description</label>
                  <input
                    id="set_desc_input"
                    type="text"
                    placeholder="e.g. Equations of motion and kinematics"
                    value={newSetDescription}
                    onChange={(e) => setNewSetDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cards ({newCards.length})</label>
                  <button
                    id="add_card_row_btn"
                    type="button"
                    onClick={handleAddCardRow}
                    className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    + Add Card
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newCards.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold w-5 text-center">#{idx + 1}</span>
                      <input
                        id={`card_front_${idx}`}
                        type="text"
                        placeholder="Front question/concept..."
                        value={c.front}
                        onChange={(e) => handleCardRowChange(idx, "front", e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none"
                        required
                      />
                      <input
                        id={`card_back_${idx}`}
                        type="text"
                        placeholder="Back definition/answer..."
                        value={c.back}
                        onChange={(e) => handleCardRowChange(idx, "back", e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none"
                        required
                      />
                      <button
                        id={`remove_card_row_${idx}`}
                        type="button"
                        onClick={() => handleRemoveCardRow(idx)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        disabled={newCards.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                id="cancel_set_btn"
                type="button"
                onClick={() => setIsCreatingSet(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="save_set_btn"
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                Save Deck
              </button>
            </div>
          </form>
        ) : activeSet ? (
          /* Active Card Review Deck View */
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-slate-950">{activeSet.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{activeSet.description}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full font-semibold">
                  Card {currentCardIndex + 1} of {activeSet.cards.length}
                </span>
              </div>
            </div>

            {/* Interactive Flipper Canvas */}
            <div className="flex-1 flex items-center justify-center py-6">
              <div
                id="flashcard_flipper_canvas"
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-md h-52 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl cursor-pointer p-6 flex flex-col justify-between items-center text-center transition-all shadow-sm select-none relative overflow-hidden"
              >
                <div className="absolute top-4 left-4 text-[10px] uppercase font-bold tracking-widest text-indigo-500 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {isFlipped ? "Answer Side" : "Recall Challenge"}
                </div>

                <div className="flex-1 flex items-center justify-center px-4">
                  <p className="text-sm font-bold leading-relaxed text-slate-900">
                    {isFlipped ? activeSet.cards[currentCardIndex].back : activeSet.cards[currentCardIndex].front}
                  </p>
                </div>

                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-100">
                  <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                  Click to Flip
                </div>
              </div>
            </div>

            {/* Deck control navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                id="prev_card_btn"
                onClick={handlePrevCard}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="quick_flip_btn"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Flip Card
              </button>

              <button
                id="next_card_btn"
                onClick={handleNextCard}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* General Welcome Placeholder state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Library className="w-16 h-16 text-slate-200 mb-4" />
            <h5 className="text-sm font-bold text-slate-900">Flashcard Vault</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
              Organize topics and test your recall depth with dynamic dual-sided decks. Select an existing collection from the library, or tap "New Set" to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
