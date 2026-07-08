import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { Clock, BarChart3, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useQuizStore } from '../stores/quizStore';

export default function ResultsPage({ results, formatTime, resetQuiz, onSaveComplete, onRetrySave }) {
  const { correct, total, accuracy, timeTaken } = results;
  const isMobile = window.innerWidth < 480;
  const ringSize = isMobile ? 120 : 160;
  const strokeWidth = isMobile ? 8 : 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = accuracy / 100;
  const offset = circumference - progress * circumference;

  const [isSaving, setIsSaving] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  let description = '';

  if (accuracy >= 90) {
    description = 'Excellent!';
  } else if (accuracy >= 80) {
    description = 'Great Job!';
  } else if (accuracy >= 70) {
    description = 'Good Work!';
  } else if (accuracy >= 60) {
    description = 'Keep Studying!';
  } else {
    description = 'Practice More!';
  }

  useEffect(() => {
    const saveData = async () => {
      try {
        setIsSaving(true);
        setSaveError(false);
        
        if (onSaveComplete) {
          await onSaveComplete();
        }
        
        setSaveComplete(true);
        setIsSaving(false);
      } catch (error) {
        console.error('Failed to save results:', error);
        setSaveError(true);
        setIsSaving(false);
      }
    };

    saveData();
  }, []);

  const handleRetry = async () => {
    if (onRetrySave) {
      setIsSaving(true);
      setSaveError(false);
      try {
        await onRetrySave();
        setSaveComplete(true);
        setIsSaving(false);
      } catch (error) {
        console.error('Retry failed:', error);
        setSaveError(true);
        setIsSaving(false);
      }
    }
  };

  const handleDiscard = () => {
    sessionStorage.removeItem('reviewWrongAnswers');
    sessionStorage.removeItem('reviewQuestions');
    sessionStorage.removeItem('reviewAnswers');
    sessionStorage.removeItem('reviewResults');
    resetQuiz();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={true}
        numberOfPieces={100}
        colors={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BD6', '#FF9F43', '#A29BFE', '#00D2D3']}
        gravity={0.3}
        wind={0.02}
        friction={0.99}
        initialVelocityX={4}
        initialVelocityY={8}
        tweenDuration={100}
      />

      <div className="glass-card p-8 max-w-md w-full text-center relative z-10 animate-fadeIn">
        {/* Circular Progress Ring */}
        <div className="relative inline-block mb-6">
          <svg
            className="transform -rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="30%" stopColor="#F59E0B" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold text-white ${isMobile ? 'text-4xl' : 'text-6xl'}`}>
              {Math.round(accuracy)}%
            </span>
            <span className={`text-white/40 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {correct}/{total} correct
            </span>
          </div>
        </div>

        <div className="mb-6 animate-slideUp">
          <span className="text-xl font-medium text-white/70">
            {description}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeTaken)}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>{Math.round(accuracy)}% accuracy</span>
          </div>
        </div>

        {/* Save Status Section */}
        <div className="mb-6">
          {isSaving && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-sm text-white/60">Saving your results...</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {saveError && (
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">Failed to save results</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-all text-sm"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm"
                >
                  🗑️ Discard
                </button>
              </div>
            </div>
          )}

          {saveComplete && (
            <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Results saved successfully!</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Hidden until save is complete */}
        {saveComplete && (
          <div className="flex gap-3 animate-fadeIn">
            <button
              onClick={() => {
                const wrongAnswers = useQuizStore.getState().wrongAnswers;
                const questions = useQuizStore.getState().questions;
                const answers = useQuizStore.getState().answers;
                const results = useQuizStore.getState().results;
                
                sessionStorage.setItem('reviewWrongAnswers', JSON.stringify(wrongAnswers));
                sessionStorage.setItem('reviewQuestions', JSON.stringify(questions));
                sessionStorage.setItem('reviewAnswers', JSON.stringify(answers));
                sessionStorage.setItem('reviewResults', JSON.stringify(results));
                
                window.location.href = '/review';
              }}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 text-white font-semibold hover:shadow-lg hover:shadow-purple-700/25 transition-all hover:scale-[1.02]"
            >
              📋 Review
            </button>
            
            <button
              onClick={() => {
                const { resetQuiz, startQuiz, setQuestions, setSettings } = useQuizStore.getState();
                
                resetQuiz();
                
                const questions = useQuizStore.getState().questions;
                const settings = useQuizStore.getState().settings;
                
                if (questions.length === 0) {
                  window.location.href = '/';
                  return;
                }
                
                setQuestions(questions);
                setSettings(settings);
                startQuiz();
                window.location.reload();
              }}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white/80 font-semibold hover:bg-white/20 transition-all hover:scale-[1.02] border border-white/10"
            >
              🏠 Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}