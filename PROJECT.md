# AI Productivity Companion (Focus.AI)
### *A Unified, AI-Powered Cognitive Cockpit for Accelerated Learning & Active Recall*

---

## 📌 1. Selected Problem Statement

### The Cognitive Fragmentation Crisis in Modern Education
Modern students, researchers, and professionals face unprecedented cognitive overhead. While digital information is abundant, the tools to synthesize, schedule, and self-assess this information are deeply fragmented:
1. **Tool Proliferation & Context Switching**: Users constantly jump between a task planner (e.g., Todoist), a timer (e.g., Forest), a notebook (e.g., Notion), and an active recall tool (e.g., Anki). This friction degrades mental momentum and focus.
2. **Passive Reading vs. Active Recall**: Most learners spend hours highlighting notes or re-reading lectures passively, which cognitive science has proven to be the least effective study method. True synthesis requires active retrieval (e.g., quizzes, flashcards).
3. **Overwhelming Backlogs**: Users collect hundreds of tasks and research papers but lack a proactive assistant to prioritize what to study next or compile a structured, hour-by-hour action plan.

---

## 💡 2. Solution Overview

**AI Productivity Companion** is a highly polished, unified workspace that seamlessly integrates task scheduling, time-boxing, structured note-taking, and AI-driven active recall testing into a single-view, client-centric, high-performance interface.

By bypassing login friction and saving data locally (with optional secure Firestore synchronization), it provides a fast-loading, offline-first cockpit. Built with responsive feedback, elegant typography, and zero-flicker transitions, it transforms passive input into dynamic learning modules instantly.

---

## ⚙️ 3. Key Features

| Module | Core Capability | Active Recall / AI Value Addition |
| :--- | :--- | :--- |
| **🚀 AI Dashboard** | Proactive task management, priority ratings, and time estimation. | **Proactive Prioritization**: Auto-analyzes tasks to highlight urgent items. **AI Study Planner**: Instantly designs an hour-by-hour study plan matching the user's workload. |
| **📝 Smart Notepad** | Rich markdown-capable scratchpad, lecture summarizer. | **AI Synthesizer**: condenses notes into scannable key takeaways. **Assess with Quiz**: Generates structured multiple-choice tests from raw note text on demand. |
| **📇 Flashcard Engine** | Interactive card slider, active-recall flip mechanism, and set managers. | **Autopilot Generation**: Auto-creates standard question-and-answer decks from lecture notes, turning passive reading into active retrieval. |
| **⏱️ Pomodoro Tracker** | Customizable focus intervals, visual progress tracking, and ambient status. | Helps combat procrastination by anchoring study sessions to science-backed interval blocks. |
| **👤 Scholar Profile** | Personalized learning profile, custom bio, and learning goals. | Tailors the workspace experience to the user's individual scholarly occupation and learning background. |

---

## 📊 4. Architectural Workflows & System Diagrams

### 🗺️ System Architecture Diagram
```
                     +---------------------------------------+
                     |         Web Browser (Client)          |
                     |  - Single Page React Application     |
                     |  - Tailwind CSS & Lucide Icons        |
                     |  - Local Storage (State Persistence)  |
                     +-------------------+-------------------+
                                         |
                       User Actions /    |   API Requests /
                       Secure Sync       |   AI Prompt Queries
                                         v
                     +-------------------+-------------------+
                     |           Express Server              |
                     |  - Static Asset Delivery              |
                     |  - API Request Gateway                |
                     |  - Environment Variable Protection    |
                     +--------+--------------------+---------+
                              |                    |
       Store User Profiles /  |                    | Proxy Requests for
       Metadata Backups       |                    | Text & JSON Generation
                              v                    v
                     +--------+---------+   +------+----------------+
                     | Google Firebase  |   |   Google Gemini API   |
                     |  - Firestore DB  |   |   - gemini-2.5-flash  |
                     +------------------+   +-----------------------+
```

---

### 📥 AI Task Prioritization & Study Planner Workflow
```
[ User Inputs Tasks ] ──> [ Click "Generate Study Plan" ]
                                     │
                                     v
                       [ Express Backend Controller ]
                        - Appends Developer instructions
                        - Formulates prompt context
                                     │
                                     v
                          [ Google Gemini LLM ]
                        - Evaluates tasks & due dates
                        - Compiles step-by-step agenda
                                     │
                                     v
                  [ Dynamic Markdown UI Render in Dashboard ]
```

---

### 📝 Notepad-to-Active-Recall Workflow
```
[ User Copies Lecture Notes ] ──> [ Selects Note in Workspace ]
                                               │
                                               ├────────────────────────┐
                                               v                        v
                                    [ Summarize Note ]          [ Assess with Quiz ]
                                               │                        │
                                               v                        v
                                    [ Google Gemini API ]      [ Google Gemini API ]
                                    - Key Bullet Points        - Schema-Structured JSON
                                    - Actionable Takeaways     - Questions, Choices, Keys
                                               │                        │
                                               v                        v
                                    [ Render Key Points ]      [ Render Interactive Quiz ]
                                                               - Instant Feedback
                                                               - Score Tracker
```

---

## 🛠️ 5. Technologies Used

- **Frontend Core**: React 18 with TypeScript (Vite bundler) for high-performance, responsive single-page interactions.
- **Styling & UI**: Tailwind CSS for responsive desktop-first styling paired with sleek custom components.
- **Icons**: Lucide React for consistent, crisp, and high-contrast vector visuals.
- **State & Storage**: Dual-State Architecture. Uses local React state synchronized with browser LocalStorage for immediate, lightning-fast rendering and offline capability, with fallback doc references to Google Firestore database records.

---

## ☁️ 6. Google Technologies Utilized

### 🧠 1. Google Gemini API (via `@google/genai`)
- **Model**: `gemini-2.5-flash`
- **Application**:
  - Automatically assesses academic tasks to assign high, medium, and low urgency priority scores.
  - Generates comprehensive, hour-by-hour structured study plans based on the user's workload.
  - Automatically summarizes raw notebook entries into structured bullet-point takeaways.
  - Evaluates student comprehension by generating interactive, multiple-choice quizzes complete with instant scoring.

### 🗄️ 2. Google Cloud Firestore
- **Application**:
  - Provides cloud database persistence for storing custom Scholar Profiles.
  - Configured with custom database identifiers to guarantee isolated, project-specific environment mapping.

### 🚀 3. Google Cloud Run
- **Application**:
  - Powers the production container hosting both the Vite React bundle assets and the Node.js Express server backend securely.
