import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  User, 
  Settings, 
  Layers, 
  ChevronRight, 
  GraduationCap, 
  Flame, 
  BarChart, 
  PenTool, 
  Volume2, 
  Loader,
  Brain,
  Award
} from "lucide-react";
import { Task, FlashcardSet, Note, PomodoroSession } from "./types";
import Pomodoro from "./components/Pomodoro";
import Notepad from "./components/Notepad";
import Flashcards from "./components/Flashcards";
import { auth, db, onAuthStateChanged, signOut, UserProfile } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import AuthScreen from "./components/AuthScreen";
import ProfileModal from "./components/ProfileModal";

// Default Initial Seeding for a beautiful premium first-time experience
const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Review Cell Division & Mitosis Phases",
    description: "Prepare diagrams for the upcoming lab practical quiz",
    subject: "Biology",
    priority: "high",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 days from now
    completed: false,
    estimatedPomodoros: 2,
    actualPomodoros: 0,
    aiRecommendation: "Focus heavily on Anaphase vs Metaphase chromosome alignments."
  },
  {
    id: "task-2",
    title: "Read Chapter 4: Thermodynamics",
    description: "Write notes on enthalpy changes and Hess's Law",
    subject: "Chemistry",
    priority: "medium",
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 4 days from now
    completed: false,
    estimatedPomodoros: 3,
    actualPomodoros: 1,
    aiRecommendation: "Review Hess's Law formula sheet first to save time."
  },
  {
    id: "task-3",
    title: "Annotate Lecture Notes: Kinematics",
    description: "Revise distance-time graphs and constant acceleration equations",
    subject: "Physics",
    priority: "low",
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    completed: true,
    estimatedPomodoros: 2,
    actualPomodoros: 2
  }
];

const initialFlashcards: FlashcardSet[] = [
  {
    id: "set-1",
    title: "Bio-Chemistry: Cellular Metabolism",
    description: "Foundational terms on ATP pathways and electron transport chain",
    cards: [
      { id: "c-1", front: "ATP (Adenosine Triphosphate)", back: "The primary energy currency of the cell, composed of adenosine and three phosphate groups." },
      { id: "c-2", front: "Glycolysis", back: "The metabolic pathway that breaks down glucose into pyruvate, yielding 2 net ATP molecules." },
      { id: "c-3", front: "Mitochondria", back: "The double-membrane bound organelle responsible for generating most of the cell's ATP through oxidative phosphorylation." }
    ]
  }
];

const initialNotes: Note[] = [
  {
    id: "note-1",
    title: "Cellular Energy Pathways",
    content: `Overview of cellular metabolism lectures.
There are three main pathways of aerobic respiration:
1. Glycolysis (occurs in cytoplasm, breaks glucose into pyruvate, net +2 ATP).
2. Citric Acid Cycle / Krebs Cycle (occurs in mitochondrial matrix, releases CO2, yields NADH/FADH2).
3. Electron Transport Chain & Oxidative Phosphorylation (uses oxygen, yields ~32 ATP via ATP synthase).
Oxygen is the final electron acceptor in the transport chain. Anaerobic respiration occurs without oxygen and yields far less energy.`,
    createdAt: new Date().toISOString(),
    summary: `**Overview of Cell Energy Pathways**
- **Glycolysis**: Cytoplasmic pathway, yields 2 ATP.
- **Citric Acid Cycle**: Mitochondrial matrix, produces NADH.
- **ETC**: Uses oxygen as final electron acceptor, synthesizes ~32 ATP via ATP Synthase.
*Study Hint:* Memorize ATP yields at each step; focus heavily on mitochondrial membrane structures.`
  }
];

type ActiveView = "dashboard" | "schedule" | "pomodoro" | "flashcards" | "notepad";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveView>("dashboard");

  // Profile state with local storage persistence by default
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("focus_ai_user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local user profile", e);
      }
    }
    return {
      uid: "local_user",
      email: "scholar@focus.ai",
      displayName: "Alex Chen",
      occupation: "Student",
      gender: "Prefer not to say",
      description: "Focus.AI Companion",
      createdAt: new Date().toISOString()
    };
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // State Management with direct LocalStorage synchronization
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("focus_ai_tasks_local");
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>(() => {
    const saved = localStorage.getItem("focus_ai_flashcards_local");
    return saved ? JSON.parse(saved) : initialFlashcards;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("focus_ai_notes_local");
    return saved ? JSON.parse(saved) : initialNotes;
  });

  const [pomodorosCount, setPomodorosCount] = useState<number>(() => {
    const saved = localStorage.getItem("focus_ai_pomodoros_count_local");
    return saved ? parseInt(saved) : 3;
  });

  // Task Form input states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstPomodoros, setTaskEstPomodoros] = useState(2);

  // General AI study planner recommendations states
  const [studyTopic, setStudyTopic] = useState("");
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiStudyPlan, setAiStudyPlan] = useState<string>("");
  const [isPrioritizing, setIsPrioritizing] = useState(false);

  // Synchronize with LocalStorage
  useEffect(() => {
    localStorage.setItem("focus_ai_tasks_local", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("focus_ai_flashcards_local", JSON.stringify(flashcardSets));
  }, [flashcardSets]);

  useEffect(() => {
    localStorage.setItem("focus_ai_notes_local", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("focus_ai_pomodoros_count_local", pomodorosCount.toString());
  }, [pomodorosCount]);

  // Handle Manual Task Addition
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskSubject.trim()) return;

    const newTask: Task = {
      id: "task-" + Date.now(),
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      subject: taskSubject.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || new Date().toISOString().split("T")[0],
      completed: false,
      estimatedPomodoros: taskEstPomodoros,
      actualPomodoros: 0
    };

    setTasks([newTask, ...tasks]);
    setTaskTitle("");
    setTaskDesc("");
    setTaskSubject("");
    setTaskDueDate("");
    setTaskEstPomodoros(2);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleIncrementPomodoro = (taskId: string) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, actualPomodoros: t.actualPomodoros + 1 } : t))
    );
    setPomodorosCount((prev) => prev + 1);
  };

  const handleLogPomodoroSession = (durationMinutes: number, taskTitle?: string) => {
    // Increment general pomodoros when a session finishes in general study
    if (!taskTitle?.includes("[")) {
      setPomodorosCount((prev) => prev + 1);
    }
  };

  // Proactive study task recommendations via Gemini 3.5 Flash
  const fetchAiTaskRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTopic.trim()) return;
    setIsRecommending(true);

    try {
      const response = await fetch("/api/gemini/recommend-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: studyTopic.trim(),
          existingTasksCount: tasks.filter(t => !t.completed).length
        })
      });

      if (!response.ok) throw new Error("API recommendation request failed");
      const data = await response.json();

      if (data.tasks && Array.isArray(data.tasks)) {
        const newAiTasks: Task[] = data.tasks.map((t: any, index: number) => ({
          id: `ai-task-${Date.now()}-${index}`,
          title: t.title,
          description: t.description,
          subject: t.subject || "AI Suggestion",
          priority: t.priority || "medium",
          dueDate: new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          completed: false,
          estimatedPomodoros: t.estimatedPomodoros || 2,
          actualPomodoros: 0,
          aiRecommendation: t.aiRecommendation,
          isAiSuggested: true
        }));

        setTasks(prev => [...newAiTasks, ...prev]);
        setStudyTopic("");
        alert(`✨ Successfully generated ${newAiTasks.length} proactive study tasks based on your goal!`);
      }
    } catch (e: any) {
      alert(`Could not generate AI recommendations: ${e.message}`);
    } finally {
      setIsRecommending(false);
    }
  };

  // Proactive Strategy & Priority Plan via Gemini 3.5 Flash
  const generatePriorityPlan = async () => {
    const pending = tasks.filter((t) => !t.completed);
    if (pending.length === 0) {
      alert("Please add some active tasks first to trigger proactive strategic scheduling.");
      return;
    }

    setIsPrioritizing(true);
    setAiStudyPlan("");

    try {
      const response = await fetch("/api/gemini/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: pending })
      });

      if (!response.ok) throw new Error("API prioritization failed");
      const data = await response.json();

      setAiStudyPlan(data.studyPlan);

      // Re-order tasks in sequence of recommended execution if provided
      if (data.prioritizedTaskIds && Array.isArray(data.prioritizedTaskIds)) {
        const idMap = new Map(data.prioritizedTaskIds.map((id, index) => [id, index]));
        const sorted = [...tasks].sort((a, b) => {
          const idxA = idMap.has(a.id) ? (idMap.get(a.id) as number) : 999;
          const idxB = idMap.has(b.id) ? (idMap.get(b.id) as number) : 999;
          return idxA - idxB;
        });
        setTasks(sorted);
      }
    } catch (e: any) {
      alert(`Could not build study strategy: ${e.message}`);
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Flashcards state delegates
  const handleAddFlashcardSet = (title: string, description: string, cards: any[]) => {
    const newSet: FlashcardSet = {
      id: "set-" + Date.now(),
      title,
      description,
      cards
    };
    setFlashcardSets([newSet, ...flashcardSets]);
  };

  const handleDeleteFlashcardSet = (id: string) => {
    setFlashcardSets(flashcardSets.filter((s) => s.id !== id));
  };

  const handleImportFlashcardSet = (set: FlashcardSet) => {
    setFlashcardSets([set, ...flashcardSets]);
  };

  // Notebook delegates
  const handleAddNote = (title: string, content: string) => {
    const newNote: Note = {
      id: "note-" + Date.now(),
      title,
      content,
      createdAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  // Calculations for dashboard
  const pendingTasks = tasks.filter((t) => !t.completed);
  const highPriorityCount = pendingTasks.filter((t) => t.priority === "high").length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;



  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans antialiased flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col justify-between">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              F
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight block">Focus.AI</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Study Companion</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button
              id="nav_dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Award className="w-4 h-4" />
              Study Dashboard
            </button>
            <button
              id="nav_schedule"
              onClick={() => setActiveTab("schedule")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "schedule"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Smart Schedule
            </button>
            <button
              id="nav_pomodoro"
              onClick={() => setActiveTab("pomodoro")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "pomodoro"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              Deep Work Sessions
            </button>
            <button
              id="nav_flashcards"
              onClick={() => setActiveTab("flashcards")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "flashcards"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Brain className="w-4 h-4" />
              Flashcard Vault
            </button>
            <button
              id="nav_notepad"
              onClick={() => setActiveTab("notepad")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "notepad"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <PenTool className="w-4 h-4" />
              Study Notes & AI
            </button>
          </nav>
        </div>

        {/* User profile footer info */}
        <div className="pt-4 border-t border-slate-100 mt-8">
          <div 
            id="profile_trigger"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-all"
            title="Edit profile settings"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shrink-0">
              {userProfile.displayName ? userProfile.displayName.substring(0, 2) : "US"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900 block leading-tight truncate">
                {userProfile.displayName}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {userProfile.occupation}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Study Arena */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="greeting">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hello, {userProfile.displayName ? userProfile.displayName.split(" ")[0] : "Scholar"}.
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              You have {pendingTasks.length} focus tasks active, with {highPriorityCount} urgent deadlines looming.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs font-bold text-slate-900">Saturday, June 27, 2026</div>
            <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Proactive AI Mode Active
            </div>
          </div>
        </header>

        {/* AI Study Proactive Insight Banner */}
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 mb-8 flex gap-4 items-start">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            ✧
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-xs text-[#3730A3]">Proactive Study Planner Insight</h4>
            <p className="text-xs text-[#4338CA] mt-1 leading-normal">
              {pendingTasks.length > 0 
                ? `You have ${pendingTasks.length} pending academic tasks. Based on deadlines, I recommend prioritizing "${pendingTasks[0].title}". You can trigger a full strategic sequence under "Smart Schedule".` 
                : "Your schedule is currently clear of pending goals! Search or add custom topics to receive proactive AI-guided study recommendations."}
            </p>
          </div>
        </div>

        {/* View Switcher Arena */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Syllabus Progress</span>
                  <span className="text-lg font-bold text-slate-900 block mt-0.5">{completionRate}% Completed</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{completedCount} of {tasks.length} goals</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                  <Clock className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Focus Pomodoros</span>
                  <span className="text-lg font-bold text-slate-900 block mt-0.5">{pomodorosCount} Sessions</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Estimated {pomodorosCount * 25} minutes total focus</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Retention Streak</span>
                  <span className="text-lg font-bold text-slate-900 block mt-0.5">5 Days Active</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Consistent review increases recall speed</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content split - Overview of Tasks and Review Decks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Focus study plan */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Current Study Plan</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Your active topics and deadlines</p>
                  </div>
                  <button
                    id="add_task_redirect_btn"
                    onClick={() => setActiveTab("schedule")}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    Manage Schedule <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingTasks.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400">All tasks completed! Amazing work.</p>
                      <button
                        onClick={() => setActiveTab("schedule")}
                        className="mt-3 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Add New Task
                      </button>
                    </div>
                  ) : (
                    pendingTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-300 transition-all"
                      >
                        <button
                          id={`dash_complete_${task.id}`}
                          onClick={() => toggleTaskCompletion(task.id)}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-indigo-500 mt-0.5 flex items-center justify-center transition-all bg-white"
                        >
                          {task.completed && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{task.title}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                task.priority === "high"
                                  ? "bg-red-50/80 text-red-600 border border-red-100"
                                  : task.priority === "medium"
                                    ? "bg-yellow-50/80 text-yellow-700 border border-yellow-100"
                                    : "bg-blue-50/80 text-blue-600 border border-blue-100"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">
                              {task.subject}
                            </span>
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            <span>{task.actualPomodoros}/{task.estimatedPomodoros} Pomodoros</span>
                          </div>

                          {task.aiRecommendation && (
                            <div className="mt-2 text-[9px] bg-white border border-slate-100 p-2 rounded-lg text-slate-500 flex items-start gap-1">
                              <span className="text-indigo-500 font-bold">💡 Tip:</span>
                              <span>{task.aiRecommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Flashcard & Note previews */}
              <div className="lg:col-span-5 space-y-6">
                {/* Flashcard Quick Deck */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Memory Repetition</h3>
                  {flashcardSets.length > 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between h-40">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{flashcardSets[0].title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{flashcardSets[0].description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100/60">
                        <span className="text-[10px] text-slate-400 font-semibold">{flashcardSets[0].cards.length} Cards available</span>
                        <button
                          onClick={() => setActiveTab("flashcards")}
                          className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          Launch Deck <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No memory decks ready. Add one under "Flashcard Vault".
                    </div>
                  )}
                </div>

                {/* Quick study notepad overview */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Notes</h3>
                  {notes.length > 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{notes[0].title}</span>
                        <span className="text-[9px] text-slate-400">{new Date(notes[0].createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{notes[0].content}</p>
                      <button
                        onClick={() => setActiveTab("notepad")}
                        className="mt-3 text-xs text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        Synthesize with AI <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Notebook empty. Create a study topic under "Study Notes & AI".
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Task Creation Form & Proactive recommendations input */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Proactive Task Recommendation by Topic */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Proactive Recommendations</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-4 leading-normal">
                    Enter a study topic or upcoming exam topic. Gemini 3.5 Flash will construct highly specific study milestones.
                  </p>

                  <form onSubmit={fetchAiTaskRecommendations} className="space-y-3">
                    <input
                      id="study_topic_input"
                      type="text"
                      placeholder="e.g. Organic Chemistry, Real Analysis"
                      value={studyTopic}
                      onChange={(e) => setStudyTopic(e.target.value)}
                      disabled={isRecommending}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                      required
                    />
                    <button
                      id="study_recommend_btn"
                      type="submit"
                      disabled={isRecommending || !studyTopic.trim()}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isRecommending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate AI Task Milestones
                    </button>
                  </form>
                </div>

                {/* Manual Task Creator */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">Manual Task Creator</h3>
                  <form onSubmit={handleAddTask} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Task Title</label>
                      <input
                        id="task_title_field"
                        type="text"
                        placeholder="e.g. Practice Mock Quiz"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Details (Optional)</label>
                      <input
                        id="task_desc_field"
                        type="text"
                        placeholder="e.g. Focus on kinematic graphs"
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                        <input
                          id="task_subject_field"
                          type="text"
                          placeholder="Physics"
                          value={taskSubject}
                          onChange={(e) => setTaskSubject(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                        <select
                          id="task_priority_field"
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
                        <input
                          id="task_duedate_field"
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Est. Pomodoros</label>
                        <input
                          id="task_pomodoros_field"
                          type="number"
                          min={1}
                          max={6}
                          value={taskEstPomodoros}
                          onChange={(e) => setTaskEstPomodoros(parseInt(e.target.value) || 2)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>

                    <button
                      id="save_task_btn"
                      type="submit"
                      className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save Task to Schedule
                    </button>
                  </form>
                </div>
              </div>

              {/* Task list and Prioritization Workspace */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[580px]">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Study Milestones & Tasks</h3>
                      <p className="text-[11px] text-slate-400">Proactively re-prioritized on-demand by Gemini</p>
                    </div>

                    {/* Proactive Prioritization Trigger */}
                    <button
                      id="ai_prioritize_btn"
                      onClick={generatePriorityPlan}
                      disabled={isPrioritizing || pendingTasks.length === 0}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      {isPrioritizing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                      Proactive AI Prioritization Plan
                    </button>
                  </div>

                  {/* AI Prioritization advice drawer */}
                  {aiStudyPlan && (
                    <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-4 rounded-xl mb-4 text-[#4338CA] relative">
                      <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1">
                        ✧ Proactive Strategic Study Recommendation
                      </h4>
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                        {aiStudyPlan}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs">
                        No active study tasks in your schedule. Input a topic on the left for proactive recommendations!
                      </div>
                    ) : (
                      tasks.map((t) => (
                        <div
                          key={t.id}
                          id={`task_card_${t.id}`}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            t.completed
                              ? "bg-slate-50 border-slate-100 opacity-60"
                              : t.isAiSuggested
                                ? "bg-indigo-50/20 border-indigo-100"
                                : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              id={`toggle_task_completion_${t.id}`}
                              onClick={() => toggleTaskCompletion(t.id)}
                              className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-slate-500 mt-0.5 flex items-center justify-center bg-white"
                            >
                              {t.completed && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold text-slate-800 ${t.completed ? "line-through text-slate-400" : ""}`}>
                                  {t.title}
                                </span>
                                {t.isAiSuggested && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold">
                                    AI Suggested
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                              
                              <div className="flex items-center flex-wrap gap-2.5 mt-2.5 text-[10px] text-slate-400">
                                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {t.subject}
                                </span>
                                <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                                  {t.actualPomodoros} of {t.estimatedPomodoros} Pomodoros logged
                                </span>
                              </div>

                              {t.aiRecommendation && (
                                <div className="mt-2 text-[9px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 flex items-start gap-1">
                                  <span className="text-indigo-500 font-bold">💡 Tip:</span>
                                  <span>{t.aiRecommendation}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                t.priority === "high"
                                  ? "bg-red-50 text-red-600"
                                  : t.priority === "medium"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <button
                              id={`delete_task_${t.id}`}
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deep Work Sessions (Pomodoro Component) */}
        {activeTab === "pomodoro" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-8 h-full">
              <Pomodoro
                tasks={tasks}
                onIncrementPomodoro={handleIncrementPomodoro}
                onLogSession={handleLogPomodoroSession}
              />
            </div>
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">Focus Strategy</h3>
                <p className="text-[11px] text-slate-400 leading-normal mb-4">
                  The Pomodoro Technique boosts cerebral retention. Dedicate 25 minutes to a single focused task, followed by 5 minutes of mindful resting.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Select study task</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Link a goal to automatically track and update your active syllabus completion rate.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Select Ambient Soundscaping</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Utilize synthesized procedural Brown Noise (Rain, Shoreline Waves) to block out outside noise.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Take a Zen Rest</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">When the custom crystal chime rings, stretch or do breathing exercises to reset your focus.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats list */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Today's Logs</span>
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Sessions Completed:</span>
                  <span className="font-mono text-indigo-600">{pomodorosCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard Vault Tab */}
        {activeTab === "flashcards" && (
          <Flashcards
            sets={flashcardSets}
            onAddSet={handleAddFlashcardSet}
            onDeleteSet={handleDeleteFlashcardSet}
          />
        )}

        {/* Notebook & AI Assessments */}
        {activeTab === "notepad" && (
          <Notepad
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onImportFlashcards={handleImportFlashcardSet}
          />
        )}
      </main>

      {isProfileModalOpen && userProfile && (
        <ProfileModal
          profile={userProfile}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateProfile={(updated) => setUserProfile(updated)}
        />
      )}
    </div>
  );
}
