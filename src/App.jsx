import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { ThemeProvider } from './contexts/ThemeContext';
import MainPage from './components/MainPage';
import Quiz from './components/Quiz';
import ReviewPage from './components/ReviewPage';
import SplashScreen from './components/SplashScreen';
import { useQuizStore } from './stores/quizStore';
import { useUserStore } from './stores/userStore';
import { Sparkles, User } from 'lucide-react';
import './index.css';

function AppContent() {
  const { user, setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  const path = window.location.pathname;
  const isReviewPage = path === '/review';

  // Silent refresh token function
  const refreshToken = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('🔄 Token refreshed successfully');
      
      // Get existing user data
      const existingUser = JSON.parse(localStorage.getItem('quizUser') || '{}');
      
      // Update with new token
      const userData = {
        ...existingUser,
        access_token: response.access_token,
        token_type: response.token_type,
        expires_in: response.expires_in,
        scope: response.scope,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('quizUser', JSON.stringify(userData));
      setUser(userData);
      
      // Refresh user profile (optional)
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        });
        const profile = await profileRes.json();
        const fullUserData = {
          ...userData,
          ...profile,
        };
        localStorage.setItem('quizUser', JSON.stringify(fullUserData));
        setUser(fullUserData);
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    },
    onError: (error) => {
      console.error('Token refresh failed:', error);
      // If refresh fails, force re-login
      localStorage.removeItem('quizUser');
      setUser(null);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    prompt: 'none', // Silent refresh - no UI
  });

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('Login success - full response:', response);
      
      const userData = {
        access_token: response.access_token,
        token_type: response.token_type,
        expires_in: response.expires_in,
        scope: response.scope,
        authuser: response.authuser,
        prompt: response.prompt,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('quizUser', JSON.stringify(userData));
      setUser(userData);
      
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        });
        const profile = await profileRes.json();
        console.log('User profile:', profile);
        
        const fullUserData = {
          ...userData,
          ...profile,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        };
        
        localStorage.setItem('quizUser', JSON.stringify(fullUserData));
        setUser(fullUserData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
      
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Login error:', error);
      setIsLoading(false);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    prompt: 'consent',
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('quizUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log('Restored user:', parsed);
        
        // Check if token is expired or about to expire
        if (parsed.expires_in && parsed.timestamp) {
          const tokenAge = (Date.now() - parsed.timestamp) / 1000; // Age in seconds
          const expiresIn = parsed.expires_in;
          const timeLeft = expiresIn - tokenAge;
          
          console.log(`⏱️ Token expires in ${Math.round(timeLeft / 60)} minutes`);
          
          // If token has less than 5 minutes left, refresh it
          if (timeLeft < 300) {
            console.log('🔄 Token expiring soon, refreshing...');
            refreshToken();
          }
        }
        
        setUser(parsed);
      } catch (e) {
        console.error('Error restoring user:', e);
        localStorage.removeItem('quizUser');
      }
    }
  }, []);

  // Auto-refresh token periodically
  useEffect(() => {
    if (!user) return;
    
    // Check token every minute
    const interval = setInterval(() => {
      const savedUser = localStorage.getItem('quizUser');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.expires_in && parsed.timestamp) {
            const tokenAge = (Date.now() - parsed.timestamp) / 1000;
            const expiresIn = parsed.expires_in;
            const timeLeft = expiresIn - tokenAge;
            
            // If token has less than 5 minutes left, refresh it
            if (timeLeft < 300) {
              console.log('🔄 Token expiring soon, refreshing...');
              refreshToken();
            }
          }
        } catch (e) {
          console.error('Error checking token:', e);
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [user]);

  // Subscribe to quiz state changes
  useEffect(() => {
    const unsubscribe = useQuizStore.subscribe((state) => {
      console.log('📊 Quiz state changed:', { 
        isActive: state.isActive, 
        isComplete: state.isComplete 
      });
      setShowQuiz(state.isActive || state.isComplete);
    });
    return unsubscribe;
  }, []);

  // Check initial state on mount
  const initialStore = useQuizStore.getState();
  const isQuizActive = initialStore.isActive || initialStore.isComplete;

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
      </div>
    );
  }

  // Review page - always render if on /review
  if (isReviewPage) {
    return <ReviewPage />;
  }

  // Quiz active - check both initial and subscription state
  if (isQuizActive || showQuiz) {
    return <Quiz />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Mock Exam
            </h1>
            <p className="text-sm text-white/40 mt-2">
              Master your subjects with adaptive quizzes
            </p>
          </div>

          <div className="glass-card p-6 text-center">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-white/60 text-sm">
                Sign in to access your quizzes and track your progress
              </p>
            </div>
            
            <button
              onClick={() => login()}
              className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl px-6 py-3 transition-all hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">Sign in with Google</span>
            </button>
            
            <p className="text-xs text-white/20 mt-4">
              Secure • Free • No credit card required
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <MainPage />;
}

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  console.log('App starting with clientId:', clientId ? 'present' : 'missing');
  
  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-destructive">Configuration Error</h2>
          <p className="mt-2 text-destructive/90">
            Missing Google Client ID. Please set VITE_GOOGLE_CLIENT_ID in your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;