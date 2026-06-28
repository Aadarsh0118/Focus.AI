/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string; // ISO date format YYYY-MM-DD
  completed: boolean;
  estimatedPomodoros: number;
  actualPomodoros: number;
  aiRecommendation?: string;
  isAiSuggested?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  summary?: string;
}

export interface PomodoroSession {
  id: string;
  taskTitle?: string;
  durationMinutes: number;
  completedAt: string;
}
