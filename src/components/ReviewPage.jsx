import React from 'react';
import { useQuizStore } from '../stores/quizStore';
import { ArrowLeft, XCircle, CheckCircle, Lightbulb, Clock } from 'lucide-react';

export default function ReviewPage({ onClose }) {
  // Try to get from store first
  let wrongAnswers = useQuizStore((state) => state.wrongAnswers);
  let questions = useQuizStore((state) => state.questions);
  let answers = useQuizStore((state) => state.answers);
  let results = useQuizStore((state) => state.results);
  
  // If store is empty, try sessionStorage
  if (wrongAnswers.length === 0 || questions.length === 0) {
    const savedWrong = sessionStorage.getItem('reviewWrongAnswers');
    const savedQuestions = sessionStorage.getItem('reviewQuestions');
    const savedAnswers = sessionStorage.getItem('reviewAnswers');
    const savedResults = sessionStorage.getItem('reviewResults');
    
    if (savedWrong) {
      wrongAnswers = JSON.parse(savedWrong);
    }
    if (savedQuestions) {
      questions = JSON.parse(savedQuestions);
    }
    if (savedAnswers) {
      answers = JSON.parse(savedAnswers);
    }
    if (savedResults) {
      results = JSON.parse(savedResults);
    }
  }

  // Build complete review data with all questions
  const reviewData = questions.map((q) => {
    const userAnswer = answers.find(a => a.questionId === q.id);
    const isWrong = wrongAnswers.some(w => w.questionId === q.id);
    const selectedOption = userAnswer ? userAnswer.selectedOption : null;
    const isCorrect = !isWrong && selectedOption !== null;
    
    return {
      ...q,
      selectedOption,
      isCorrect,
      isWrong,
      selectedOptionText: selectedOption !== null ? q[`option${selectedOption + 1}`] : 'Not answered',
      correctOptionText: q[`option${q.correctAnswer + 1}`],
    };
  });

  const totalQuestions = reviewData.length;
  const correctCount = reviewData.filter(item => item.isCorrect).length;
  const wrongCount = reviewData.filter(item => item.isWrong).length;

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const timeTaken = results?.timeTaken || 0;

  const handleClose = () => {
    sessionStorage.removeItem('reviewWrongAnswers');
    sessionStorage.removeItem('reviewQuestions');
    sessionStorage.removeItem('reviewAnswers');
    sessionStorage.removeItem('reviewResults');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
      {/* Header - Centered properly */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <button
          onClick={handleClose}
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
        
        <div className="w-20 flex-shrink-0" /> {/* Spacer to balance */}
      </div>

      {/* Stats Summary - 3 cards: Correct, Wrong, Time */}
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
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-lg font-bold text-white/80">{formatTime(timeTaken)}</span>
          </div>
          <div className="text-xs text-white/40">Time Taken</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {reviewData.map((item, index) => {
          const isCorrect = item.isCorrect;
          const isWrong = item.isWrong;
          const isUnanswered = item.selectedOption === null;
          
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
                  
                  {/* Answer Section */}
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

                  {/* Hint Section */}
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

        {/* Bottom Actions */}
        <div className="mt-6 flex gap-3">
            <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 text-white font-semibold hover:shadow-lg hover:shadow-purple-700/25 transition-all hover:scale-[1.02]"
            >
                Home
            </button>
        </div>
    </div>
  );
}