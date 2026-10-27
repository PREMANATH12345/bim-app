import db from "../db.js";

// ==================== QUIZ CRUD OPERATIONS ====================

// Create a new quiz with questions (supports dynamic options)
export const createQuiz = (req, res) => {
  const { title, course_name, batch_name, total_questions, visible_questions, display_mode, quiz_for_website, questions } = req.body;

  const quizQuery = `
    INSERT INTO quizzes (title, course_name, batch_name, total_questions, visible_questions, display_mode, quiz_for_website)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    quizQuery,
    [title, course_name || null, batch_name || null, total_questions, visible_questions, display_mode, quiz_for_website || null],
    (err, quizResult) => {
      if (err) return res.status(500).json({ error: err.message });

      const quiz_id = quizResult.insertId;

      if (questions?.length) {
        const questionValues = questions.map(q => [
          quiz_id,
          q.question_text,
          JSON.stringify(q.options), // Store as JSON: {"1": "Option 1", "2": "Option 2", ...}
          q.correct_option          // e.g., "2" (key of the correct option)
        ]);

        const questionQuery = `
          INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option)
          VALUES ?
        `;

        db.query(questionQuery, [questionValues], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json({ message: "Quiz and questions created", quiz_id });
        });
      } else {
        res.status(201).json({ message: "Quiz created", quiz_id });
      }
    }
  );
};

// Get all quizzes (only non-deleted ones)
export const getAllQuizzes = (req, res) => {
  db.query("SELECT * FROM quizzes WHERE is_deleted IS NULL", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Get a single quiz by ID (only if not deleted)
export const getQuizById = (req, res) => {
  const quiz_id = req.params.quizId;
  
  db.query("SELECT * FROM quizzes WHERE quiz_id = ? AND is_deleted IS NULL", [quiz_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Quiz not found" });
    res.json(results[0]);
  });
};

// Update a quiz (only if not deleted)
export const updateQuiz = (req, res) => {
  const quiz_id = req.params.quizId;
  const { title, course_name, batch_name, total_questions, visible_questions, display_mode, quiz_for_website } = req.body;

  const query = `
    UPDATE quizzes 
    SET title = ?, course_name = ?, batch_name = ?, total_questions = ?, visible_questions = ?, display_mode = ?, quiz_for_website = ?
    WHERE quiz_id = ? AND is_deleted IS NULL
  `;

  db.query(
    query,
    [title, course_name, batch_name, total_questions, visible_questions, display_mode,  quiz_for_website || null, quiz_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Quiz not found or already deleted" });
      res.json({ message: "Quiz updated successfully" });
    }
  );
};

// Soft delete a quiz (mark as deleted instead of removing)
export const deleteQuiz = (req, res) => {
  const quiz_id = req.params.quizId;

  // First mark all questions in this quiz as deleted
  db.query("UPDATE quiz_questions SET is_deleted = 1 WHERE quiz_id = ? AND is_deleted IS NULL", [quiz_id], (err1) => {
    if (err1) return res.status(500).json({ error: err1.message });

    // Then mark the quiz as deleted
    db.query("UPDATE quizzes SET is_deleted = 1 WHERE quiz_id = ? AND is_deleted IS NULL", [quiz_id], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Quiz not found or already deleted" });
      res.json({ message: "Quiz and associated questions marked as deleted successfully" });
    });
  });
};






// Add a question to a quiz (with dynamic options)
export const addQuestionToQuiz = (req, res) => {
  const quiz_id = req.params.quizId;
  const { question_text, options, correct_option } = req.body;

  // Validate at least 2 options
  if (!options || Object.keys(options).length < 2) {
    return res.status(400).json({ error: "At least 2 options are required" });
  }

  // Validate correct_option is a number and within range
  const correctOptionNum = parseInt(correct_option);
  const optionKeys = Object.keys(options).map(key => parseInt(key));
  const maxOption = Math.max(...optionKeys);
  
  if (isNaN(correctOptionNum) || correctOptionNum < 1 || correctOptionNum > maxOption) {
    return res.status(400).json({ 
      error: `Correct option must be a number between 1 and ${maxOption}` 
    });
  }

  // Check if quiz exists and is not deleted
  db.query("SELECT quiz_id FROM quizzes WHERE quiz_id = ? AND is_deleted IS NULL", [quiz_id], (err, quizResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (quizResults.length === 0) return res.status(404).json({ error: "Quiz not found or deleted" });

    const questionQuery = `
      INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option)
      VALUES (?, ?, ?, ?)
    `;

    // Store correct_option as string number (e.g., "1", "2", "3")
    db.query(
      questionQuery,
      [quiz_id, question_text, JSON.stringify(options), correct_option.toString()],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
          message: "Question added successfully", 
          question_id: result.insertId,
          correct_option: correct_option.toString() // Return as string number
        });
      }
    );
  });
};

// Get all questions for a quiz (with parsed JSON options) - only non-deleted
export const getQuestionsByQuizId = (req, res) => {
  const quiz_id = req.params.quizId;

  db.query(
    "SELECT question_id, quiz_id, question_text, options, correct_option FROM quiz_questions WHERE quiz_id = ? AND is_deleted IS NULL",
    [quiz_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Parse JSON options and ensure correct_option is a string number
      const questions = results.map(q => {
        let parsedOptions = {};
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (parseErr) {
          console.error('Error parsing options:', parseErr);
          parsedOptions = {};
        }

        // Ensure correct_option is a string number (convert from letter if needed)
        let correctOption = q.correct_option;
        
        // Convert A, B, C, D to numbers if stored as letters
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(correctOption)) {
          const letterToNumber = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9', 'J': '10' };
          correctOption = letterToNumber[correctOption] || correctOption;
        }

        return {
          ...q,
          options: parsedOptions, // { "1": "Option 1", "2": "Option 2", ... }
          correct_option: correctOption.toString() // Ensure it's a string number
        };
      });
      
      res.json(questions);
    }
  );
};

// Update a question (supports dynamic options) - only if not deleted
export const updateQuestion = (req, res) => {
  const question_id = req.params.questionId;
  const { question_text, options, correct_option } = req.body;

  // Validate at least 2 options
  if (!options || Object.keys(options).length < 2) {
    return res.status(400).json({ error: "At least 2 options are required" });
  }

  // Validate correct_option is a number and within range
  const correctOptionNum = parseInt(correct_option);
  const optionKeys = Object.keys(options).map(key => parseInt(key));
  const maxOption = Math.max(...optionKeys);
  
  if (isNaN(correctOptionNum) || correctOptionNum < 1 || correctOptionNum > maxOption) {
    return res.status(400).json({ 
      error: `Correct option must be a number between 1 and ${maxOption}` 
    });
  }

  const query = `
    UPDATE quiz_questions 
    SET question_text = ?, options = ?, correct_option = ?
    WHERE question_id = ? AND is_deleted IS NULL
  `;

  // Store correct_option as string number
  db.query(
    query,
    [question_text, JSON.stringify(options), correct_option.toString(), question_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Question not found or already deleted" });
      res.json({ 
        message: "Question updated successfully",
        correct_option: correct_option.toString()
      });
    }
  );
};

// Soft delete a question (mark as deleted instead of removing)
export const deleteQuestion = (req, res) => {
  const question_id = req.params.questionId;

  db.query("UPDATE quiz_questions SET is_deleted = 1 WHERE question_id = ? AND is_deleted IS NULL", [question_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Question not found or already deleted" });
    res.json({ message: "Question marked as deleted successfully" });
  });
};

// Legacy function (backward compatibility) - only non-deleted questions
export const getQuizQuestions = (req, res) => {
  const quiz_id = req.params.quiz_id;

  db.query(
    "SELECT question_id, quiz_id, question_text, options, correct_option FROM quiz_questions WHERE quiz_id = ? AND is_deleted IS NULL",
    [quiz_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Parse JSON options and convert letters to numbers if needed
      const questions = results.map(q => {
        let parsedOptions = {};
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (parseErr) {
          console.error('Error parsing options:', parseErr);
          parsedOptions = {};
        }

        // Convert A, B, C, D to numbers if stored as letters
        let correctOption = q.correct_option;
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(correctOption)) {
          const letterToNumber = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9', 'J': '10' };
          correctOption = letterToNumber[correctOption] || correctOption;
        }

        return {
          ...q,
          options: parsedOptions,
          correct_option: correctOption.toString()
        };
      });
      
      res.json(questions);
    }
  );
};
