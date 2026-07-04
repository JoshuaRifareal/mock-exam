const SHEET_ID = import.meta.env.VITE_SHEET_ID;

// Helper to get access token
const getAccessToken = () => {
  try {
    const userData = localStorage.getItem('quizUser');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user?.access_token || user?.accessToken || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

export const validateToken = () => {
  try {
    const userData = localStorage.getItem('quizUser');
    if (!userData) return false;
    
    const user = JSON.parse(userData);
    
    // Check if token exists
    if (!user.access_token) return false;
    
    // Check if token is expired
    if (user.expires_in && user.timestamp) {
      const tokenAge = Date.now() - user.timestamp;
      const expiresInMs = user.expires_in * 1000;
      
      if (tokenAge > expiresInMs) {
        console.warn('Token expired');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

export const fetchQuestions = async () => {
  try {
    const token = getAccessToken();
    
    if (!token || !SHEET_ID) {
      console.warn('No token or SHEET_ID found, using mock data');
      return getMockQuestions();
    }
    
    console.log('Fetching questions from sheet:', SHEET_ID);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Questions?majorDimension=ROWS`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('quizUser');
        window.location.href = '/';
        return getMockQuestions();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length < 2) {
      return getMockQuestions();
    }
    
    const headers = rows[0];
    const questions = rows.slice(1).map((row, index) => {
      const q = {};
      headers.forEach((header, i) => {
        q[header] = row[i] || '';
      });
      q.id = q.id ? parseInt(q.id) : index + 1;
      q.correctAnswer = q.correct_answer ? parseInt(q.correct_answer) - 1 : 0;
      return q;
    });
    
    console.log(`✅ Loaded ${questions.length} questions from Google Sheets`);
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return getMockQuestions();
  }
};

export const fetchUserProgress = async (userEmail) => {
  try {
    const token = getAccessToken();
    
    if (!token || !SHEET_ID) {
      console.warn('No token or SHEET_ID found for progress fetch');
      return [];
    }
    
    console.log('Fetching progress for user:', userEmail);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress?majorDimension=ROWS`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.warn('Progress fetch failed with status:', response.status);
      return [];
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    console.log('Progress rows found:', rows.length);
    
    if (rows.length < 2) {
      console.log('No progress data found (only headers or empty)');
      return [];
    }
    
    const headers = rows[0];
    console.log('Progress headers:', headers);
    
    // Find the index of each column
    const emailIdx = headers.indexOf('user_email');
    const questionIdx = headers.indexOf('question_id');
    const subjectIdx = headers.indexOf('subject');
    const attemptsIdx = headers.indexOf('attempts');
    const correctIdx = headers.indexOf('correct_attempts');
    const lastIdx = headers.indexOf('last_attempt');
    
    console.log('Column indices:', { emailIdx, questionIdx, subjectIdx, attemptsIdx, correctIdx, lastIdx });
    
    const progress = rows.slice(1)
      .filter(row => {
        const email = row[emailIdx] || '';
        return email === userEmail;
      })
      .map(row => {
        const p = {
          user_email: row[emailIdx] || '',
          questionId: parseInt(row[questionIdx]) || 0,
          subject: row[subjectIdx] || '',
          attempts: parseInt(row[attemptsIdx]) || 0,
          correct: parseInt(row[correctIdx]) || 0,
          last_attempt: row[lastIdx] || '',
        };
        return p;
      });
    
    console.log(`✅ Found ${progress.length} progress entries for user`);
    return progress;
  } catch (error) {
    console.error('Error fetching progress:', error);
    return [];
  }
};

export const saveProgress = async ({ userEmail, questionId, isCorrect }) => {
  try {
    console.log('📝 Saving progress:', { userEmail, questionId, isCorrect });
    
    const token = getAccessToken();
    
    if (!token) {
      console.error('❌ No access token found');
      return;
    }
    
    if (!SHEET_ID) {
      console.error('❌ No SHEET_ID found');
      return;
    }
    
    // First, fetch current progress to see if entry exists
    const allProgress = await fetchUserProgress(userEmail);
    console.log('Current progress for user:', allProgress);
    
    const existing = allProgress.find(p => p.questionId === questionId);
    
    let rowData;
    let endpoint;
    let method;
    
    if (existing) {
      // Update existing - find the actual row number
      console.log('Updating existing entry for question:', questionId);
      
      // We need to find the row number by fetching all data
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress?majorDimension=ROWS`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length < 2) {
        console.error('❌ No progress data found to update');
        return;
      }
      
      const headers = rows[0];
      const emailIdx = headers.indexOf('user_email');
      const questionIdx = headers.indexOf('question_id');
      
      // Find the row
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[emailIdx] === userEmail && parseInt(row[questionIdx]) === questionId) {
          rowIndex = i + 1; // 1-based for Sheets API
          break;
        }
      }
      
      if (rowIndex === -1) {
        console.error('❌ Could not find existing entry');
        return;
      }
      
      const newAttempts = existing.attempts + 1;
      const newCorrect = existing.correct + (isCorrect ? 1 : 0);
      
      rowData = [
        userEmail,
        questionId,
        newAttempts,
        newCorrect,
        new Date().toISOString()
      ];
      
      endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress!A${rowIndex}:E${rowIndex}?valueInputOption=RAW`;
      method = 'PUT';
      
      console.log('Updating row:', rowIndex, rowData);
    } else {
      // Add new entry
      console.log('Adding new entry for question:', questionId);
      
      rowData = [
        userEmail,
        questionId,
        1,
        isCorrect ? 1 : 0,
        new Date().toISOString()
      ];
      
      endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress:append?valueInputOption=RAW`;
      method = 'POST';
      
      console.log('Appending new row:', rowData);
    }
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowData] }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Save progress failed:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Progress saved successfully:', result);
    
  } catch (error) {
    console.error('❌ Error saving progress:', error);
  }
};

// Mock data - only used when no sheet is connected
const getMockQuestions = () => {
  return [
    {
      id: 1,
      subject: 'Math',
      question: 'What is 2 + 2?',
      option1: '3',
      option2: '4',
      option3: '5',
      option4: '6',
      correctAnswer: 1,
      hint: 'Basic addition',
      image_url: '',
    },
    {
      id: 2,
      subject: 'Science',
      question: 'What is the chemical symbol for water?',
      option1: 'H2O',
      option2: 'CO2',
      option3: 'NaCl',
      option4: 'HCl',
      correctAnswer: 0,
      hint: 'H-O-H',
      image_url: '',
    },
  ];
};

export const saveProgressBatch = async ({ userEmail, progress }) => {
  try {
    const token = getAccessToken();
    
    if (!token || !SHEET_ID) {
      console.warn('No token or SHEET_ID found, progress not saved');
      return;
    }
    
    if (!progress || progress.length === 0) {
      console.log('No progress to save');
      return;
    }
    
    console.log(`📝 Saving batch of ${progress.length} progress entries...`);
    
    // Get all current progress for this user
    const allProgress = await fetchUserProgress(userEmail);
    
    // Prepare updates
    const updates = [];
    const newEntries = [];
    
    for (const item of progress) {
      const existing = allProgress.find(p => p.questionId === item.questionId);
      
      if (existing) {
        // Update existing
        const newAttempts = existing.attempts + 1;
        const newCorrect = existing.correct + (item.isCorrect ? 1 : 0);
        updates.push({
          questionId: item.questionId,
          subject: item.subject || '',
          attempts: newAttempts,
          correct: newCorrect,
          last_attempt: new Date().toISOString(),
        });
      } else {
        // New entry
        newEntries.push([
          userEmail,
          item.questionId,
          item.subject || '',
          1,
          item.isCorrect ? 1 : 0,
          new Date().toISOString()
        ]);
      }
    }
    
    // Handle updates (need to find rows)
    if (updates.length > 0) {
      // Fetch all rows to find correct indices
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress?majorDimension=ROWS`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length >= 2) {
        const headers = rows[0];
        const emailIdx = headers.indexOf('user_email');
        const questionIdx = headers.indexOf('question_id');
        const subjectIdx = headers.indexOf('subject');
        const attemptsIdx = headers.indexOf('attempts');
        const correctIdx = headers.indexOf('correct_attempts');
        const lastIdx = headers.indexOf('last_attempt');
        
        // Process each update
        for (const update of updates) {
          // Find the row
          let rowIndex = -1;
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[emailIdx] === userEmail && parseInt(row[questionIdx]) === update.questionId) {
              rowIndex = i + 1;
              break;
            }
          }
          
          if (rowIndex !== -1) {
            const rowData = [
              userEmail,
              update.questionId,
              update.subject,
              update.attempts,
              update.correct,
              update.last_attempt
            ];
            
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress!A${rowIndex}:F${rowIndex}?valueInputOption=RAW`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: [rowData] }),
              }
            );
          }
        }
      }
    }
    
    // Handle new entries
    if (newEntries.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Progress:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: newEntries }),
        }
      );
    }
    
    console.log(`✅ Batch of ${progress.length} progress entries saved successfully`);
  } catch (error) {
    console.error('❌ Error saving batch progress:', error);
  }
};

export const saveFlags = async ({ flaggedQuestions, userEmail }) => {
  if (!flaggedQuestions || flaggedQuestions.length === 0) {
    console.log('⚠️ No flags to save');
    return;
  }

  const token = getAccessToken();
  if (!token) {
    console.error('❌ No token');
    return;
  }
  if (!SHEET_ID) {
    console.error('❌ No SHEET_ID');
    return;
  }

  // Fetch the Questions sheet
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Questions?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    console.error('❌ Failed to fetch Questions rows:', response.status);
    return;
  }
  const data = await response.json();
  const rows = data.values || [];
  if (rows.length < 2) {
    console.warn('⚠️ No data rows in Questions');
    return;
  }

  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const reportIdx = headers.indexOf('report');

  if (reportIdx === -1) {
    console.warn('❌ "report" column not found in Questions sheet. Headers:', headers);
    return;
  }

  for (const flag of flaggedQuestions) {
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (parseInt(row[idIdx]) === flag.questionId) {
        rowIndex = i + 1; // 1-based for Sheets API
        break;
      }
    }
    if (rowIndex === -1) {
      console.warn(`⚠️ No row found for question ${flag.questionId}`);
      continue;
    }

    // Get existing report content
    const existingComment = rows[rowIndex - 1]?.[reportIdx] || '';
    const newComment = existingComment
      ? `${flag.comment}: ${existingComment}\n[${userEmail || 'Anonymous'}]`
      : `${flag.comment}: [${userEmail || 'Anonymous'}]`;

    // Update the report column for that question
    const colLetter = String.fromCharCode(65 + reportIdx);
    const range = `Questions!${colLetter}${rowIndex}`;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[newComment]] }),
      }
    );
    if (!updateRes.ok) {
      console.error(`❌ Failed to update report for question ${flag.questionId}:`, updateRes.status);
    } else {
      console.log(`✅ Report saved for question ${flag.questionId}`);
    }
  }
};