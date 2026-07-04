import { create } from 'zustand';

export const useQuizStore = create((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: [],
  isActive: false,
  isComplete: false,
  settings: {
    numQuestions: 10,
    timeLimit: 0.5,
    focusMode: false,
    distribution: {},
  },
  results: null,
  progressQueue: [],
  wrongAnswers: [], // Add this - tracks wrong answers for review

  setQuestions: (questions) => set({ questions }),
  setSettings: (settings) => set({ settings }),
  startQuiz: () => set({ 
    isActive: true, 
    currentIndex: 0, 
    answers: [], 
    isComplete: false,
    results: null,
    progressQueue: [],
    wrongAnswers: [], // Reset wrong answers
  }),
  endQuiz: (results) => {
    set({ 
      isActive: false, 
      isComplete: true, 
      results: results 
    });
  },
  resetQuiz: () => set({
    isActive: false,
    isComplete: false,
    currentIndex: 0,
    answers: [],
    results: null,
    progressQueue: [],
    wrongAnswers: [],
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
  // Add wrong answer to tracking
  addWrongAnswer: (questionId, selectedOption, correctAnswer) => {
    const { wrongAnswers } = get();
    // Check if already tracked
    const exists = wrongAnswers.some(w => w.questionId === questionId);
    if (!exists) {
      set({ 
        wrongAnswers: [...wrongAnswers, { 
          questionId, 
          selectedOption, 
          correctAnswer 
        }] 
      });
    }
  },
  // Get wrong answers with full question data
  getWrongAnswersWithData: () => {
    const { wrongAnswers, questions } = get();
    return wrongAnswers.map(wrong => {
      const question = questions.find(q => q.id === wrong.questionId);
      return {
        ...wrong,
        question: question,
        selectedOptionText: question ? question[`option${wrong.selectedOption + 1}`] : '',
        correctOptionText: question ? question[`option${wrong.correctAnswer + 1}`] : '',
      };
    });
  },
  // Clear wrong answers
  clearWrongAnswers: () => set({ wrongAnswers: [] }),
  // Queue progress
  queueProgress: (progressItem) => {
    const { progressQueue } = get();
    set({ 
      progressQueue: [...progressQueue, progressItem] 
    });
  },
  clearProgressQueue: () => set({ progressQueue: [] }),
  getProgressQueue: () => get().progressQueue,
}));