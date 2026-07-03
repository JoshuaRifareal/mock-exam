import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../stores/quizStore';
import { useUserStore } from '../stores/userStore';
import { saveProgressBatch } from '../services/googleSheets';
import { Timer, Info, ArrowLeft, CheckCircle, XCircle, Award } from 'lucide-react';

export default function Quiz() {
  const {
    questions,
    currentIndex,
    answers,
    settings,
    nextQuestion,
    answerQuestion,
    endQuiz,
    resetQuiz,
    queueProgress,
    getProgressQueue,
    clearProgressQueue,
  } = useQuizStore();
  const { user } = useUserStore();
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(settings.timeLimit * 3600);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [questionFontSize, setQuestionFontSize] = useState('2.5rem');
  const questionRef = useRef(null);
  const containerRef = useRef(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Dynamic font sizing for question
  useEffect(() => {
    if (questionRef.current && containerRef.current) {
      const adjustFontSize = () => {
        const containerHeight = containerRef.current.clientHeight;
        const textLength = currentQuestion?.question?.length || 0;
        
        let size = 3.5;
        if (textLength > 100) size = 2.2;
        else if (textLength > 70) size = 2.6;
        else if (textLength > 40) size = 3.0;
        
        const clampedSize = Math.min(size, containerHeight / 10);
        setQuestionFontSize(`${Math.max(clampedSize, 1.5)}rem`);
      };
      
      adjustFontSize();
      window.addEventListener('resize', adjustFontSize);
      return () => window.removeEventListener('resize', adjustFontSize);
    }
  }, [currentQuestion]);

  // Check if any option has long text
  const hasLongOptions = () => {
    if (!currentQuestion) return false;
    const options = [0, 1, 2, 3].map(i => currentQuestion[`option${i + 1}`]).filter(Boolean);
    return options.some(opt => opt.length > 30);
  };

  const shouldUse1x4Grid = hasLongOptions();

  useEffect(() => {
    if (timeRemaining > 0 && !quizResults) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleQuizComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, quizResults]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuizComplete = async () => {
    let correct = 0;
    questions.forEach((q, index) => {
      const answer = answers[index];
      if (answer && answer.selectedOption === q.correctAnswer) {
        correct++;
      }
    });
    
    const results = {
      correct,
      total: totalQuestions,
      accuracy: (correct / totalQuestions) * 100,
      timeTaken: settings.timeLimit * 3600 - timeRemaining,
    };
    setQuizResults(results);
    endQuiz(results);
    
    // Batch save all progress
    const progressQueue = getProgressQueue();
    if (progressQueue.length > 0 && user?.email) {
      try {
        await saveProgressBatch({
          userEmail: user.email,
          progress: progressQueue,
        });
        clearProgressQueue();
      } catch (error) {
        console.error('Failed to save progress batch:', error);
      }
    }
  };

  const handleOptionSelect = async (optionIndex) => {
    if (isAnswered) return;
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    answerQuestion(currentQuestion.id, optionIndex);
    
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    // Queue progress with subject
    queueProgress({
      questionId: currentQuestion.id,
      subject: currentQuestion.subject || '', // Add subject
      isCorrect: isCorrect,
    });
    
    if (currentIndex >= totalQuestions - 1) {
      setTimeout(() => {
        handleQuizComplete();
      }, 400);
    } else {
      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswered(false);
        setShowHint(false);
        nextQuestion();
      }, 400);
    }
  };

  const handleExit = async (shouldSubmit) => {
    setShowExitConfirm(false);
    
    if (shouldSubmit) {
      // Submit progress before exiting
      const progressQueue = getProgressQueue();
      if (progressQueue.length > 0 && user?.email) {
        try {
          await saveProgressBatch({
            userEmail: user.email,
            progress: progressQueue,
          });
          clearProgressQueue();
        } catch (error) {
          console.error('Failed to save progress batch:', error);
        }
      }
    } else {
      // Discard progress - clear queue
      clearProgressQueue();
    }
    
    resetQuiz();
    window.location.href = '/';
  };

  if (quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mx-auto flex items-center justify-center mb-6">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-white/60 mb-6">Great effort! Here's how you did:</p>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/60">Score</span>
              <span className="text-2xl font-bold text-white">{Math.round(quizResults.accuracy)}%</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/60">Correct</span>
              <span className="text-xl font-bold text-green-400">{quizResults.correct}/{quizResults.total}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/60">Time Taken</span>
              <span className="text-xl font-bold text-white">{formatTime(quizResults.timeTaken)}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => { resetQuiz(); window.location.reload(); }}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => { resetQuiz(); window.location.href = '/'; }}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/80 font-semibold hover:bg-white/10 transition-all"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="h-screen-safe bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex-col p-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-shrink-0 px-2 py-2">
          <button
            onClick={() => {
              // Show confirm dialog before exiting
              if (getProgressQueue().length > 0) {
                setShowExitConfirm(true);
              } else {
                resetQuiz();
                window.location.href = '/';
              }
            }}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">
              {currentIndex + 1} / {totalQuestions}
            </span>
            
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${timeRemaining < 60 ? 'text-red-400 timer-pulse' : 'text-white/60'}`} />
              <span className={`text-sm font-medium ${timeRemaining < 60 ? 'text-red-400' : 'text-white/80'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            {currentQuestion.hint && (
              <button
                onClick={() => setShowHint(true)}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white"
              >
                <Info className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar - Thicker */}
        <div className="progress-bar flex-shrink-0 mb-3" style={{ height: '6px' }}>
          <div 
            className="progress-bar-fill"
            style={{ 
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              height: '6px'
            }}
          />
        </div>

        {/* Question Area - 50% with dynamic font */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 min-h-[35vh]"
        >
          <div className="text-center max-w-3xl w-full" ref={questionRef}>
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-medium mb-4">
              {currentQuestion.subject}
            </div>
            <h2 
              className="font-bold text-white leading-tight"
              style={{ 
                fontSize: questionFontSize,
                lineHeight: '1.2',
                maxHeight: '100%',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: '4',
                WebkitBoxOrient: 'vertical',
              }}
            >
              {currentQuestion.question}
            </h2>
            {currentQuestion.image_url && (
              <img
                src={currentQuestion.image_url}
                alt="Question"
                className="max-h-32 w-auto mx-auto mt-4 rounded-xl"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        </div>

        {/* Options Area - 50% - Adaptive Grid */}
        <div className={`flex-1 grid gap-3 min-h-[30vh] pb-2 ${
          shouldUse1x4Grid ? 'grid-cols-1' : 'grid-cols-2'
        }`}>
          {[0, 1, 2, 3].map((index) => {
            const optionText = currentQuestion[`option${index + 1}`];
            if (!optionText) return null;
            
            const isSelected = selectedOption === index;
            const isCorrect = index === currentQuestion.correctAnswer;
            const showFeedback = isAnswered;
            
            let cardClass = "relative rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer border-2 ";
            
            if (showFeedback) {
              if (isCorrect) {
                cardClass += "border-green-500/50 bg-green-500/20";
              } else if (isSelected) {
                cardClass += "border-red-500/50 bg-red-500/20";
              } else {
                cardClass += "border-white/5 bg-white/5";
              }
            } else {
              cardClass += "border-white/5 bg-white/5";
            }
            
            const isLongText = optionText.length > 30;
            
            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswered}
                className={cardClass}
              >
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                  {String.fromCharCode(65 + index)}
                </div>
                <span 
                  className={`font-medium text-white/90 text-center px-2 ${
                    shouldUse1x4Grid ? 'text-base' : 'text-sm'
                  } ${isLongText ? 'text-sm' : ''}`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: shouldUse1x4Grid ? '2' : '3',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {optionText}
                </span>
                {showFeedback && isCorrect && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                )}
                {showFeedback && isSelected && !isCorrect && (
                  <div className="absolute top-2 right-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Hint Modal */}
        {showHint && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => setShowHint(false)}
          >
            <div 
              className="glass-card p-8 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mx-auto flex items-center justify-center mb-4">
                <Info className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">💡 Hint</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {currentQuestion.hint}
              </p>
              <button
                onClick={() => setShowHint(false)}
                className="mt-6 px-6 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="glass-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h4 className="text-l font-bold text-white text-center mb-2">Exit Quiz?</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleExit(true)}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all"
              >
                Submit
              </button>
              <button
                onClick={() => handleExit(false)}
                className="w-full px-4 py-3 rounded-xl bg-red/5 text-white/80 font-semibold hover:bg-white/10 transition-all"
              >
                Discard
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white/40 font-semibold hover:bg-white/5 transition-all text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Add AlertTriangle import
import { AlertTriangle } from 'lucide-react';