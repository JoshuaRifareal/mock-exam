import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../stores/quizStore';
import { useUserStore } from '../stores/userStore';
import { saveProgressBatch, saveFlags } from '../services/googleSheets';
import { Timer, Info, ArrowLeft, CheckCircle, XCircle, Award, AlertTriangle, Clock, BarChart3, Flag, ZoomIn, ZoomOut, X, Image} from 'lucide-react';
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
    flagQuestion,
    unflagQuestion,
    isQuestionFlagged,
    getFlagComment,
  } = useQuizStore();
  const { user } = useUserStore();
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(settings.timeLimit * 3600);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagComment, setFlagComment] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [questionFontSize, setQuestionFontSize] = useState('2.5rem');
  const questionRef = useRef(null);
  const containerRef = useRef(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

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

  // Load flag comment when modal opens
  useEffect(() => {
    if (showFlagModal && currentQuestion) {
      const comment = getFlagComment(currentQuestion.id);
      setFlagComment(comment || '');
    }
  }, [showFlagModal, currentQuestion]);

  // Reset zoom and position when modal opens/closes
  useEffect(() => {
    if (showImageModal) {
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [showImageModal]);

  // Handle scroll wheel zoom (desktop)
    useEffect(() => {
    const handleWheel = (e) => {
      if (!showImageModal) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setImageZoom(prev => {
        const newZoom = Math.max(0.5, Math.min(3, prev + delta));
        // If zooming out to 1 or less, reset position
        if (newZoom <= 1) {
          setImagePosition({ x: 0, y: 0 });
        }
        return newZoom;
      });
    };

    if (showImageModal) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => window.removeEventListener('wheel', handleWheel);
  }, [showImageModal]);

  // Handle touch pinch and pan (mobile)
  useEffect(() => {
    let initialDistance = 0;
    let initialZoom = 1;
    let initialTouchPosition = { x: 0, y: 0 };
    let lastTouchPosition = { x: 0, y: 0 };
    let isPinching = false;

    const handleTouchStart = (e) => {
      if (!showImageModal) return;
      
      if (e.touches.length === 1) {
        // Single touch = pan
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        setInitialPosition({ x: imagePosition.x, y: imagePosition.y });
      } else if (e.touches.length === 2) {
        // Two touches = pinch
        isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        initialZoom = imageZoom;
        
        // Store the midpoint for zoom center
        initialTouchPosition = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        lastTouchPosition = { ...initialTouchPosition };
      }
    };

    const handleTouchMove = (e) => {
      if (!showImageModal) return;
      
      if (e.touches.length === 1 && isDragging && !isPinching) {
        // Pan with one finger (only when zoomed in)
        if (imageZoom <= 1) {
          setIsDragging(false);
          return;
        }
        
        e.preventDefault();
        const touch = e.touches[0];
        const dx = (touch.clientX - dragStart.x) / imageZoom;
        const dy = (touch.clientY - dragStart.y) / imageZoom;
        
        // Calculate bounds to prevent dragging out of view
        const maxX = (window.innerWidth / 2) / imageZoom;
        const maxY = (window.innerHeight / 2) / imageZoom;
        
        setImagePosition({
          x: Math.max(-maxX, Math.min(maxX, initialPosition.x + dx)),
          y: Math.max(-maxY, Math.min(maxY, initialPosition.y + dy))
        });
      } else if (e.touches.length === 2 && isPinching) {
        // Pinch with two fingers
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        
        const scale = distance / initialDistance;
        let newZoom = Math.max(0.5, Math.min(3, initialZoom * scale));
        
        // If zooming out to 1 or less, reset position
        if (newZoom <= 1) {
          setImagePosition({ x: 0, y: 0 });
        }
        
        setImageZoom(newZoom);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length === 0) {
        setIsDragging(false);
        isPinching = false;
      }
    };

    if (showImageModal) {
      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showImageModal, imageZoom, imagePosition, isDragging]);

  // Dynamic font sizing for question
  useEffect(() => {
    if (questionRef.current && containerRef.current) {
      const adjustFontSize = () => {
        const containerHeight = containerRef.current?.clientHeight || 0;
        const containerWidth = containerRef.current?.clientWidth || 0;
        const textLength = currentQuestion?.question?.length || 0;
        
        if (!containerHeight) return;
        
        let size = 3.0;
        if (textLength > 150) size = 1.2;
        else if (textLength > 130) size = 1.4;
        else if (textLength > 110) size = 1.6;
        else if (textLength > 90) size = 1.8;
        else if (textLength > 70) size = 2.0;
        else if (textLength > 50) size = 2.2;
        else if (textLength > 30) size = 2.5;
        
        if (containerWidth < 480) {
          size = size * 0.8;
        } else if (containerWidth < 768) {
          size = size * 0.9;
        }
        
        const maxSize = containerHeight / 5.5;
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

  const saveQuizData = async () => {
    console.log('💾 Saving quiz data...');
    
    const progressQueue = getProgressQueue();
    if (progressQueue.length > 0 && user?.email) {
      await saveProgressBatch({
        userEmail: user.email,
        progress: progressQueue,
      });
      clearProgressQueue();
      console.log('✅ Progress saved');
    }
    
    const flaggedQuestions = useQuizStore.getState().flaggedQuestions;
    if (flaggedQuestions.length > 0 && user?.email) {
      await saveFlags({
        userEmail: user.email,
        flaggedQuestions: flaggedQuestions,
      });
      console.log('✅ Flags saved');
    }
  };

  const handleQuizComplete = async () => {
    console.log('🔄 Quiz complete function called');
    
    // Store answers in sessionStorage for review
    sessionStorage.setItem('quizAnswers', JSON.stringify(answers));
    sessionStorage.setItem('quizQuestions', JSON.stringify(questions));
    
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
    
    // Store results in sessionStorage
    sessionStorage.setItem('quizResults', JSON.stringify(results));
    
    setQuizResults(results);
    endQuiz(results);
    console.log('✅ Quiz results set');
  };

  const handleOptionSelect = async (optionIndex) => {
    if (isAnswered) return;
    
    console.log('📝 Answering question:', currentIndex + 1, 'of', totalQuestions);
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    answerQuestion(currentQuestion.id, optionIndex);
    
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    console.log('✅ Answer is', isCorrect ? 'correct' : 'wrong');
    
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
      clearProgressQueue();
    }
    
    resetQuiz();
    window.location.href = '/';
  };

  const retrySave = async () => {
    console.log('🔄 Retrying save...');
    await saveQuizData();
  };

  // Use both local and store results
  const displayResults = quizResults || storeResults;
  if (displayResults) {
    console.log('🎉 Rendering results with data:', displayResults);
    
    return (
      <ResultsPage 
        results={displayResults}
        formatTime={formatTime}
        resetQuiz={resetQuiz}
        onSaveComplete={saveQuizData}
        onRetrySave={retrySave}
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

  return (
    <>
      <div className="h-screen-safe bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex-col p-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-shrink-0 px-2 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
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
            
            {/* Flag Button */}
            <button
              onClick={() => setShowFlagModal(true)}
              className={`p-2 rounded-xl transition-colors ${
                isQuestionFlagged(currentQuestion.id) 
                  ? 'text-yellow-400 bg-yellow-400/10' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
          
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

        {/* Progress Bar */}
        <div className="progress-bar flex-shrink-0 mb-3" style={{ height: '6px' }}>
          <div 
            className="progress-bar-fill"
            style={{ 
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              height: '6px'
            }}
          />
        </div>

        {/* Question Area */}
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
            
            {/* View Image Button */}
            {currentQuestion.image_url && currentQuestion.image_url.trim() !== '' && (
              <button
                onClick={() => setShowImageModal(true)}
                className="mt-2 px-3 py-1 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all text-[10px] flex items-center gap-1.5 mx-auto border border-white/5 hover:border-white/10"
              >
                <Image className="w-3.5 h-3.5" />
                View Image
              </button>
            )}
          </div>
        </div>

        {/* Options Area */}
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
              className="p-8 max-w-md w-full text-center rounded-2xl"
              style={{ background: 'rgb(34, 34, 34)' }}
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

      {/* Image Modal - With Pan and Pinch Support */}
      {showImageModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50"
          onClick={() => {
            setShowImageModal(false);
            setImageZoom(1);
            setImagePosition({ x: 0, y: 0 });
          }}
        >
          {/* Back Arrow */}
          <button
            onClick={() => {
              setShowImageModal(false);
              setImageZoom(1);
              setImagePosition({ x: 0, y: 0 });
            }}
            className="absolute top-6 left-6 z-10 p-2.5 rounded-full bg-white/5 hover:bg-white/15 transition-all text-white/60 hover:text-white backdrop-blur-sm border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Image Container */}
          <div 
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentQuestion.image_url}
              alt="Question figure"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none touch-none"
              style={{
                transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                transformOrigin: 'center center',
                touchAction: 'none',
              }}
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          
          {/* Zoom indicator (optional - shows briefly) */}
          {imageZoom !== 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/60 text-xs">
              {Math.round(imageZoom * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setShowFlagModal(false)}
        >
          <div 
            className="p-8 max-w-md w-full rounded-2xl"
            style={{ background: 'rgb(34, 34, 34)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Flag className={`w-7 h-7 ${isQuestionFlagged(currentQuestion.id) ? 'text-yellow-400' : 'text-yellow-400/60'}`} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {isQuestionFlagged(currentQuestion.id) ? 'Edit Flag' : 'Flag Question'}
            </h3>
            <p className="text-sm text-white/40 text-center mb-4">
              Add a comment about this question (optional)
            </p>
            
            <textarea
              value={flagComment}
              onChange={(e) => setFlagComment(e.target.value)}
              placeholder="What's wrong with this question?"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-yellow-400/50 transition-colors"
              rows="3"
            />
            
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => {
                  if (isQuestionFlagged(currentQuestion.id)) {
                    unflagQuestion(currentQuestion.id);
                  } else {
                    flagQuestion(currentQuestion.id, flagComment);
                  }
                  setShowFlagModal(false);
                  setFlagComment('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-semibold hover:shadow-lg hover:shadow-yellow-500/25 transition-all"
              >
                {isQuestionFlagged(currentQuestion.id) ? 'Update Flag' : 'Flag Question'}
              </button>
              
              {isQuestionFlagged(currentQuestion.id) && (
                <button
                  onClick={() => {
                    unflagQuestion(currentQuestion.id);
                    setShowFlagModal(false);
                    setFlagComment('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-red-500/20 text-white font-semibold hover:bg-red-500/30 transition-all"
                >
                  Remove Flag
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagComment('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white/40 font-semibold hover:bg-white/10 transition-all text-sm"
              >
                Cancel
              </button>
            </div>
            
            {isQuestionFlagged(currentQuestion.id) && (
              <div className="mt-3 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                <p className="text-xs text-yellow-400/60 text-center">
                  ⚠️ This question is flagged. The comment will be saved with your report.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="p-8 max-w-md w-full rounded-2xl"
            style={{ background: 'rgb(34, 34, 34)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h4 className="text-xl font-bold text-white text-center mb-2">Exit Quiz?</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleExit(true)}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all"
              >
                Submit
              </button>
              <button
                onClick={() => handleExit(false)}
                className="w-full px-4 py-3 rounded-xl bg-red-500/20 text-white font-semibold hover:bg-red-500/30 transition-all"
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