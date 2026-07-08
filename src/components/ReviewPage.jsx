import React, { useState } from 'react';
import { useQuizStore } from '../stores/quizStore';
import { ArrowLeft, XCircle, CheckCircle, Lightbulb, Clock } from 'lucide-react';

export default function ReviewPage({ onClose }) {
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Try to get from store first
  let wrongAnswers = useQuizStore((state) => state.wrongAnswers);
  let questions = useQuizStore((state) => state.questions);
  let answers = useQuizStore((state) => state.answers);
  let results = useQuizStore((state) => state.results);
  
  // Try sessionStorage - check all possible sources
  const savedWrong = sessionStorage.getItem('reviewWrongAnswers');
  const savedQuestions = sessionStorage.getItem('reviewQuestions');
  const savedAnswers = sessionStorage.getItem('reviewAnswers');
  const savedResults = sessionStorage.getItem('reviewResults');
  const quizAnswers = sessionStorage.getItem('quizAnswers');
  const quizQuestions = sessionStorage.getItem('quizQuestions');
  
  // Load answers from sessionStorage with priority
  if (savedAnswers) {
    const parsed = JSON.parse(savedAnswers);
    if (parsed.length > 0) {
      answers = parsed;
    }
  }
  
  if (answers.length === 0 && quizAnswers) {
    answers = JSON.parse(quizAnswers);
  }
  
  // Load questions from sessionStorage
  if (savedQuestions) {
    const parsed = JSON.parse(savedQuestions);
    if (parsed.length > 0) {
      questions = parsed;
    }
  }
  
  if (questions.length === 0 && quizQuestions) {
    questions = JSON.parse(quizQuestions);
  }
  
  // Load wrong answers
  if (savedWrong) {
    const parsed = JSON.parse(savedWrong);
    if (parsed.length > 0) {
      wrongAnswers = parsed;
    }
  }
  
  // Load results
  if (savedResults) {
    results = JSON.parse(savedResults);
  }

  // Build review data from the stored answers
  const reviewData = questions.map((q) => {
    const userAnswer = answers.find(a => a.questionId === q.id);
    
    const isAnswered = !!userAnswer;
    const isWrong = userAnswer && userAnswer.selectedOption !== q.correctAnswer;
    const isCorrect = userAnswer && userAnswer.selectedOption === q.correctAnswer;
    const isUnanswered = !isAnswered;
    
    const selectedOption = userAnswer ? userAnswer.selectedOption : null;
    
    return {
      ...q,
      selectedOption,
      isAnswered,
      isCorrect,
      isWrong,
      isUnanswered,
      selectedOptionText: selectedOption !== null ? q[`option${selectedOption + 1}`] : 'Not answered',
      correctOptionText: q[`option${q.correctAnswer + 1}`],
    };
  });

  const totalQuestions = reviewData.length;
  const correctCount = reviewData.filter(item => item.isCorrect).length;
  const wrongCount = reviewData.filter(item => item.isWrong).length;
  const unansweredCount = reviewData.filter(item => item.isUnanswered).length;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const timeTaken = results?.timeTaken || 0;

  // Force navigation to main page - clean full reload
  const goToHome = () => {
    // Set navigating state to prevent error screen flash
    setIsNavigating(true);
    
    // Clear all sessionStorage
    sessionStorage.removeItem('reviewWrongAnswers');
    sessionStorage.removeItem('reviewQuestions');
    sessionStorage.removeItem('reviewAnswers');
    sessionStorage.removeItem('reviewResults');
    sessionStorage.removeItem('quizAnswers');
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizResults');
    sessionStorage.removeItem('autoStartQuiz');
    
    // Reset quiz store
    const { resetQuiz } = useQuizStore.getState();
    resetQuiz();
    
    // Full page reload to main page
    window.location.href = '/';
  };

  // If navigating, show nothing (prevents flash)
  if (isNavigating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
    );
  }

  // If no data, show error
  if (answers.length === 0 || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white/90 mb-2">No Review Data</h2>
          <p className="text-white/40 text-sm">
            No answer data found. Please complete a quiz first.
          </p>
          <button
            onClick={goToHome}
            className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 text-white font-semibold hover:shadow-lg hover:shadow-purple-700/25 transition-all"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <button
          onClick={goToHome}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white flex items-center gap-2 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-white/90">Review</h1>
          <span className="text-sm text-white/40">
            Score: {correctCount}/{totalQuestions}
          </span>
        </div>
        
        <div className="w-20 flex-shrink-0" />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{correctCount}</div>
          <div className="text-xs text-white/40">Correct</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{wrongCount}</div>
          <div className="text-xs text-white/40">Wrong</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-white/40">{unansweredCount}</div>
          <div className="text-xs text-white/40">Unanswered</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {reviewData.map((item, index) => {
          const isCorrect = item.isCorrect;
          const isWrong = item.isWrong;
          const isUnanswered = item.isUnanswered;
          
          let statusIcon = null;
          let statusColor = '';
          
          if (isCorrect) {
            statusIcon = <CheckCircle className="w-5 h-5 text-green-400" />;
            statusColor = 'border-green-500/30';
          } else if (isWrong) {
            statusIcon = <XCircle className="w-5 h-5 text-red-400" />;
            statusColor = 'border-red-500/30';
          } else {
            statusIcon = <div className="w-5 h-5 rounded-full border-2 border-white/20" />;
            statusColor = 'border-white/10';
          }

          return (
            <div key={index} className={`glass-card p-5 border-l-4 ${statusColor}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {statusIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-white/30">#{index + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                      {item.subject || 'General'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white/90 mb-3">
                    {item.question}
                  </p>
                  
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">Your answer:</span>
                      <span className={`font-medium ${isCorrect ? 'text-green-400' : isWrong ? 'text-red-400' : 'text-white/30'}`}>
                        {item.selectedOptionText || '—'}
                      </span>
                    </div>
                    {isWrong && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-xs">Correct answer:</span>
                        <span className="text-green-400 font-medium">
                          {item.correctOptionText}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.hint && item.hint.trim() !== '' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-yellow-400/60 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-white/40 italic">
                          {item.hint}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions - Only Home button */}
      <div className="mt-6">
        <button
          onClick={goToHome}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 text-white font-semibold hover:shadow-lg hover:shadow-purple-700/25 transition-all hover:scale-[1.02]"
        >
          Home
        </button>
      </div>
    </div>
  );
}