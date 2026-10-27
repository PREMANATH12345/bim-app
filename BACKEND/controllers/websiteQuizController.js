// controllers/websiteQuizController.js
import db1 from "../db1.js";
import db2 from '../db2.js';
import jwt from "jsonwebtoken";
import Razorpay from 'razorpay';
import crypto from 'crypto';
// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRETT) {
  console.error('JWT_SECRETT not set in environment variables');
}


const getUserInfo = (req) => {
  if (req.user) {
    return {
      isAuthenticated: true,
      userId: req.user.id,
      userType: req.user.userType || 'login',
      userIdentifier: req.user.id.toString()
    };
  }
  
  return {
    isAuthenticated: false,
    userId: null,
    userType: 'free',
    userIdentifier: null
  };
};

// Get all available quizzes for user based on their authentication status
export const getAllAvailableQuizzes = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    
    // Determine which quiz type to fetch
    let quizType = 'free';
    if (userInfo.isAuthenticated) {
      quizType = userInfo.userType === 'paid' ? 'paid' : 'login';
    }
    
    // Get all quizzes for user type
    const [quizzes] = await db1.execute(
      `SELECT quiz_id, title, total_questions, visible_questions 
       FROM quizzes 
       WHERE quiz_for_website = ? AND is_deleted IS NULL
       ORDER BY quiz_id ASC`,
      [quizType]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({ 
        error: `No quizzes available for ${quizType} users` 
      });
    }

    let completedQuizzes = [];
    if (userInfo.isAuthenticated) {
      // For authenticated users, get completion history
      const [completed] = await db1.execute(
        `SELECT DISTINCT quiz_id 
         FROM quiz_website 
         WHERE user_identifier = ? AND user_type = ? AND status = 'completed'`,
        [userInfo.userIdentifier, userInfo.userType]
      );
      completedQuizzes = completed.map(q => q.quiz_id);
    }

    res.json({
      quizzes,
      userType: userInfo.userType,
      isAuthenticated: userInfo.isAuthenticated,
      completedQuizzes,
      totalQuizzes: quizzes.length
    });

  } catch (error) {
    console.error("Error getting available quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCoursesWithQuizzes = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    const [courses] = await db2.execute(
      `SELECT id, title, image_url, description, quiz_price
       FROM courses WHERE is_active = 1 AND is_deleted = 'n' ORDER BY id ASC`
    );

    const coursesWithQuizzes = await Promise.all(
      courses.map(async (course) => {
        const [quizzes] = await db1.execute(
          `SELECT cqm.quiz_id, q.title, q.visible_questions,
                  q.total_questions, q.quiz_for_website
           FROM course_quiz_mapping cqm
           JOIN quizzes q ON q.quiz_id = cqm.quiz_id
           WHERE cqm.course_id = ? AND q.is_deleted IS NULL`,
          [course.id]
        );
        return { ...course, quizzes };
      })
    );

    const filtered = coursesWithQuizzes.filter(c => c.quizzes.length > 0);

    let paidCourseIds = [];
    if (userInfo.isAuthenticated) {
      const [paid] = await db1.execute(
      `SELECT course_id FROM payments
      WHERE CAST(user_identifier AS UNSIGNED) = ? AND payment_status = 'success'`,
      [parseInt(userInfo.userIdentifier)]
    );
    paidCourseIds = paid.map(p => parseInt(p.course_id));
    }

    res.json({
      success: true,
      courses: filtered,
      userType: userInfo.isAuthenticated ? userInfo.userType : 'free',
      isAuthenticated: userInfo.isAuthenticated,
      paidCourseIds
    });
  } catch (error) {
    console.error('Error fetching courses with quizzes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start quiz attempt
export const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.body;
    const userInfo = getUserInfo(req);

    // Get quiz without type restriction
    const [quiz] = await db1.execute(
      `SELECT quiz_id, title, total_questions, visible_questions, quiz_for_website
       FROM quizzes 
       WHERE quiz_id = ? AND is_deleted IS NULL`,
      [parseInt(quizId)]
    );

    if (quiz.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quizType = quiz[0].quiz_for_website;

    // Check access
    if (quizType === 'login' || quizType === 'paid') {
      if (!userInfo.isAuthenticated) {
        return res.status(401).json({ error: "Login required to attend this quiz" });
      }
    }

    // For paid quizzes check course payment
    if (quizType === 'paid') {
      const [mapping] = await db1.execute(
        `SELECT course_id FROM course_quiz_mapping WHERE quiz_id = ?`,
        [parseInt(quizId)]
      );

      console.log('Mapping for quiz', quizId, ':', mapping);

      if (mapping.length > 0) {
        const courseId = mapping[0].course_id;

        console.log('Checking payment for user:', userInfo.userIdentifier, 'course:', courseId);

        const [payment] = await db1.execute(
          `SELECT id FROM payments 
           WHERE CAST(user_identifier AS UNSIGNED) = ? 
           AND CAST(course_id AS UNSIGNED) = ? 
           AND payment_status = 'success'`,
          [parseInt(userInfo.userIdentifier), parseInt(courseId)]
        );

        console.log('Payment result:', payment);

        if (payment.length === 0) {
          return res.status(403).json({ error: "Payment required to attend this quiz" });
        }
      }
    }

    let attemptId = null;
    let continueExisting = false;

    if (userInfo.isAuthenticated) {
      // Check for existing in-progress attempt
      const [existingAttempt] = await db1.execute(
        `SELECT id FROM quiz_website 
         WHERE user_identifier = ? AND quiz_id = ? AND status = 'in_progress'
         ORDER BY started_at DESC LIMIT 1`,
        [userInfo.userIdentifier, parseInt(quizId)]
      );

      if (existingAttempt.length > 0) {
        attemptId = existingAttempt[0].id;
        continueExisting = true;
      } else {
        // Create new attempt — use 'login' as user_type for all authenticated users
        const [result] = await db1.execute(
          `INSERT INTO quiz_website 
           (user_identifier, user_type, user_id, quiz_id, status, started_at) 
           VALUES (?, ?, ?, ?, 'in_progress', NOW())`,
          [
            userInfo.userIdentifier,
            userInfo.userType || 'login',
            userInfo.userId,
            parseInt(quizId)
          ]
        );
        attemptId = result.insertId;
      }
    }

    res.json({
      success: true,
      attemptId,
      quiz: quiz[0],
      continueExisting,
      isFreeUser: !userInfo.isAuthenticated
    });

  } catch (error) {
    console.error("Error starting quiz attempt:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get quiz questions (one by one or all based on display_mode)
export const getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionIndex } = req.query;
    const userInfo = getUserInfo(req);

    // Determine expected quiz type
    // Get quiz without type restriction
const [quiz] = await db1.execute(
  `SELECT quiz_id, title, total_questions, visible_questions, display_mode, quiz_for_website
   FROM quizzes 
   WHERE quiz_id = ? AND is_deleted IS NULL`,
  [quizId]
);

if (quiz.length === 0) {
  return res.status(404).json({ error: "Quiz not found" });
}

// Check access
const quizType = quiz[0].quiz_for_website;
if (quizType !== 'free') {
  if (!userInfo.isAuthenticated) {
    return res.status(401).json({ error: "Login required" });
  }
  if (quizType === 'paid') {
  const [mapping] = await db1.execute(
    `SELECT course_id FROM course_quiz_mapping WHERE quiz_id = ?`,
    [parseInt(quizId)]
  );
  if (mapping.length > 0) {
    const courseId = mapping[0].course_id;  
    const [payment] = await db1.execute(
      `SELECT id FROM payments 
       WHERE CAST(user_identifier AS UNSIGNED) = ? 
       AND course_id = ? 
       AND payment_status = 'success'`,
      [parseInt(userInfo.userIdentifier), parseInt(courseId)]
    );
    if (payment.length === 0) {
      return res.status(403).json({ error: "Payment required to attend this quiz" });
    }
  }
}
}

    // Get questions for the quiz
    let questionsQuery = `
      SELECT question_id, question_text, options
      FROM quiz_questions 
      WHERE quiz_id = ? AND is_deleted IS NULL
      ORDER BY question_id ASC
    `;
    
    if (quiz[0].visible_questions && quiz[0].visible_questions < quiz[0].total_questions) {
      questionsQuery += ` LIMIT ${quiz[0].visible_questions}`;
    }

    const [questions] = await db1.execute(questionsQuery, [quizId]);

    if (questions.length === 0) {
      return res.status(404).json({ error: "No questions found for this quiz" });
    }

    // Parse options JSON safely
    const formattedQuestions = questions.map(q => {
      let parsedOptions = [];
      try {
        const parsed = JSON.parse(q.options);

        if (Array.isArray(parsed)) {
          parsedOptions = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          // Convert object { "1": "test1", "2": "test2" } → ["test1", "test2"]
          parsedOptions = Object.values(parsed);
        }
      } catch (e) {
        parsedOptions = [];
      }

      return {
        ...q,
        options: parsedOptions
      };
    });

    // If display_mode is one-by-one and questionIndex is specified
    if (quiz[0].display_mode === 'one_by_one' && questionIndex !== undefined) {
      const index = parseInt(questionIndex);
      if (index >= 0 && index < formattedQuestions.length) {
        return res.json({
          question: formattedQuestions[index],
          currentIndex: index,
          totalQuestions: formattedQuestions.length,
          isLastQuestion: index === formattedQuestions.length - 1
        });
      } else {
        return res.status(400).json({ error: "Invalid question index" });
      }
    }

    // Return all questions
    res.json({
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      quiz: quiz[0]
    });

  } catch (error) {
    console.error("Error getting quiz questions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Save quiz progress (only for authenticated users)
export const saveQuizProgress = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOption, currentQuestionIndex } = req.body;
    const userInfo = getUserInfo(req);

    // Only authenticated users can save progress
    if (!userInfo.isAuthenticated || !attemptId) {
      return res.json({
        success: true,
        message: 'Progress noted (not saved for free users)'
      });
    }

    // Verify attempt belongs to user
    const [attempt] = await db1.execute(
      `SELECT quiz_id, status, answers, questions 
      FROM quiz_website 
      WHERE id = ? AND user_identifier = ?`,
      [attemptId, userInfo.userIdentifier]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found" });
    }

    if (attempt[0].status === 'completed') {
      return res.status(400).json({ error: "This quiz attempt is already completed" });
    }

    // Get question details
    const [question] = await db1.execute(
      `SELECT question_text, options, correct_option 
       FROM quiz_questions 
       WHERE question_id = ? AND quiz_id = ? AND is_deleted IS NULL`,
      [questionId, attempt[0].quiz_id]
    );

    if (question.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Parse existing data
    let answers = [];
    let questions = [];
    try {
      answers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
      questions = attempt[0].questions ? JSON.parse(attempt[0].questions) : [];
    } catch (parseErr) {
      console.error('Error parsing existing data:', parseErr);
      answers = [];
      questions = [];
    }

    // Update or add the answer
    const existingAnswerIndex = answers.findIndex(a => a.question_id == questionId);
    const answerData = {
      question_id: parseInt(questionId),
      selected_option: selectedOption.toString() // Ensure it's stored as string
    };

    if (existingAnswerIndex >= 0) {
      answers[existingAnswerIndex] = answerData;
    } else {
      answers.push(answerData);
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

    // Update the attempt
    await db1.execute(
      `UPDATE quiz_website 
       SET answers = ?, questions = ?, current_question_index = ?
       WHERE id = ?`,
      [JSON.stringify(answers), JSON.stringify(questions), currentQuestionIndex, attemptId]
    );

    res.json({
      success: true,
      message: 'Progress saved successfully'
    });

  } catch (error) {
    console.error("Error saving quiz progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Complete quiz attempt
export const completeQuizAttempt = async (req, res) => {
  try {
    const { attemptId, answers, quizId } = req.body;
    const userInfo = getUserInfo(req);

    let attempt, questions, finalAnswers;

    if (!userInfo.isAuthenticated) {
      // Handle free user completion - no database storage
      if (!answers || !quizId) {
        return res.status(400).json({ error: "Missing answers or quiz ID for free user" });
      }

      // Get quiz questions for free user
      const [quizQuestions] = await db1.execute(
        `SELECT question_id, question_text, options, correct_option
         FROM quiz_questions 
         WHERE quiz_id = ? AND is_deleted IS NULL
         ORDER BY question_id ASC`,
        [quizId]
      );

      if (quizQuestions.length === 0) {
        return res.status(404).json({ error: "Quiz questions not found" });
      }

      // Format questions with parsed options
      questions = quizQuestions.map(q => ({
        question_id: q.question_id,
        question_text: q.question_text,
        options: JSON.parse(q.options),
        correct_option: q.correct_option
      }));

      // Convert answers object to array format
      finalAnswers = Object.keys(answers).map(questionId => ({
        question_id: parseInt(questionId),
        selected_option: answers[questionId]
      }));

    } else {
      // Handle authenticated user completion
      const [attemptData] = await db1.execute(
        `SELECT quiz_id, answers, questions, user_type
        FROM quiz_website 
        WHERE id = ? AND user_identifier = ? AND status = 'in_progress'`,
        [attemptId, userInfo.userIdentifier]
      );

      if (attemptData.length === 0) {
        return res.status(404).json({ error: "Quiz attempt not found or already completed" });
      }

      attempt = attemptData;

      // Parse answers and questions
      try {
        finalAnswers = attempt[0].answers ? JSON.parse(attempt[0].answers) : [];
        questions = attempt[0].questions ? JSON.parse(attempt[0].questions) : [];
      } catch (parseErr) {
        console.error('Error parsing quiz data:', parseErr);
        return res.status(500).json({ error: "Error parsing quiz data" });
      }
    }

    // Calculate score
    // let correctAnswers = 0;
    // const detailedResults = [];
    const answeredQuestions = finalAnswers.length;
let correctAnswers = 0;
const detailedResults = [];

    for (const answer of finalAnswers) {
      const question = questions.find(q => q.question_id === answer.question_id);
      if (question) {
        // const isCorrect = answer.selected_option === question.correct_option;
        const isCorrect = parseInt(answer.selected_option) === parseInt(question.correct_option);
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

    // const totalQuestions = questions.length;
    const totalQuestions = answeredQuestions; // Change this line
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Update attempt as completed (only for authenticated users)
    if (userInfo.isAuthenticated && attemptId) {
      await db1.execute(
        `UPDATE quiz_website 
         SET status = 'completed', score = ?, percentage = ?, completed_at = NOW()
         WHERE id = ?`,
        [correctAnswers, percentage, attemptId]
      );
    }

    // Determine next action button based on user type
    let nextAction = null;
    if (!userInfo.isAuthenticated) {
      nextAction = { type: 'login', text: 'Login to attend more quizzes' };
    } else if (userInfo.userType === 'login' || userInfo.userType === 'signup') {
      nextAction = { type: 'payment', text: 'Pay to unlock premium quizzes' };
    }

    res.json({
      success: true,
      score: correctAnswers,
      totalQuestions,
      percentage: percentage.toFixed(2),
      details: detailedResults,
      nextAction,
      userType: userInfo.userType,
      isFreeUser: !userInfo.isAuthenticated
    });

  } catch (error) {
    console.error("Error completing quiz attempt:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Get quiz attempt history (only for authenticated users)
export const getQuizAttemptHistory = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    if (!userInfo.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required to view history" });
    }

    // Fetch ALL attempts for this user regardless of quiz type or user_type
    const [results] = await db1.execute(
      `SELECT 
        qw.id,
        qw.quiz_id,
        q.title as quiz_title,
        q.visible_questions,
        q.total_questions,
        q.quiz_for_website,
        qw.score,
        qw.percentage,
        qw.status,
        qw.user_type,
        qw.started_at,
        qw.completed_at
       FROM quiz_website qw
       JOIN quizzes q ON qw.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qw.user_identifier = ?
       ORDER BY qw.started_at DESC`,
      [userInfo.userIdentifier]
    );

    const attempts = results.map(attempt => ({
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      quiz_title: attempt.quiz_title,
      score: attempt.score,
      total_questions: attempt.visible_questions || attempt.total_questions,
      visible_questions: attempt.visible_questions,
      percentage: attempt.percentage,
      status: attempt.status,
      user_type: attempt.user_type,
      quiz_for_website: attempt.quiz_for_website,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at
    }));

    // Split for backward compatibility with frontend
    const paidAttempts = attempts.filter(a => a.quiz_for_website === 'paid')
    const loginAttempts = attempts.filter(a => a.quiz_for_website !== 'paid')

    res.json({
      success: true,
      attempts,           // all attempts combined — use this in frontend
      paidAttempts,
      loginAttempts,
      userType: userInfo.userType,
      totalPaidAttempts: paidAttempts.length,
      totalLoginAttempts: loginAttempts.length
    });

  } catch (error) {
    console.error("Error fetching quiz attempt history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get quiz attempt history for a specific user by user id
export const getQuizHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const [results] = await db1.execute(
      `SELECT 
         qw.id,
         qw.quiz_id,
         q.title AS quiz_title,
         qw.score,
         qw.percentage,
         qw.status,
         qw.user_type,
         qw.started_at,
         qw.completed_at,
         qw.started_at
       FROM quiz_website qw
       LEFT JOIN quizzes q ON qw.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE CAST(qw.user_identifier AS UNSIGNED) = ?
       ORDER BY qw.started_at DESC`,
      [parseInt(userId, 10)]
    );

    const history = results.map((attempt) => ({
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      quiz_title: attempt.quiz_title,
      score: attempt.score,
      percentage: attempt.percentage,
      status: attempt.status,
      user_type: attempt.user_type,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      created_at: attempt.started_at,
    }));

    res.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("Error fetching quiz history by user id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get detailed quiz attempt results
export const getQuizAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [attempt] = await db1.execute(
      `SELECT 
        qw.*,
        q.title as quiz_title,
        q.visible_questions,
        q.total_questions
       FROM quiz_website qw
       JOIN quizzes q ON qw.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qw.id = ? AND qw.user_identifier = ?`,
      [attemptId, userInfo.userIdentifier]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: "Quiz attempt not found" });
    }

    const attemptData = attempt[0];

    // Parse detailed results
    let parsedDetails = [];
    try {
      const answers = attemptData.answers ? JSON.parse(attemptData.answers) : [];
      const questions = attemptData.questions ? JSON.parse(attemptData.questions) : [];

      // Create detailed results with proper structure
      parsedDetails = answers.map(answer => {
        const question = questions.find(q => q.question_id === answer.question_id);
        if (question) {
          // Ensure options are properly structured
          let options = {};
          try {
            if (typeof question.options === 'string') {
              options = JSON.parse(question.options);
            } else if (typeof question.options === 'object') {
              options = question.options;
            }
          } catch (e) {
            console.error('Error parsing options:', e);
            options = {};
          }

          // Convert options to consistent format if needed
          if (Array.isArray(options)) {
            const optionsObj = {};
            options.forEach((opt, idx) => {
              optionsObj[(idx + 1).toString()] = opt;
            });
            options = optionsObj;
          }

          const isCorrect = parseInt(answer.selected_option) === parseInt(question.correct_option);

          return {
            question_id: answer.question_id,
            question_text: question.question_text,
            options: options,
            selected_option: answer.selected_option?.toString(),
            correct_option: question.correct_option?.toString(),
            is_correct: isCorrect
          };
        }
        return null;
      }).filter(Boolean);

    } catch (parseErr) {
      console.error('Error parsing quiz data:', parseErr);
      return res.status(500).json({ error: "Error parsing quiz data" });
    }

    // Structure the response properly
    const responseData = {
      attempt: {
        id: attemptData.id,
        quiz_id: attemptData.quiz_id,
        quiz_title: attemptData.quiz_title,
        score: attemptData.score,
        // Use visible_questions as the total for consistency
        total_questions: attemptData.visible_questions || attemptData.total_questions,
        visible_questions: attemptData.visible_questions,
        percentage: attemptData.percentage,
        status: attemptData.status,
        started_at: attemptData.started_at,
        completed_at: attemptData.completed_at,
        user_type: attemptData.user_type
      },
      details: parsedDetails,
      // Also provide questions array for backward compatibility
      questions: parsedDetails
    };

    res.json(responseData);

  } catch (error) {
    console.error("Error fetching quiz attempt details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Handle payment for premium quizzes
export const processQuizPayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userInfo = getUserInfo(req);

    if (!userInfo.isAuthenticated) {
      return res.status(401).json({ error: 'Login required to purchase' });
    }

    // Fix: use CAST to handle string vs integer mismatch in user_identifier
    const [existing] = await db1.execute(
      `SELECT id FROM payments
       WHERE CAST(user_identifier AS UNSIGNED) = ? 
       AND course_id = ? 
       AND payment_status = 'success'`,
      [parseInt(userInfo.userIdentifier), parseInt(courseId)]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already purchased quiz access for this course' });
    }

    const [course] = await db2.execute(
      `SELECT id, title, quiz_price FROM courses WHERE id = ? AND is_active = 1`,
      [parseInt(courseId)]
    );

    if (course.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const price = parseFloat(course[0].quiz_price);
    if (price <= 0) {
      return res.status(400).json({ error: 'This course has free quiz access' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(price * 100),
      currency: 'INR',
      receipt: `course_${courseId}_${userInfo.userId}_${Date.now()}`,
      notes: { course_id: String(courseId) }
    });

    // Fix: store user_identifier as integer to stay consistent
    await db1.execute(
      `INSERT INTO payments
       (user_id, user_identifier, course_id, razorpay_order_id, amount, currency, payment_status)
       VALUES (?, ?, ?, ?, ?, 'INR', 'pending')`,
      [
        userInfo.userId || null,
        parseInt(userInfo.userIdentifier),  // store as integer
        parseInt(courseId),                  // store as integer
        order.id,
        price
      ]
    );

    res.json({
      success: true,
      orderId: order.id,
      amount: Math.round(price * 100),
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      courseTitle: course[0].title,
      price
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

export const verifyQuizPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    const userInfo = getUserInfo(req);

    if (!userInfo.isAuthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      await db1.execute(
        `UPDATE payments SET payment_status='failed',
         razorpay_payment_id=?, razorpay_signature=?, updated_at=NOW()
         WHERE razorpay_order_id=? AND user_identifier=?`,
        [razorpay_payment_id, razorpay_signature, razorpay_order_id, userInfo.userIdentifier]
      );
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    await db1.execute(
      `UPDATE payments SET payment_status='success',
       razorpay_payment_id=?, razorpay_signature=?, updated_at=NOW()
       WHERE razorpay_order_id=? AND user_identifier=?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id, userInfo.userIdentifier]
    );

    res.json({
      success: true,
      message: 'Payment successful! All quizzes in this course are now unlocked.',
      courseId
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Get payment history for a specific user by user id
export const getPaymentHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const [payments] = await db1.execute(
      `SELECT 
         id,
         user_id,
         user_identifier,
         course_id,
         razorpay_order_id,
         amount,
         currency,
         payment_status,
         created_at,
         updated_at
       FROM payments
       WHERE CAST(user_identifier AS UNSIGNED) = ?
       ORDER BY created_at DESC`,
      [parseInt(userId, 10)]
    );

    res.json({
      success: true,
      payments,
      total: payments.length,
    });
  } catch (error) {
    console.error('Error fetching payment history by user id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get total amount of successful payments
export const getTotalPaymentStats = async (req, res) => {
  try {
    const [result] = await db1.execute(
      `SELECT 
         SUM(amount) as total_amount,
         COUNT(*) as total_payments
       FROM payments
       WHERE payment_status = 'success'`
    );

    const totalAmount = result[0]?.total_amount || 0;
    const totalPayments = result[0]?.total_payments || 0;

    res.json({
      success: true,
      totalAmount: parseFloat(totalAmount),
      totalPayments: parseInt(totalPayments),
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error fetching total payment stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// This function is no longer needed as we use JWT token presence for logic
export const checkShowLogin = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    res.json({ 
      showLogin: !userInfo.isAuthenticated,
      userType: userInfo.userType,
      isAuthenticated: userInfo.isAuthenticated
    });

  } catch (error) {
    console.error("Error checking login status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current attempt progress (only for authenticated users)
export const getAttemptProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [attempt] = await db1.execute(
      `SELECT 
        qw.*,
        q.title as quiz_title,
        q.total_questions,
        q.visible_questions
       FROM quiz_website qw
       JOIN quizzes q ON qw.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE qw.id = ? AND qw.user_identifier = ? AND qw.status = 'in_progress'`,
      [attemptId, userInfo.userIdentifier]
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
    console.error("Error fetching attempt progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Sync user with quiz system (called after login/signup)
export const syncUserWithQuizSystem = async (req, res) => {
  try {
    const { userId, email, name, userType, role } = req.body;
    
    // Store or update user info in quiz system if needed
    // This could be stored in a separate table or just acknowledged
    
    res.json({
      success: true,
      userType,
      message: 'User synced with quiz system',
      userData: { userId, email, name, userType, role }
    });
    
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};