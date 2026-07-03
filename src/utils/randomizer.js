export const getWeightedQuestions = (allQuestions, userProgress, settings) => {
    const { numQuestions, focusMode, distribution } = settings;
    
    // Group questions by subject
    const subjectGroups = {};
    allQuestions.forEach(q => {
      if (!subjectGroups[q.subject]) {
        subjectGroups[q.subject] = [];
      }
      subjectGroups[q.subject].push(q);
    });
    
    // Calculate how many questions per subject based on distribution
    const questionsPerSubject = {};
    const totalSubjects = Object.keys(distribution).length;
    let remaining = numQuestions;
    
    Object.keys(distribution).forEach((subject, index) => {
      const count = Math.round((distribution[subject] / 100) * numQuestions);
      questionsPerSubject[subject] = Math.min(count, subjectGroups[subject]?.length || 0);
      remaining -= questionsPerSubject[subject];
    });
    
    // Distribute remaining questions
    if (remaining > 0) {
      const subjects = Object.keys(questionsPerSubject);
      let i = 0;
      while (remaining > 0 && subjects.length > 0) {
        const subject = subjects[i % subjects.length];
        if (questionsPerSubject[subject] < subjectGroups[subject]?.length) {
          questionsPerSubject[subject]++;
          remaining--;
        }
        i++;
      }
    }
    
    // Select questions with optional focus mode
    let selectedQuestions = [];
    
    Object.keys(questionsPerSubject).forEach(subject => {
      const count = questionsPerSubject[subject];
      const available = subjectGroups[subject] || [];
      
      if (count === 0 || available.length === 0) return;
      
      // Calculate weight for each question
      const weightedQuestions = available.map(q => {
        const progress = userProgress.find(p => p.questionId === q.id);
        let weight = 1;
        
        if (focusMode && progress) {
          const accuracy = progress.attempts > 0 ? progress.correct / progress.attempts : 0;
          if (accuracy < 0.4) weight = 3;
          else if (accuracy < 0.7) weight = 2;
          // else weight = 1 (already mastered)
        }
        
        return { ...q, weight };
      });
      
      // Select questions using weighted random
      const selected = weightedRandomSelect(weightedQuestions, count);
      selectedQuestions = [...selectedQuestions, ...selected];
    });
    
    // Shuffle the final list
    return shuffleArray(selectedQuestions);
  };
  
  const weightedRandomSelect = (items, count) => {
    const selected = [];
    const available = [...items];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (let j = 0; j < available.length; j++) {
        random -= available[j].weight;
        if (random <= 0) {
          selected.push(available[j]);
          available.splice(j, 1);
          break;
        }
      }
    }
    
    return selected;
  };
  
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };