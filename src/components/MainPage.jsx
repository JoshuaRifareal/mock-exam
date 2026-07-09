import React, { useState, useEffect } from 'react';
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
  RefreshCw, Focus, GraduationCap, BarChart4
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
    masterMode: false,
    distribution: {},
  });

  // Subject toggles state
  const [subjectToggles, setSubjectToggles] = useState({});

  // Auto-start quiz from retry button
  useEffect(() => {
    const autoStart = sessionStorage.getItem('autoStartQuiz');
    if (autoStart === 'true') {
      sessionStorage.removeItem('autoStartQuiz');
      if (allQuestions.length > 0 && !loading) {
        console.log('🚀 Auto-starting quiz from retry');
        const selectedQuestions = selectQuestions(allQuestions, settings);
        setQuestions(selectedQuestions);
        setSettings(settings);
        startQuiz();
      }
    }
  }, [allQuestions, settings, loading]);

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
      
      const availableSubjects = [...new Set(
        questions
          .map(q => q.subject)
          .filter(subject => subject && subject.trim() !== '')
      )];
      
      // Equal distribution for all subjects
      const distribution = {};
      const toggles = {};
      const equalPercent = availableSubjects.length > 0 ? Math.round(100 / availableSubjects.length) : 0;
      
      availableSubjects.forEach(subject => {
        distribution[subject] = equalPercent;
        toggles[subject] = true; // All ON by default
      });
      
      // Adjust to make total 100%
      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
      if (total !== 100 && Object.keys(distribution).length > 0) {
        const diff = 100 - total;
        distribution[availableSubjects[0]] += diff;
      }
      
      setSettingsLocal(prev => ({ ...prev, distribution }));
      setSubjectToggles(toggles);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (questions, progress) => {
    const totalAttempts = progress.length;
    const correctAttempts = progress.filter(p => p.correct > 0).length;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
    
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

  // Calculate attempts per subject
  const getSubjectAttempts = () => {
    if (!allQuestions.length) return [];
    
    const subjects = [...new Set(
      allQuestions
        .map(q => q.subject)
        .filter(s => s && s.trim() !== '')
    )];
    
    return subjects.map(subject => {
      const subjectQuestions = allQuestions.filter(q => q.subject === subject);
      const subjectProgress = userProgress.filter(p => 
        subjectQuestions.some(q => q.id === p.questionId)
      );
      
      const attempted = subjectProgress.length;
      const total = subjectQuestions.length;
      const percentage = total > 0 ? Math.round((attempted / total) * 100) : 0;
      const isComplete = attempted >= total;
      
      return {
        name: subject,
        attempted,
        total,
        percentage,
        isComplete,
      };
    });
  };

  // Calculate total attempts across all subjects
  const getTotalAttempts = () => {
    const subjectAttempts = getSubjectAttempts();
    const totalAttempted = subjectAttempts.reduce((sum, s) => sum + s.attempted, 0);
    const totalQuestions = subjectAttempts.reduce((sum, s) => sum + s.total, 0);
    return { attempted: totalAttempted, total: totalQuestions };
  };

  // Get subject performance data
  const getSubjectPerformance = () => {
    if (!allQuestions.length) return [];
    
    const subjects = [...new Set(
      allQuestions
        .map(q => q.subject)
        .filter(s => s && s.trim() !== '')
    )];
    
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
    }).sort((a, b) => b.accuracy - a.accuracy);
  };

  // Handle subject toggle
  const handleSubjectToggle = (subject) => {
    const subjects = Object.keys(settings.distribution);
    const currentState = subjectToggles[subject] || false;
    
    // Toggle the selected subject
    const newState = !currentState;
    const updatedToggles = { ...subjectToggles, [subject]: newState };
    
    // Count how many are ON
    const onSubjects = subjects.filter(s => updatedToggles[s]);
    
    // If all are OFF, treat as all ON (equal distribution)
    if (onSubjects.length === 0) {
      const equalPercent = Math.round(100 / subjects.length);
      const newDistribution = {};
      subjects.forEach(s => {
        newDistribution[s] = equalPercent;
      });
      // Adjust to make total 100%
      const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
      if (total !== 100) {
        const diff = 100 - total;
        newDistribution[subjects[0]] += diff;
      }
      setSettingsLocal({ ...settings, distribution: newDistribution });
      setSubjectToggles(updatedToggles);
      return;
    }
    
    // Distribute 100% among ON subjects
    const percentPerSubject = Math.round(100 / onSubjects.length);
    const newDistribution = {};
    subjects.forEach(s => {
      newDistribution[s] = updatedToggles[s] ? percentPerSubject : 0;
    });
    
    // Adjust to make total 100%
    const total = Object.values(newDistribution).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const diff = 100 - total;
      const firstOn = onSubjects[0];
      newDistribution[firstOn] += diff;
    }
    
    setSettingsLocal({ ...settings, distribution: newDistribution });
    setSubjectToggles(updatedToggles);
  };

  const selectQuestions = (questions, settings) => {
    let { numQuestions, distribution, focusMode, masterMode } = settings;
    
    let availableQuestions = [...questions];
    
    // If master mode is on, only include unanswered questions
    if (masterMode) {
      const answeredIds = userProgress.map(p => p.questionId);
      availableQuestions = questions.filter(q => !answeredIds.includes(q.id));
      console.log(`📝 Master mode: ${availableQuestions.length} unanswered questions available`);
    }
    
    // If focus mode is on, prioritize wrong answers
    if (focusMode && !masterMode) {
      const wrongIds = userProgress
        .filter(p => p.correct === 0)
        .map(p => p.questionId);
      
      const weightedQuestions = availableQuestions.map(q => {
        const isWrong = wrongIds.includes(q.id);
        return {
          ...q,
          weight: isWrong ? 3 : 1,
        };
      });
      
      const selected = weightedRandomSelect(weightedQuestions, numQuestions, distribution);
      return selected;
    }
    
    return selectWithDistribution(availableQuestions, numQuestions, distribution);
  };

  const weightedRandomSelect = (items, count, distribution) => {
    const subjects = {};
    items.forEach(item => {
      if (!subjects[item.subject]) subjects[item.subject] = [];
      subjects[item.subject].push(item);
    });
    
    const perSubject = {};
    let remaining = count;
    const subjectKeys = Object.keys(distribution).filter(s => subjects[s]);
    
    subjectKeys.forEach(subject => {
      const target = Math.round((distribution[subject] / 100) * count);
      const available = subjects[subject]?.length || 0;
      perSubject[subject] = Math.min(target, available);
      remaining -= perSubject[subject];
    });
    
    if (remaining > 0) {
      let i = 0;
      while (remaining > 0 && subjectKeys.length > 0) {
        const subject = subjectKeys[i % subjectKeys.length];
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
      const count = perSubject[subject];
      
      const weightedItems = available.map(item => ({
        ...item,
        weight: item.weight || 1,
      }));
      
      const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
      const shuffled = [...weightedItems].sort(() => Math.random() - 0.5);
      
      let selectedItems = [];
      let remainingWeight = totalWeight;
      let tempItems = [...shuffled];
      
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        let random = Math.random() * remainingWeight;
        let selectedIndex = 0;
        for (let j = 0; j < tempItems.length; j++) {
          random -= tempItems[j].weight;
          if (random <= 0) {
            selectedIndex = j;
            break;
          }
        }
        selectedItems.push(tempItems[selectedIndex]);
        remainingWeight -= tempItems[selectedIndex].weight;
        tempItems.splice(selectedIndex, 1);
      }
      
      selected = [...selected, ...selectedItems];
    });
    
    return selected.sort(() => Math.random() - 0.5);
  };

  const selectWithDistribution = (questions, numQuestions, distribution) => {
    const subjects = {};
    questions.forEach(q => {
      if (!subjects[q.subject]) subjects[q.subject] = [];
      subjects[q.subject].push(q);
    });
    
    const perSubject = {};
    let remaining = numQuestions;
    const subjectKeys = Object.keys(distribution).filter(s => subjects[s]);
    
    subjectKeys.forEach(subject => {
      const target = Math.round((distribution[subject] / 100) * numQuestions);
      const available = subjects[subject]?.length || 0;
      perSubject[subject] = Math.min(target, available);
      remaining -= perSubject[subject];
    });
    
    if (remaining > 0) {
      let i = 0;
      while (remaining > 0 && subjectKeys.length > 0) {
        const subject = subjectKeys[i % subjectKeys.length];
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

  const resetDistribution = () => {
    const subjects = Object.keys(settings.distribution);
    if (subjects.length === 0) return;
    
    const equalPercent = Math.round(100 / subjects.length);
    const distribution = {};
    subjects.forEach(subject => {
      distribution[subject] = equalPercent;
    });
    
    // Adjust to make total 100%
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const diff = 100 - total;
      distribution[subjects[0]] += diff;
    }
    
    setSettingsLocal(prev => ({ ...prev, distribution }));
    
    // Reset all toggles to ON
    const toggles = {};
    subjects.forEach(s => {
      toggles[s] = true;
    });
    setSubjectToggles(toggles);
  };

  const handleStartQuiz = () => {
    if (allQuestions.length === 0) return;
    
    sessionStorage.removeItem('autoStartQuiz');
    
    let validatedSettings = { ...settings };
    if (settings.numQuestions > allQuestions.length) {
      validatedSettings.numQuestions = allQuestions.length;
    }
    
    const selectedQuestions = selectQuestions(allQuestions, validatedSettings);
    setQuestions(selectedQuestions);
    setSettings(validatedSettings);
    startQuiz();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const isRealData = allQuestions.length > 2;
  const subjectAttempts = getSubjectAttempts();
  const totalAttempts = getTotalAttempts();
  const subjectPerformance = getSubjectPerformance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/5 bg-neutral-900/95">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white/90">Mock Exam</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/60 hover:text-white"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full ring-2 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${isRealData ? 'bg-green-400' : 'bg-amber-400'} ring-2 ring-black/20`} />
                {!isRealData && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 animate-pulse">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 glass-card p-2 z-50">
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
                        localStorage.removeItem('quizUser');
                        window.location.reload();
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Questions</p>
                <p className="text-xl font-bold text-white">{allQuestions.length}</p>
              </div>

              <div className="ml-auto w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Attempted</p>
                <p className="text-xl font-bold text-white">{totalAttempts.attempted}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Subjects</p>
                <p className="text-xl font-bold text-white">{stats?.subjects || 0}</p>
              </div>

              <div className="ml-auto w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Passing Rate</p>
                <p className="text-xl font-bold text-white">{Math.round(stats?.accuracy || 0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance Card */}
        <div className="glass-card p-5 mb-4">
          <h2 className="text-base font-bold text-white/90 mb-4 flex items-center gap-2">
            <BarChart4 className="w-4 h-4 text-blue-400" />
            Subject Performance
          </h2>
          <div className="space-y-3">
            {allQuestions.length > 0 && userProgress.length > 0 ? (
              subjectPerformance.map((subject) => (
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
              ))
            ) : (
              <div className="text-center text-white/40 text-sm py-6">
                <p>No performance data yet.</p>
                <p className="text-xs mt-1">Start a quiz to track your progress!</p>
              </div>
            )}
          </div>
        </div>

        {/* Attempts per Subject Card */}
        <div className="glass-card p-5 mb-4">
          <h2 className="text-base font-bold text-white/90 mb-4 flex items-center gap-2">
            <BarChart4 className="w-4 h-4 text-green-400" />
            Attempts per Subject
          </h2>
          <div className="space-y-3">
            {allQuestions.length > 0 && userProgress.length > 0 ? (
              subjectAttempts.map((subject) => (
                <div key={subject.name} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70 truncate flex-1 mr-4">
                      {subject.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-white/50">
                        {subject.attempted}/{subject.total}
                      </span>
                      <span className={`text-sm font-bold ${
                        subject.isComplete ? 'text-green-400' :
                        subject.percentage >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {subject.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          subject.isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                          subject.percentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                          'bg-gradient-to-r from-red-500 to-rose-400'
                        }`}
                        style={{ 
                          width: `${Math.min(subject.percentage, 100)}%`,
                          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-white/30">
                      {subject.isComplete ? '✅ Complete' : `${subject.total - subject.attempted} remaining`}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {subject.isComplete ? '🟢' :
                       subject.percentage >= 50 ? '🟡' :
                       '🔴'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-white/40 text-sm py-6">
                <p>No attempt data yet.</p>
                <p className="text-xs mt-1">Start a quiz to track your progress!</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Settings - Bento Large */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Quiz Settings */}
          <div className="glass-card p-5 md:col-span-3 flex flex-col">
            <h2 className="text-base font-bold text-white/90 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Quiz Settings
            </h2>

            <div className="space-y-4">
              {/* Questions Slider - 10 to 100, step 10 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-white/60 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Questions
                  </label>
                  <span className="text-base font-bold text-white">{settings.numQuestions}</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={settings.numQuestions}
                    onChange={(e) => setSettingsLocal({ ...settings, numQuestions: parseInt(e.target.value) })}
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
                  {allQuestions.length > 0 && settings.numQuestions > allQuestions.length && (
                    <div className="mt-1 text-[10px] text-amber-400/80">
                      ⚠️ Only {allQuestions.length} questions available
                    </div>
                  )}
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
                    {settings.timeLimit === 0.5 ? '30m' : 
                     settings.timeLimit === 1 ? '1h' :
                     settings.timeLimit === 1.5 ? '1h 30m' :
                     settings.timeLimit === 2 ? '2h' :
                     settings.timeLimit === 2.5 ? '2h 30m' :
                     settings.timeLimit === 3 ? '3h' :
                     settings.timeLimit === 3.5 ? '3h 30m' :
                     settings.timeLimit === 4 ? '4h' :
                     settings.timeLimit === 4.5 ? '4h 30m' :
                     settings.timeLimit === 5 ? '5h' :
                     settings.timeLimit === 5.5 ? '5h 30m' :
                     settings.timeLimit === 6 ? '6h' :
                     settings.timeLimit === 6.5 ? '6h 30m' :
                     settings.timeLimit === 7 ? '7h' :
                     settings.timeLimit === 7.5 ? '7h 30m' :
                     settings.timeLimit === 8 ? '8h' : `${settings.timeLimit}h`}
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
              </div>

              {/* Focus Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Focus className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Focus Mode</p>
                    <p className="text-[10px] text-white/40">Prioritize questions with incorrect attempts</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettingsLocal({ ...settings, focusMode: !settings.focusMode })}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    settings.focusMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${
                    settings.focusMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Master Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Master Mode</p>
                    <p className="text-[10px] text-white/40">Only include unanswered questions</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettingsLocal({ ...settings, masterMode: !settings.masterMode })}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    settings.masterMode ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${
                    settings.masterMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="glass-card p-5 md:col-span-2 flex flex-col">
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
                  {Object.entries(settings.distribution).map(([subject, value]) => {
                    const isOn = subjectToggles[subject] !== false;
                    return (
                      <div key={subject} className="flex-shrink-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-white/70 truncate flex-1 mr-2">{subject}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs font-bold text-white min-w-[30px] text-right">{value}%</span>
                            {/* Toggle Button */}
                            <button
                              onClick={() => handleSubjectToggle(subject)}
                              className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                                isOn ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-lg transition-transform ${
                                isOn ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
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
                    );
                  })}
                  <p className="text-[10px] text-white/30 text-center mt-1 flex-shrink-0">
                    Adjust distribution (total = 100%)
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
          className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-base transition-all relative overflow-hidden ${
            allQuestions.length > 0
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.01]'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {allQuestions.length > 0 ? '🚀 Start Quiz' : 'No Questions Available'}
          </span>
          {allQuestions.length > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
          )}
        </button>
      </div>
    </div>
  );
}