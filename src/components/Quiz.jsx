import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../stores/quizStore';
import { useUserStore } from '../stores/userStore';
import { saveProgressBatch } from '../services/googleSheets';
import { Timer, Info, ArrowLeft, CheckCircle, XCircle, Award, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import ResultsPage from './ResultsPage';

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
    addWrongAnswer,
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

  // Subscribe to store results
  const storeResults = useQuizStore((state) => state.results);

  // Sync store results with local state
  useEffect(() => {
    if (storeResults) {
      console.log('📦 Store results detected:', storeResults);
      setQuizResults(storeResults);
    }
  }, [storeResults]);

  // Dynamic font sizing for question
  useEffect(() => {
    if (questionRef.current && containerRef.current) {
      const adjustFontSize = () => {
        const containerHeight = containerRef.current?.clientHeight || 0;
        const containerWidth = containerRef.current?.clientWidth || 0;
        const textLength = currentQuestion?.question?.length || 0;
        
        // Skip if container is not available
        if (!containerHeight) return;
        
        // More aggressive sizing
        let size = 3.0; // rem
        if (textLength > 150) size = 1.2;
        else if (textLength > 130) size = 1.4;
        else if (textLength > 110) size = 1.6;
        else if (textLength > 90) size = 1.8;
        else if (textLength > 70) size = 2.0;
        else if (textLength > 50) size = 2.2;
        else if (textLength > 30) size = 2.5;
        
        // Mobile adjustment
        if (containerWidth < 480) {
          size = size * 0.8;
        } else if (containerWidth < 768) {
          size = size * 0.9;
        }
        
        // Calculate max size based on container height
        const maxSize = containerHeight / 5.5;
        
        // Clamp with a lower minimum for mobile
        let minSize = 1.0;
        if (containerWidth < 480) {
          minSize = 0.8;
        }
        
        const clampedSize = Math.min(size, maxSize);
        setQuestionFontSize(`${Math.max(clampedSize, minSize)}rem`);
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
    console.log('🔄 Quiz complete function called');
    
    let correct = 0;
    questions.forEach((q, index) => {
      const answer = answers[index];
      if (answer && answer.selectedOption === q.correctAnswer) {
        correct++;
      }
    });
    
    console.log('✅ Correct answers:', correct, 'out of', totalQuestions);
    
    const results = {
      correct,
      total: totalQuestions,
      accuracy: (correct / totalQuestions) * 100,
      timeTaken: settings.timeLimit * 3600 - timeRemaining,
    };
    
    console.log('📊 Results object:', results);
    
    setQuizResults(results);
    endQuiz(results);
    console.log('✅ Quiz results set');
    
    // Batch save all progress
    const progressQueue = getProgressQueue();
    if (progressQueue.length > 0 && user?.email) {
      try {
        await saveProgressBatch({
          userEmail: user.email,
          progress: progressQueue,
        });
        clearProgressQueue();
        console.log('✅ Progress saved');
      } catch (error) {
        console.error('Failed to save progress batch:', error);
      }
    }
  };

  const handleOptionSelect = async (optionIndex) => {
    if (isAnswered) return;
    
    console.log('📝 Answering question:', currentIndex + 1, 'of', totalQuestions);
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    answerQuestion(currentQuestion.id, optionIndex);
    
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    console.log('✅ Answer is', isCorrect ? 'correct' : 'wrong');
    
    // Track wrong answers for review
    if (!isCorrect) {
      addWrongAnswer(currentQuestion.id, optionIndex, currentQuestion.correctAnswer);
      console.log('❌ Wrong answer tracked:', {
        questionId: currentQuestion.id,
        selectedOption: optionIndex,
        correctAnswer: currentQuestion.correctAnswer,
        questionText: currentQuestion.question
      });
    } else {
      console.log('✅ Correct answer, not tracking');
    }
    
    // Queue progress with subject
    queueProgress({
      questionId: currentQuestion.id,
      subject: currentQuestion.subject || '',
      isCorrect: isCorrect,
    });
    
    if (currentIndex >= totalQuestions - 1) {
      console.log('🏁 Last question answered, completing quiz...');
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

  // Use both local and store results
  const displayResults = quizResults || storeResults;
  if (displayResults) {
    console.log('🎉 Rendering results with data:', displayResults);
    
    const { correct, total, accuracy, timeTaken } = displayResults;
    const isMobile = window.innerWidth < 480;
    const ringSize = isMobile ? 100 : 140;
    const strokeWidth = isMobile ? 6 : 8;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = accuracy / 100;
    const offset = circumference - progress * circumference;

    // Determine score description
    let description = '';
    let gradient = '';

    if (accuracy >= 90) {
      description = 'Excellent!';
      gradient = 'from-green-500 to-emerald-400';
    } else if (accuracy >= 80) {
      description = 'Great Job!';
      gradient = 'from-blue-500 to-purple-400';
    } else if (accuracy >= 70) {
      description = 'Good Work!';
      gradient = 'from-green-400 to-blue-400';
    } else if (accuracy >= 60) {
      description = 'Keep Studying!';
      gradient = 'from-yellow-500 to-amber-400';
    } else {
      description = 'Practice More!';
      gradient = 'from-orange-500 to-red-400';
    }

    return (
      <ResultsPage 
        results={displayResults}
        formatTime={formatTime}
        resetQuiz={resetQuiz}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  // If no current question and no results, show loading
  if (!currentQuestion && !displayResults) {
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
          className="flex-1 flex items-center justify-center p-4 min-h-[25vh]"
        >
          <div className="text-center max-w-3xl w-full px-2" ref={questionRef}>
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-medium mb-3">
              {currentQuestion.subject}
            </div>
            <h2 
              className="font-bold text-white leading-tight"
              style={{ 
                fontSize: questionFontSize,
                lineHeight: '1.3',
                maxHeight: '100%',
                overflow: 'hidden',
                wordBreak: 'break-word',
                hyphens: 'auto',
                overflowWrap: 'break-word',
              }}
            >
              {currentQuestion.question}
            </h2>
            {currentQuestion.image_url && (
              <img
                src={currentQuestion.image_url}
                alt="Question"
                className="max-h-24 w-auto mx-auto mt-3 rounded-xl"
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