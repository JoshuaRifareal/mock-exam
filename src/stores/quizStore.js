import { create } from 'zustand';

export const useQuizStore = create((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: [],
  isActive: false,
  isComplete: false,
  settings: {
    numQuestions: 10,
    timeLimit: 20,
    focusMode: false,
    distribution: {},
  },
  results: null,
  progressQueue: [], // Add this - stores pending progress updates

  setQuestions: (questions) => set({ questions }),
  setSettings: (settings) => set({ settings }),
  startQuiz: () => set({ 
    isActive: true, 
    currentIndex: 0, 
    answers: [], 
    isComplete: false,
    progressQueue: [], // Reset progress queue
  }),
  endQuiz: (results) => set({ isActive: false, isComplete: true, results }),
  resetQuiz: () => set({
    isActive: false,
    isComplete: false,
    currentIndex: 0,
    answers: [],
    results: null,
    progressQueue: [],
  }),
  answerQuestion: (questionId, selectedOption) => {
    const { answers } = get();
    set({ answers: [...answers, { questionId, selectedOption }] });
  },
  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },
  // Add progress to queue
  queueProgress: (progressItem) => {
    const { progressQueue } = get();
    set({ 
      progressQueue: [...progressQueue, progressItem] 
    });
  },
  // Clear progress queue
  clearProgressQueue: () => set({ progressQueue: [] }),
  // Get progress queue
  getProgressQueue: () => get().progressQueue,
}));