// controllers/quizAttemptController.js
import db1 from "../db1.js";

// Start a new quiz attempt or continue existing
export const startQuizAttempt = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;


    // Get video and quiz info (only non-deleted quizzes)
    const [video] = await db1.execute(
      `SELECT v.id, v.quiz_id, q.total_questions, q.visible_questions, q.title as quiz_title 
       FROM videos v 
       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE v.id = ?`,
      [videoId]
    );


    if (video.length === 0 || !video[0].quiz_id) {
      return res.status(404).json({ error: "Quiz not found for this video" });
    }

    // Check if there's an existing in-progress attempt
    const [existingAttempt] = await db1.execute(
      `SELECT attempt_id, quiz_id FROM quiz_attempts 
       WHERE user_id = ? AND video_id = ? AND status = 'in_progress' 
       ORDER BY started_at DESC LIMIT 1`,
      [userId, videoId]
    );


    let attemptId;
    if (existingAttempt.length > 0) {
      // Continue existing attempt
      attemptId = existingAttempt[0].attempt_id;
    } else {
      // Create new attempt
      const [result] = await db1.execute(
        `INSERT INTO quiz_attempts 
         (user_id, video_id, quiz_id, total_questions, visible_questions, status, started_at) 
         VALUES (?, ?, ?, ?,?, 'in_progress', NOW())`,
        [userId, videoId, video[0].quiz_id, video[0].total_questions, video[0].visible_questions]
      );
      attemptId = result.insertId;
    }

    res.json({
      attemptId,
      continueExisting: existingAttempt.length > 0,
      quizInfo: {
        quiz_id: video[0].quiz_id,
        quiz_title: video[0].quiz_title,
        total_questions: video[0].total_questions
      }
    });

  } catch (error) {
    console.error("Error starting quiz attempt:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};



//final quiz video

// Save quiz progress



export const saveQuizProgress = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOption, currentQuestionIndex, isLastQuestion } = req.body;
    const userId = req.user.id;


    // Verify attempt belongs to user and get current data
    const [attempt] = await db1.execute(
      `SELECT quiz_id, status, answers, questions FROM quiz_attempts 
       WHERE attempt_id = ? AND user_id = ?`,
      [attemptId, userId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found" });
    }

    if (attempt[0].status === 'completed') {
      return res.status(400).json({ error: "This quiz attempt is already completed" });
    }

    // Get question details to verify correct answer
    const [question] = await db1.execute(
      `SELECT question_text, options, correct_option FROM quiz_questions 
       WHERE question_id = ? AND quiz_id = ? AND is_deleted IS NULL`,
      [questionId, attempt[0].quiz_id]
    );

    if (question.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    const isCorrect = selectedOption === question[0].correct_option;


    // Parse existing answers or initialize empty array
    let answers = [];
    try {
      answers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
    } catch (parseErr) {
      console.error('Error parsing existing answers:', parseErr);
      answers = [];
    }

    // Update or add the answer
    const existingAnswerIndex = answers.findIndex(a => a.question_id == questionId);
    const answerData = {
      question_id: parseInt(questionId),
      selected_option: selectedOption
    };

    if (existingAnswerIndex >= 0) {
      answers[existingAnswerIndex] = answerData;
    } else {
      answers.push(answerData);
    }

    // Parse existing questions or initialize empty array
    let questions = [];
    try {
      questions = attempt[0].questions ? JSON.parse(attempt[0].questions) : [];
    } catch (parseErr) {
      console.error('Error parsing existing questions:', parseErr);
      questions = [];
    }

    // Update or add the question data
    const existingQuestionIndex = questions.findIndex(q => q.question_id == questionId);
    const questionData = {
      question_id: parseInt(questionId),
      question_text: question[0].question_text,
      options: JSON.parse(question[0].options),
      correct_option: question[0].correct_option
    };

    if (existingQuestionIndex >= 0) {
      questions[existingQuestionIndex] = questionData;
    } else {
      questions.push(questionData);
    }

    // Update the quiz attempt with new answers and questions
    await db1.execute(
      `UPDATE quiz_attempts 
       SET answers = ?, questions = ?, current_question_index = ?
       WHERE attempt_id = ?`,
      [JSON.stringify(answers), JSON.stringify(questions), currentQuestionIndex, attemptId]
    );


    res.json({ 
      success: true, 
      isCorrect,
      message: 'Progress saved successfully'
    });

  } catch (error) {
    console.error("Error saving quiz progress:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};



export const completeQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.body;
    const userId = req.user.id;
    
    // MODIFIED: Added visible_questions to the SELECT query
    const [attempt] = await db1.execute(
      `SELECT quiz_id, video_id, total_questions, visible_questions, answers, questions 
       FROM quiz_attempts 
       WHERE attempt_id = ? AND user_id = ? AND status = 'in_progress'`,
      [attemptId, userId]
    );
    
    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found or already completed" });
    }
    
    // Parse answers and questions
    let answers = [];
    let questions = [];
    try {
      answers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
      questions = attempt[0].questions ? JSON.parse(attempt[0].questions) : [];
    } catch (parseErr) {
      console.error('Error parsing answers/questions:', parseErr);
      return res.status(500).json({ error: "Error parsing quiz data" });
    }
    
    // Calculate score by comparing answers with correct options
    let correctAnswers = 0;
    const detailedResults = [];
    
    for (const answer of answers) {
      const question = questions.find(q => q.question_id === answer.question_id);
      if (question) {
        const isCorrect = answer.selected_option === question.correct_option;
        if (isCorrect) correctAnswers++;
        
        detailedResults.push({
          question_id: answer.question_id,
          question_text: question.question_text,
          options: question.options,
          selected_option: answer.selected_option,
          correct_option: question.correct_option,
          is_correct: isCorrect
        });
      }
    }
    
    // MODIFIED: Use visible_questions instead of total_questions for percentage calculation
    const visibleQuestions = attempt[0].visible_questions || answers.length;
    const percentage = visibleQuestions > 0 ? (correctAnswers / visibleQuestions) * 100 : 0;
    

    
    // Update the attempt as completed
    await db1.execute(
      `UPDATE quiz_attempts 
       SET 
         status = 'completed',
         score = ?,
         percentage = ?,
         completed_at = NOW()
       WHERE attempt_id = ?`,
      [correctAnswers, percentage, attemptId]
    );
    
    
    res.json({
      success: true,
      score: correctAnswers,
      totalQuestions: visibleQuestions, // MODIFIED: Return visible questions as total
      percentage: percentage.toFixed(2),
      details: detailedResults
    });
    
  } catch (error) {
    console.error("Error completing quiz attempt:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Get quiz attempt progress
export const getQuizAttemptProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;


    // Get the attempt details
    const [attempt] = await db1.execute(
      `SELECT 
        qa.attempt_id,
        qa.video_id,
        v.title as video_title,
        qa.quiz_id,
        q.title as quiz_title,
        qa.current_question_index,
        qa.status,
        qa.total_questions,
        qa.answers
       FROM quiz_attempts qa
       JOIN videos v ON qa.video_id = v.id
       JOIN quizzes q ON qa.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qa.attempt_id = ? AND qa.user_id = ? AND qa.status = 'in_progress'`,
      [attemptId, userId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found or already completed" });
    }

    // Parse answers
    let answers = [];
    try {
      answers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
    } catch (parseErr) {
      console.error('Error parsing answers:', parseErr);
      answers = [];
    }

    // Convert answers array to object for easier access
    const answersObj = answers.reduce((acc, answer) => {
      acc[answer.question_id] = answer.selected_option;
      return acc;
    }, {});


    res.json({
      attempt: attempt[0],
      answers: answersObj,
      currentQuestionIndex: attempt[0].current_question_index || 0
    });

  } catch (error) {
    console.error("Error fetching quiz attempt progress:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Get quiz attempt history for a user
export const getQuizAttemptHistory = async (req, res) => {
    try {
    const userId = req.user.id;
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    const [attempts] = await db1.execute(
      `SELECT 
        qa.attempt_id,
        qa.video_id,
        v.title as video_title,
        qa.quiz_id,
        q.title as quiz_title,
        qa.score,
        qa.total_questions,
        qa.visible_questions,
        qa.percentage,
        qa.status,
        qa.started_at,
        qa.completed_at
       FROM quiz_attempts qa
       JOIN videos v ON qa.video_id = v.id
       JOIN quizzes q ON qa.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qa.user_id = ? AND qa.video_id = ?
       ORDER BY qa.started_at DESC`,
      [userId, videoId]
    );


    res.json({ attempts, videoId });
  } catch (error) {
    console.error("Error fetching video quiz history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get detailed quiz attempt results
export const getQuizAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Get the attempt details
    const [attempt] = await db1.execute(
      `SELECT 
        qa.*,
        v.title as video_title,
        q.title as quiz_title
       FROM quiz_attempts qa
       JOIN videos v ON qa.video_id = v.id
       JOIN quizzes q ON qa.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qa.attempt_id = ? AND qa.user_id = ?`,
      [attemptId, userId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found" });
    }

    // Parse answers and questions from JSON columns
    let parsedDetails = [];
    try {
      const answers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
      const questions = attempt[0].questions ? JSON.parse(attempt[0].questions) : [];

      // Combine answers with questions to create detailed results
      parsedDetails = answers.map(answer => {
        const question = questions.find(q => q.question_id === answer.question_id);
        if (question) {
          return {
            question_id: answer.question_id,
            question_text: question.question_text,
            options: question.options,
            selected_option: answer.selected_option,
            correct_option: question.correct_option,
            is_correct: answer.selected_option === question.correct_option
          };
        }
        return null;
      }).filter(Boolean); // Remove null entries

    } catch (parseErr) {
      console.error('Error parsing quiz data:', parseErr);
      return res.status(500).json({ error: "Error parsing quiz data" });
    }

    res.json({
      attempt: attempt[0],
      details: parsedDetails
    });

  } catch (error) {
    console.error("Error fetching quiz attempt details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};