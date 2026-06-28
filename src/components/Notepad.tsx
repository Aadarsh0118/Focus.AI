import React, { useState } from "react";
import { Plus, BookOpen, Trash2, Sparkles, Brain, GraduationCap, CheckCircle, XCircle, ChevronRight, CornerDownRight, Loader, Trophy } from "lucide-react";
import { Note, FlashcardSet } from "../types";

interface NotepadProps {
  notes: Note[];
  onAddNote: (title: string, content: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onImportFlashcards: (set: FlashcardSet) => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface QuizData {
  quizTitle: string;
  questions: QuizQuestion[];
}

export default function Notepad({ notes, onAddNote, onUpdateNote, onDeleteNote, onImportFlashcards }: NotepadProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteActive, setConfirmDeleteActive] = useState(false);

  // AI loading and output states
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [quiz, setQuiz] = useState<QuizData | null>(null);

  // Active Quiz taking states
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<{ questionIndex: number; correct: boolean }[]>([]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    onAddNote(newTitle.trim(), newContent.trim());
    setNewTitle("");
    setNewContent("");
  };

  // AI Summarization triggers
  const triggerSummarize = async () => {
    if (!selectedNote) return;
    setIsSummarizing(true);
    setAiSummary("");
    setQuiz(null); // Clear previous quiz when doing summary
    try {
      const res = await fetch("/api/gemini/summarize-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedNote.content, title: selectedNote.title }),
      });
      if (!res.ok) throw new Error("Summarization failed");
      const data = await res.json();
      setAiSummary(data.summary);
      onUpdateNote(selectedNote.id, { summary: data.summary });
    } catch (e: any) {
      alert(`Error summarizing note: ${e.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // AI Flashcard generation triggers
  const triggerGenerateFlashcards = async () => {
    if (!selectedNote) return;
    setIsGeneratingFlashcards(true);
    try {
      const res = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: selectedNote.content }),
      });
      if (!res.ok) throw new Error("Flashcards generation failed");
      const data = await res.json();

      // Ensure flashcards structure is correct
      const newSet: FlashcardSet = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title || `Flashcards: ${selectedNote.title}`,
        description: data.description || `Generated from note: ${selectedNote.title}`,
        cards: data.cards || [],
      };

      onImportFlashcards(newSet);
      alert(`✨ Successfully generated ${newSet.cards.length} study flashcards! They have been added to your Flashcards collection.`);
    } catch (e: any) {
      alert(`Error generating flashcards: ${e.message}`);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // AI Quiz generation triggers
  const triggerGenerateQuiz = async () => {
    if (!selectedNote) return;
    setIsGeneratingQuiz(true);
    setQuiz(null);
    setAiSummary(""); // Clear summary when taking quiz
    // Reset quiz tracking states
    setCurrentQuizQuestion(0);
    setSelectedAnswerIndex(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizResults([]);

    try {
      const res = await fetch("/api/gemini/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedNote.content, title: selectedNote.title }),
      });
      if (!res.ok) throw new Error("Quiz generation failed");
      const data = await res.json();
      setQuiz(data);
    } catch (e: any) {
      alert(`Error generating study quiz: ${e.message}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswerIndex !== null) return; // Answered already
    setSelectedAnswerIndex(index);
    const isCorrect = index === quiz?.questions[currentQuizQuestion].correctOptionIndex;
    if (isCorrect) setQuizScore((prev) => prev + 1);

    setQuizResults((prev) => [
      ...prev,
      { questionIndex: currentQuizQuestion, correct: isCorrect },
    ]);
  };

  const handleNextQuizQuestion = () => {
    if (!quiz) return;
    if (currentQuizQuestion < quiz.questions.length - 1) {
      setCurrentQuizQuestion((prev) => prev + 1);
      setSelectedAnswerIndex(null);
    } else {
      setQuizCompleted(true);
    }
  };

  return (
    <div id="notepad_widget" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Notes side bar / selector */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-[580px] overflow-hidden">
        <h3 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          Study Notebook
        </h3>

        {/* Create new note form */}
        <form onSubmit={handleCreateNote} className="space-y-2 mb-4 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
          <input
            id="note_title_input"
            type="text"
            placeholder="New note topic..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
          <textarea
            id="note_content_input"
            placeholder="Write concepts, lectures, or facts here..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            required
          />
          <button
            id="add_note_btn"
            type="submit"
            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Save Note
          </button>
        </form>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notes.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No notes saved yet. Jot down some concepts above to get started.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                id={`note_item_${note.id}`}
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setAiSummary(note.summary || "");
                  setQuiz(null);
                  setConfirmDeleteActive(false);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedNoteId === note.id
                    ? "bg-slate-800/80 border-indigo-500/50 shadow-md"
                    : "bg-slate-950/60 border-slate-800/50 hover:bg-slate-850/50 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {note.title}
                  </span>
                  {confirmDeleteId === note.id ? (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                          if (selectedNoteId === note.id) setSelectedNoteId("");
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
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`delete_note_${note.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(note.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5">
                  {note.content}
                </p>
                <span className="text-[9px] text-slate-500 self-end mt-2">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor & AI Workspace */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-[580px] overflow-hidden">
        {selectedNote ? (
          <div className="flex flex-col h-full">
            {/* Header / Meta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-100">{selectedNote.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Analyze notes using Gemini 3.5 Flash for proactive study coaching.
                </p>
              </div>

              {/* Proactive Tools Drawer */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  id="ai_summarize_btn"
                  onClick={triggerSummarize}
                  disabled={isSummarizing || isGeneratingFlashcards || isGeneratingQuiz}
                  className="px-2.5 py-1.5 bg-indigo-950 border border-indigo-850 text-indigo-300 hover:bg-indigo-900 rounded-xl text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {isSummarizing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Summarize
                </button>
                <button
                  id="ai_flashcards_btn"
                  onClick={triggerGenerateFlashcards}
                  disabled={isSummarizing || isGeneratingFlashcards || isGeneratingQuiz}
                  className="px-2.5 py-1.5 bg-emerald-950 border border-emerald-900/60 text-emerald-300 hover:bg-emerald-900 rounded-xl text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {isGeneratingFlashcards ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate Flashcards
                </button>
                <button
                  id="ai_quiz_btn"
                  onClick={triggerGenerateQuiz}
                  disabled={isSummarizing || isGeneratingFlashcards || isGeneratingQuiz}
                  className="px-2.5 py-1.5 bg-amber-950 border border-amber-900/50 text-amber-300 hover:bg-amber-900 rounded-xl text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {isGeneratingQuiz ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                  Assess with Quiz
                </button>

                {/* Workspace Active Note Deletion Action with Inline Confirmation */}
                {confirmDeleteActive ? (
                  <div className="flex items-center gap-1 bg-red-950/30 border border-red-900/40 rounded-xl px-1.5 py-1">
                    <span className="text-[10px] text-red-400 font-bold px-1.5">Delete note?</span>
                    <button
                      id="confirm_delete_active_yes"
                      type="button"
                      onClick={() => {
                        onDeleteNote(selectedNote.id);
                        setSelectedNoteId("");
                        setConfirmDeleteActive(false);
                      }}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      Yes
                    </button>
                    <button
                      id="confirm_delete_active_no"
                      type="button"
                      onClick={() => setConfirmDeleteActive(false)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    id="delete_active_note_btn"
                    type="button"
                    onClick={() => setConfirmDeleteActive(true)}
                    className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/60 border border-red-900/30 text-red-400 rounded-xl text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Note
                  </button>
                )}
              </div>
            </div>

            {/* Notebook body space */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
              {/* Note Content Textarea */}
              <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 p-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Original Lecture Notes
                </label>
                <textarea
                  id="note_editor_content"
                  value={selectedNote.content}
                  onChange={(e) => onUpdateNote(selectedNote.id, { content: e.target.value })}
                  className="w-full flex-1 bg-transparent text-slate-200 text-xs resize-none outline-none font-sans leading-relaxed"
                  placeholder="Notes content..."
                />
              </div>

              {/* AI Study Output Area */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-y-auto flex flex-col justify-between relative">
                {isSummarizing || isGeneratingFlashcards || isGeneratingQuiz ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <Loader className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                    <h5 className="text-xs font-bold text-slate-200">Consulting AI study companion...</h5>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                      Formulating strategic notes synthesis or designing custom flashcards. Hold tight!
                    </p>
                  </div>
                ) : quiz ? (
                  /* Interactive Quiz Panel */
                  <div className="flex flex-col justify-between h-full">
                    {!quizCompleted ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            AI Comprehension Quiz
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Q: {currentQuizQuestion + 1} of {quiz.questions.length}
                          </span>
                        </div>

                        <h5 className="text-xs font-bold text-slate-200 leading-relaxed">
                          {quiz.questions[currentQuizQuestion].question}
                        </h5>

                        <div className="space-y-1.5">
                          {quiz.questions[currentQuizQuestion].options.map((opt, oIdx) => {
                            const isSelected = selectedAnswerIndex === oIdx;
                            const isCorrect = oIdx === quiz.questions[currentQuizQuestion].correctOptionIndex;
                            const hasAnswered = selectedAnswerIndex !== null;

                            let btnStyle = "bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800";
                            if (hasAnswered) {
                              if (isCorrect) {
                                btnStyle = "bg-emerald-950 border-emerald-500 text-emerald-200";
                              } else if (isSelected) {
                                btnStyle = "bg-red-950 border-red-500 text-red-200";
                              } else {
                                btnStyle = "bg-slate-900 text-slate-500 opacity-60 border-slate-800";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                id={`quiz_option_${oIdx}`}
                                onClick={() => handleAnswerSelect(oIdx)}
                                disabled={hasAnswered}
                                className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {hasAnswered && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                {hasAnswered && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                              </button>
                            );
                          })}
                        </div>

                        {selectedAnswerIndex !== null && (
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl mt-3 animate-fade-in">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 block mb-1">
                              Explanation:
                            </span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              {quiz.questions[currentQuizQuestion].explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Quiz Complete View */
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <Trophy className="w-12 h-12 text-amber-400 mb-3" />
                        <h5 className="text-sm font-bold text-slate-200">Quiz Completed!</h5>
                        <p className="text-xl font-mono font-bold text-white mt-1.5">
                          {quizScore} / {quiz.questions.length}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                          {quizScore === quiz.questions.length
                            ? "Absolute mastery! You thoroughly grasp these study concepts."
                            : "Excellent effort. Re-read original notes and try again to solidfy your memory!"}
                        </p>

                        <button
                          id="restart_quiz_btn"
                          onClick={triggerGenerateQuiz}
                          className="mt-5 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs hover:bg-slate-700 font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    )}

                    {!quizCompleted && selectedAnswerIndex !== null && (
                      <button
                        id="next_quiz_q_btn"
                        onClick={handleNextQuizQuestion}
                        className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        {currentQuizQuestion < quiz.questions.length - 1 ? (
                          <>
                            Next Question <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          "Finish Assessment"
                        )}
                      </button>
                    )}
                  </div>
                ) : aiSummary ? (
                  /* AI Notes Synthesis */
                  <div className="space-y-3 h-full flex flex-col">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                      AI Study Coaching Summary
                    </span>
                    <div className="flex-1 overflow-y-auto pr-1">
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line prose prose-invert">
                        {aiSummary}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Idle Output State */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Sparkles className="w-8 h-8 text-slate-700 mb-3" />
                    <h5 className="text-xs font-semibold text-slate-400">Proactive Study Assistant</h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-xs">
                      Select notes and use the top AI buttons to create structured summaries, draft ready-to-test flashcards, or create interactive MCQs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
            <h5 className="text-sm font-semibold text-slate-400">Notebook Workspace</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
              Create a note topic on the left or select an existing one to unlock pro-active study assessments and synthesis tools.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
