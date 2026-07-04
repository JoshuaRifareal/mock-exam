import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useQuizStore } from '../stores/quizStore';
import { useUserStore } from '../stores/userStore';
import { useTheme } from '../contexts/ThemeContext';
import { fetchQuestions, fetchUserProgress } from '../services/googleSheets';
import { 
  User, Sun, Moon, LogOut, 
  Layers, Clock, Target, Zap,
  Award, TrendingUp, BookOpen,
  Sparkles, BarChart3, ChevronDown,
  Database, CheckCircle2, AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function MainPage() {
  const { user, logout } = useUserStore();
  const { isDark, toggle } = useTheme();
  const { setQuestions, setSettings, startQuiz } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [settings, setSettingsLocal] = useState({
    numQuestions: 10,
    timeLimit: 0.5,
    focusMode: false,
    distribution: {
      'Sanitation, Plumbing Design, and Installation': 40,
      'Practical Problems and Experiences': 40,
      'Plumbing Arithmetic': 10,
      'Plumbing Code': 10,
    },
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const questions = await fetchQuestions();
      setAllQuestions(questions);
      
      if (user?.email) {
        const progress = await fetchUserProgress(user.email);
        setUserProgress(progress);
        calculateStats(questions, progress);
      }
      
      // Get subjects that actually exist in the questions - filter out empty/blank
      const availableSubjects = [...new Set(
        questions
          .map(q => q.subject)
          .filter(subject => subject && subject.trim() !== '') // Only non-empty subjects
      )];
      
      // Define the default distribution values for when subjects exist
      const defaultDistribution = {
        'Sanitation, Plumbing Design, and Installation': 40,
        'Practical Problems and Experiences': 40,
        'Plumbing Arithmetic': 10,
        'Plumbing Code': 10,
      };
      
      // Only include subjects that exist in the questions
      const distribution = {};
      let total = 0;
      
      // Add default subjects if they exist in questions
      availableSubjects.forEach(subject => {
        if (defaultDistribution[subject] !== undefined) {
          distribution[subject] = defaultDistribution[subject];
          total += defaultDistribution[subject];
        }
      });
      
      // Handle any remaining subjects not in default
      const remainingSubjects = availableSubjects.filter(s => !distribution[s]);
      if (remainingSubjects.length > 0) {
        const remainingPercent = 100 - total;
        const perSubject = remainingPercent / remainingSubjects.length;
        remainingSubjects.forEach(subject => {
          distribution[subject] = Math.round(perSubject);
        });
      }
      
      // If no subjects at all, show empty distribution
      if (Object.keys(distribution).length === 0) {
        setSettingsLocal(prev => ({ ...prev, distribution: {} }));
      } else {
        // Ensure total is 100%
        const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
        if (currentTotal !== 100) {
          const factor = 100 / currentTotal;
          Object.keys(distribution).forEach(key => {
            distribution[key] = Math.round(distribution[key] * factor);
          });
        }
        
        setSettingsLocal(prev => ({ ...prev, distribution }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  const reLogin = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('Re-login success:', response);
      
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
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        };
        
        localStorage.setItem('quizUser', JSON.stringify(fullUserData));
        setUser(fullUserData);
        await loadData(); // Make sure this is called
        setShowUserMenu(false);
        
      } catch (error) {
        console.error('Error fetching profile during re-login:', error);
      }
    },
    onError: (error) => {
      console.error('Re-login error:', error);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    prompt: 'consent',
  });

  const calculateStats = (questions, progress) => {
    const totalAttempts = progress.length;
    const correctAttempts = progress.filter(p => p.correct > 0).length;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
    
    // Only count subjects that have non-empty values
    const subjects = [...new Set(
      questions
        .map(q => q.subject)
        .filter(subject => subject && subject.trim() !== '')
    )];
    
    setStats({
      totalAttempts,
      correctAttempts,
      accuracy,
      totalQuestions: questions.length,
      subjects: subjects.length,
    });
  };

  // Calculate subject performance
  const getSubjectPerformance = () => {
    if (!allQuestions.length || !userProgress.length) return [];
    
    // Get unique subjects from questions (filter out empty)
    const subjects = [...new Set(
      allQuestions
        .map(q => q.subject)
        .filter(s => s && s.trim() !== '')
    )];
    
    // Calculate performance per subject
    return subjects.map(subject => {
      const subjectQuestions = allQuestions.filter(q => q.subject === subject);
      const subjectProgress = userProgress.filter(p => 
        subjectQuestions.some(q => q.id === p.questionId)
      );
      
      const attempted = subjectProgress.length;
      const correct = subjectProgress.filter(p => p.correct > 0).length;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      
      return {
        name: subject,
        attempted,
        correct,
        accuracy,
      };
    }).sort((a, b) => b.accuracy - a.accuracy); // Sort by accuracy descending
  };

  const handleStartQuiz = () => {
    if (allQuestions.length === 0) return;
    
    // Ensure numQuestions doesn't exceed available questions
    let validatedSettings = { ...settings };
    if (settings.numQuestions > allQuestions.length) {
      validatedSettings.numQuestions = allQuestions.length;
      setSettingsLocal(validatedSettings);
    }
    
    const selectedQuestions = selectQuestions(allQuestions, validatedSettings);
    setQuestions(selectedQuestions);
    setSettings(validatedSettings);
    startQuiz();
  };

  const selectQuestions = (questions, settings) => {
    let { numQuestions, distribution } = settings;
  
    // Cap numQuestions to available questions to avoid exceeding
    if (numQuestions > questions.length) {
      numQuestions = questions.length;
    }

    const subjects = {};
    questions.forEach(q => {
      if (!subjects[q.subject]) subjects[q.subject] = [];
      subjects[q.subject].push(q);
    });
    
    const perSubject = {};
    let remaining = numQuestions;
    Object.keys(distribution).forEach(subject => {
      const count = Math.round((distribution[subject] / 100) * numQuestions);
      const available = subjects[subject]?.length || 0;
      perSubject[subject] = Math.min(count, available);
      remaining -= perSubject[subject];
    });
    
    if (remaining > 0) {
      const subjectsList = Object.keys(perSubject);
      let i = 0;
      while (remaining > 0 && subjectsList.length > 0) {
        const subject = subjectsList[i % subjectsList.length];
        if (perSubject[subject] < (subjects[subject]?.length || 0)) {
          perSubject[subject]++;
          remaining--;
        }
        i++;
      }
    }
    
    let selected = [];
    Object.keys(perSubject).forEach(subject => {
      const available = subjects[subject] || [];
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const count = Math.min(perSubject[subject], shuffled.length);
      selected = [...selected, ...shuffled.slice(0, count)];
    });
    
    return selected.sort(() => Math.random() - 0.5);
  };

  const handleDistributionChange = (subject, value) => {
    const newDistribution = { ...settings.distribution, [subject]: value };
    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const factor = 100 / total;
      Object.keys(newDistribution).forEach(key => {
        newDistribution[key] = Math.round(newDistribution[key] * factor);
      });
    }
    setSettingsLocal({ ...settings, distribution: newDistribution });
  };

  // Reset distribution to default values
  const resetDistribution = () => {
    // Get subjects that exist in the questions
    const availableSubjects = [...new Set(
      allQuestions
        .map(q => q.subject)
        .filter(subject => subject && subject.trim() !== '')
    )];
    
    // Define the default distribution values
    const defaultDistribution = {
      'Sanitation, Plumbing Design, and Installation': 40,
      'Practical Problems and Experiences': 40,
      'Plumbing Arithmetic': 10,
      'Plumbing Code': 10,
    };
    
    // Only include subjects that exist in the questions
    const distribution = {};
    let total = 0;
    
    // Add default subjects if they exist in questions
    availableSubjects.forEach(subject => {
      if (defaultDistribution[subject] !== undefined) {
        distribution[subject] = defaultDistribution[subject];
        total += defaultDistribution[subject];
      }
    });
    
    // Handle any remaining subjects not in default
    const remainingSubjects = availableSubjects.filter(s => !distribution[s]);
    if (remainingSubjects.length > 0) {
      const remainingPercent = 100 - total;
      const perSubject = remainingPercent / remainingSubjects.length;
      remainingSubjects.forEach(subject => {
        distribution[subject] = Math.round(perSubject);
      });
    }
    
    // Ensure total is 100%
    if (Object.keys(distribution).length > 0) {
      const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
      if (currentTotal !== 100) {
        const factor = 100 / currentTotal;
        Object.keys(distribution).forEach(key => {
          distribution[key] = Math.round(distribution[key] * factor);
        });
      }
    }
    
    setSettingsLocal(prev => ({ ...prev, distribution }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const isRealData = allQuestions.length > 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header - Glass */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/5 bg-neutral-900/95 backdrop-blur-none">
        <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white/90">MPLE 2026</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full ring-2 ring-white/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              {/* Status Indicator */}
              <div className="relative">
                {!isRealData && (
                  <div className="inline w-3 h-3 animate-pulse">
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 glass-card user-dropdown p-2 z-50">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-sm font-medium text-white/90">{user?.name || 'User'}</p>
                    <p className="text-xs text-white/40 truncate">{user?.email}</p>
                  </div>
                  <div className="px-3 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Database className="w-3.5 h-3.5" />
                      <span>Data: {isRealData ? 'Google Sheets' : 'Mock'}</span>
                      {isRealData ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 ml-auto" />
                      )}
                    </div>
                    {!isRealData && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400/80">
                          ⚠️ Using mock data. Click "Reconnect" to refresh connection.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { 
                      if (!isRealData) {
                        // Clear old token and trigger re-login
                        localStorage.removeItem('quizUser');
                        reLogin();
                      }
                      setShowUserMenu(false);
                    }}
                    className={`w-full mt-1 px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors ${
                      !isRealData 
                        ? 'text-amber-400 hover:bg-amber-500/10' 
                        : 'text-green-400 hover:bg-green-500/10 cursor-default opacity-50'
                    }`}
                  >
                    {!isRealData ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Reconnect to Sheets
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Connected
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Bento Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Row - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Stat Cards */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/40">Questions</p>
                <p className="text-2xl font-bold text-white">{allQuestions.length}</p>
              </div>
              <div className="ml-auto w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white/40">Passing rate</p>
                <p className="text-2xl font-bold text-white">{Math.round(stats?.accuracy || 0)}%</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/40">Subjects</p>
                <p className="text-2xl font-bold text-white">{stats?.subjects || 0}</p>
              </div>
              <div className="ml-auto w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-white/40">Attempted</p>
                <p className="text-2xl font-bold text-white">{stats?.totalAttempts || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance Card */}
        <div className="glass-card p-5 mb-4">
          <h2 className="text-base font-bold text-white/90 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Subject Performance
          </h2>
          <div className="space-y-3">
            {allQuestions.length > 0 && userProgress.length > 0 ? (
              <>
                {getSubjectPerformance().map((subject) => (
                  <div key={subject.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70 truncate flex-1 mr-4">
                        {subject.name}
                      </span>
                      <span className="text-sm font-bold text-white flex-shrink-0">
                        {subject.accuracy}%
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            subject.accuracy >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                            subject.accuracy >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                            'bg-gradient-to-r from-red-500 to-rose-400'
                          }`}
                          style={{ 
                            width: `${Math.min(subject.accuracy, 100)}%`,
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-white/30">
                        {subject.correct}/{subject.attempted} attempts
                      </span>
                      <span className="text-[10px] text-white/20">
                        {subject.accuracy >= 70 ? '🟢' :
                        subject.accuracy >= 50 ? '🟡' :
                        '🔴'}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-white/40 text-sm py-6">
                <p>No performance data yet.</p>
                <p className="text-xs mt-1">Start a quiz to track your progress!</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Settings - Bento Large */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Quiz Settings */}
          <div className="glass-card p-6 md:col-span-3">
            <h2 className="text-lg font-bold text-white/90 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quiz Settings
            </h2>

            {/* Questions Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/60 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Questions
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{settings.numQuestions} items</span>
                  {allQuestions.length > 0 && settings.numQuestions > allQuestions.length && (
                    <span className="text-[10px] text-amber-400 animate-pulse">
                      (Max: {allQuestions.length})
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={settings.numQuestions}
                  onChange={(e) => {
                    let value = parseInt(e.target.value);
                    setSettingsLocal({ ...settings, numQuestions: value });
                  }}
                  className="w-full slider-thick"
                />
                <div className="flex justify-between px-0.5 mt-0.5">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => {
                    const isDisabled = allQuestions.length > 0 && val > allQuestions.length;
                    return (
                      <div key={val} className="flex flex-col items-center">
                        <div className={`w-0.5 h-1.5 rounded-full ${isDisabled ? 'bg-white/5' : 'bg-white/20'}`} />
                        <span className={`text-[6px] mt-0.5 ${isDisabled ? 'text-white/5' : 'text-white/20'}`}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/60 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Time Limit
                </label>
                <span className="text-base font-bold text-white">
                  {settings.timeLimit === 0.5 ? '30 mins' : 
                  settings.timeLimit === 1 ? '1 hr' :
                  settings.timeLimit === 1.5 ? '1.5 hrs' :
                  settings.timeLimit === 2 ? '2 hrs' :
                  settings.timeLimit === 2.5 ? '2.5 hrs' :
                  settings.timeLimit === 3 ? '3 hrs' :
                  settings.timeLimit === 3.5 ? '3.5 hrs' :
                  settings.timeLimit === 4 ? '4 hrs' :
                  settings.timeLimit === 4.5 ? '4.5 hrs' :
                  settings.timeLimit === 5 ? '5 hrs' :
                  settings.timeLimit === 5.5 ? '5.5 hrs' :
                  settings.timeLimit === 6 ? '6 hrs' :
                  settings.timeLimit === 6.5 ? '6.5 hrs' :
                  settings.timeLimit === 7 ? '7 hrs' :
                  settings.timeLimit === 7.5 ? '7.5 hrs' :
                  settings.timeLimit === 8 ? '8 hrs' : `${settings.timeLimit}h`}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={settings.timeLimit}
                  onChange={(e) => setSettingsLocal({ ...settings, timeLimit: parseFloat(e.target.value) })}
                  className="w-full slider-thick"
                />
                <div className="flex justify-between px-0.5 mt-0.5">
                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((val) => (
                    <div key={val} className="flex flex-col items-center">
                      <div className={`w-0.5 h-1.5 rounded-full ${val % 1 === 0 ? 'bg-white/30' : 'bg-white/10'}`} />
                      <span className={`text-[5px] mt-0.5 ${val % 1 === 0 ? 'text-white/30' : 'text-white/10'}`}>
                        {val === 0.5 ? '30m' : 
                        val === 1 ? '1h' :
                        val === 1.5 ? '1.5h' :
                        val === 2 ? '2h' :
                        val === 2.5 ? '2.5h' :
                        val === 3 ? '3h' :
                        val === 3.5 ? '3.5h' :
                        val === 4 ? '4h' :
                        val === 4.5 ? '4.5h' :
                        val === 5 ? '5h' :
                        val === 5.5 ? '5.5h' :
                        val === 6 ? '6h' :
                        val === 6.5 ? '6.5h' :
                        val === 7 ? '7h' :
                        val === 7.5 ? '7.5h' :
                        val === 8 ? '8h' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <br />
            </div>

            {/* Focus Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white/90">Focus on weak subjects</p>
                  <p className="text-xs text-white/40">Prioritize questions you've struggled with</p>
                </div>
              </div>
              <button
                onClick={() => setSettingsLocal({ ...settings, focusMode: !settings.focusMode })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.focusMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${
                  settings.focusMode ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="glass-card p-5 md:col-span-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-base font-bold text-white/90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Subject Distribution
              </h2>
              <button
                onClick={resetDistribution}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-3 overflow-y-auto">
              {Object.keys(settings.distribution).length === 0 ? (
                <div className="text-center text-white/40 text-sm py-8">
                  <p>No subjects available</p>
                  <p className="text-xs mt-1">Add questions with subjects to your sheet</p>
                </div>
              ) : (
                <>
                  {Object.entries(settings.distribution).map(([subject, value]) => (
                    <div key={subject} className="flex-shrink-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-white/70">{subject}</span>
                        <span className="text-xs font-bold text-white">{value}%</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={value}
                          onChange={(e) => handleDistributionChange(subject, parseInt(e.target.value))}
                          className="w-full slider-thick"
                        />
                        <div className="flex justify-between px-0.5 mt-0.5">
                          {[0, 25, 50, 75, 100].map((val) => (
                            <div key={val} className="flex flex-col items-center">
                              <div className="w-0.5 h-1 bg-white/10 rounded-full" />
                              <span className="text-[5px] text-white/10 mt-0.5">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-white/30 text-center mt-1 flex-shrink-0">
                    Adjust sliders to control distribution (total = 100%)
                  </p>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Start Button */}
        <button
          onClick={handleStartQuiz}
          disabled={allQuestions.length === 0}
          className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all relative overflow-hidden ${
            allQuestions.length > 0
              ? 'bg-gradient-to-r from-purple-700 to-purple-900 text-white hover:shadow-xl hover:shadow-purple-700/25 hover:scale-[1.01]'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {allQuestions.length > 0 ? 'Start Exam' : 'No Questions Available'}
          </span>
          {allQuestions.length > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
          )}
        </button>
      </div>
    </div>
  );
}