import React from 'react';
import Confetti from 'react-confetti';
import { Clock, BarChart3 } from 'lucide-react';
import { useQuizStore } from '../stores/quizStore';

export default function ResultsPage({ results, formatTime, resetQuiz }) {
  const { correct, total, accuracy, timeTaken } = results;
  const isMobile = window.innerWidth < 480;
  const ringSize = isMobile ? 120 : 160; // Bigger ring
  const strokeWidth = isMobile ? 8 : 10; // Thicker stroke
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = accuracy / 100;
  const offset = circumference - progress * circumference;

  // Determine score description (smaller, no emoji, no gradient)
  let description = '';
  let gradientColors = '';

  if (accuracy >= 90) {
    description = 'Excellent!';
    gradientColors = '#34D399 to #059669'; // Green
  } else if (accuracy >= 80) {
    description = 'Great Job!';
    gradientColors = '#60A5FA to #3B82F6'; // Blue
  } else if (accuracy >= 70) {
    description = 'Good Work!';
    gradientColors = '#FBBF24 to #F59E0B'; // Yellow
  } else if (accuracy >= 60) {
    description = 'Keep Studying!';
    gradientColors = '#F59E0B to #D97706'; // Orange
  } else {
    description = 'Practice More!';
    gradientColors = '#EF4444 to #DC2626'; // Red
  }

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
        {/* Circular Progress Ring - Bigger */}
        <div className="relative inline-block mb-6">
          <svg
            className="transform -rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            {/* Background circle */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle with color based on score */}
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
                {/* Red → Yellow → Green based on score */}
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="30%" stopColor="#F59E0B" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>

          {/* Score in center of ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold text-white ${isMobile ? 'text-4xl' : 'text-6xl'}`}>
              {Math.round(accuracy)}%
            </span>
            <span className={`text-white/40 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {correct}/{total} correct
            </span>
          </div>
        </div>

        {/* Description - Smaller, no emoji, no gradient */}
        <div className="mb-6 animate-slideUp">
          <span className="text-xl font-medium text-white/70">
            {description}
          </span>
        </div>

        {/* Stats Row */}
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

        {/* Buttons */}
        <div className="flex gap-3">
            <button
                onClick={() => { 
                // Get wrong answers, questions, answers, and results from store
                const wrongAnswers = useQuizStore.getState().wrongAnswers;
                const questions = useQuizStore.getState().questions;
                const answers = useQuizStore.getState().answers;
                const results = useQuizStore.getState().results;
                
                // Store in sessionStorage before navigating
                sessionStorage.setItem('reviewWrongAnswers', JSON.stringify(wrongAnswers));
                sessionStorage.setItem('reviewQuestions', JSON.stringify(questions));
                sessionStorage.setItem('reviewAnswers', JSON.stringify(answers));
                sessionStorage.setItem('reviewResults', JSON.stringify(results));
                
                console.log('📤 Storing for review:', { wrongAnswers, questions, answers, results });
                
                window.location.href = '/review'; 
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 text-white font-semibold hover:shadow-lg hover:shadow-purple-700/25 transition-all hover:scale-[1.02]"
            >
                Review
            </button>

            <button
                onClick={() => { 
                // Get the quiz store actions
                const { resetQuiz, startQuiz, setQuestions, setSettings } = useQuizStore.getState();
                
                // Reset and start quiz immediately
                resetQuiz();
                
                // Get current questions and settings from session or store
                const questions = useQuizStore.getState().questions;
                const settings = useQuizStore.getState().settings;
                
                // If questions are empty, we need to reload from main
                if (questions.length === 0) {
                    window.location.href = '/';
                    return;
                }
                
                // Start the quiz with current questions and settings
                setQuestions(questions);
                setSettings(settings);
                startQuiz();
                
                // Force a re-render by reloading (but now quiz will start)
                window.location.reload();
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white/80 font-semibold hover:bg-white/20 transition-all hover:scale-[1.02] border border-white/10"
            >
                Home
            </button>
        </div>

      </div>
    </div>
  );
}