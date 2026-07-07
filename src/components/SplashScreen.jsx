import React, { useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/20">
          <span className="text-4xl font-bold text-white">Q</span>
        </div>
        <h1 className="text-2xl font-bold text-white/90">Mock Exam</h1>
        <div className="mt-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    </div>
  );
}