// Define the Question class
class Question {
    constructor(question, type, options, correct, explanation, topic) {
        this.question = question;
        this.type = type;
        this.options = options;
        this.correct = correct;
        this.explanation = explanation;
        this.topic = topic;
    }

    // Check if the user's answer is correct
    isCorrect(userAnswer) {
        if (this.type === "single") {
            return userAnswer.length === 1 && userAnswer[0] === this.correct[0];
        } else if (this.type === "multiple") {
            return userAnswer.sort().join() === this.correct.sort().join();
        }
        return false;
    }

    // Provide feedback for the answer
    getFeedback() {
        return this.explanation;
    }
}

// Global variables
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let readinessThreshold = 65; // Default threshold
let allQuestions = []; // Store all questions
let filteredQuestions = []; // Store filtered questions
let answeredQuestions = []; // Store user answers for review
let bookmarkedQuestions = new Set(); // Store bookmarked questions
let timer = null;
let timeRemaining = 0;
let timerEnabled = false;
let darkModeEnabled = localStorage.getItem('darkMode') === 'true';
let topicFilter = 'all';
let studyMode = false;
let questionHistory = JSON.parse(localStorage.getItem('questionHistory') || '[]'); // Track question history

// Thresholds for each test (stored in script.js, not JSON files)
const thresholds = {
    "Salesforce Certified AI Associate": 65,
    "Salesforce Certified AI Specialist": 73,
    "Data Cloud Consultant": 62,
    "Data Cloud Consultant Additional Questions": 62,
    "Platform Developer 1": 68,
    "Platform Developer 2": 70,
    "Salesforce Certified Experience Cloud Consultant": 65
};

// Fisher-Yates shuffle function to randomize arrays
function shuffleArray(array) {
    const shuffled = [...array]; // Create a copy to avoid modifying the original
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Update progress bar and score display
function updateProgress() {
    const correctCount = score;
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Update text display (e.g., "Correct Answers: 1/100 (1%)")
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('score-percentage').textContent = percentage.toFixed(0) + '%';

    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';
    progressBar.style.backgroundColor = percentage >= readinessThreshold ? '#4CAF50' : '#f44336'; // Green if >= threshold, red otherwise
}

// Load questions from the selected JSON file
async function loadQuestions(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error('Failed to load questions');
        const data = await response.json();
        return data.map(q => new Question(
            q.question, 
            q.type || "single", 
            q.options, 
            q.correct || [q.correctAnswer], 
            q.explanation,
            q.topic
        ));
    } catch (error) {
        console.error('Error loading questions:', error);
        throw error;
    }
}

// Filter questions by topic
function filterQuestionsByTopic(questions, topic) {
    if (topic === 'all') {
        return questions;
    }
    return questions.filter(q => q.topic === topic);
}

// Get unique topics from questions
function getTopics(questions) {
    const topics = new Set();
    questions.forEach(q => {
        if (q.topic) {
            topics.add(q.topic);
        }
    });
    return Array.from(topics).sort();
}

// Populate topic filter dropdown
function populateTopicFilter(topics) {
    const topicFilter = document.getElementById('topic-filter');
    topicFilter.innerHTML = '<option value="all">All Topics</option>';
    
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicFilter.appendChild(option);
    });
}

// Start the quiz with the selected test
async function startQuiz(fileName, testName) {
    try {
        // Reset state
        allQuestions = await loadQuestions(fileName);
        readinessThreshold = thresholds[testName] || 70; // Set threshold based on testName, default to 70
        
        // Get all unique topics
        const topics = getTopics(allQuestions);
        populateTopicFilter(topics);
        
        // Apply topic filter if set
        if (topicFilter !== 'all') {
            filteredQuestions = filterQuestionsByTopic(allQuestions, topicFilter);
        } else {
            filteredQuestions = [...allQuestions];
        }
        
        questions = [...filteredQuestions];
        
        // Reset state
        currentQuestionIndex = 0;
        score = 0;
        answeredQuestions = [];
        
        // Update UI
        updateProgress();
        document.getElementById('score-container').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';
        document.getElementById('review-container').style.display = 'none';
        
        // Start timer if enabled
        if (timerEnabled) {
            startTimer();
        }
        
        loadQuestion();
    } catch (error) {
        document.getElementById('message').textContent = 'Failed to load questions. Please try again.';
    }
}

// Load the current question with shuffled options
function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showScore();
        return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
    document.getElementById('question-number').textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    
    // Display topic if available
    const topicDisplay = document.getElementById('question-topic');
    if (currentQuestion.topic) {
        topicDisplay.textContent = `Topic: ${currentQuestion.topic}`;
        topicDisplay.style.display = 'block';
    } else {
        topicDisplay.style.display = 'none';
    }
    
    // Handle bookmark status
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (bookmarkedQuestions.has(currentQuestionIndex)) {
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarked';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Bookmark';
    }
    
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    // Shuffle the options for randomization
    const shuffledOptions = shuffleArray(currentQuestion.options);

    shuffledOptions.forEach((option) => {
        const label = document.createElement('label');
        label.classList.add('option');
        const input = document.createElement('input');
        input.type = currentQuestion.type === 'single' ? 'radio' : 'checkbox';
        input.name = 'option';
        input.value = option;
        label.appendChild(input);
        label.appendChild(document.createTextNode(option));
        optionsContainer.appendChild(label);
    });

    // Clear feedback
    const feedback = document.getElementById('feedback');
    feedback.textContent = '';
    feedback.style.display = 'none';
    
    // Show submit button, hide next button
    document.getElementById('submit-btn').style.display = 'block';
    document.getElementById('next-btn').style.display = 'none';
    
    // In study mode, show explanation right away
    if (studyMode) {
        feedback.textContent = currentQuestion.explanation;
        feedback.style.display = 'block';
        feedback.style.color = '#333';
        document.getElementById('next-btn').style.display = 'block';
    }
}

// Check the user's answer
function checkAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(input => input.value);
    const isCorrect = currentQuestion.isCorrect(selectedOptions);

    if (isCorrect) {
        score++;
    }
    
    // Store the answer for review
    answeredQuestions.push({
        question: currentQuestion,
        userAnswer: selectedOptions,
        isCorrect: isCorrect,
        index: currentQuestionIndex
    });
    
    // Add to question history
    const historyEntry = {
        question: currentQuestion.question,
        topic: currentQuestion.topic,
        isCorrect: isCorrect,
        date: new Date().toISOString()
    };
    questionHistory.push(historyEntry);
    localStorage.setItem('questionHistory', JSON.stringify(questionHistory));
    
    updateProgress();

    const feedback = document.getElementById('feedback');
    feedback.textContent = isCorrect ? "Correct! " + currentQuestion.getFeedback() : "Incorrect. " + currentQuestion.getFeedback();
    feedback.style.color = isCorrect ? 'green' : 'red';
    feedback.style.display = 'block';

    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';
    
    // Highlight correct and incorrect answers
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        const input = option.querySelector('input');
        const isUserSelected = selectedOptions.includes(input.value);
        const isCorrectOption = currentQuestion.correct.includes(input.value);
        
        if (isCorrectOption) {
            option.classList.add('correct-option');
        } else if (isUserSelected && !isCorrectOption) {
            option.classList.add('incorrect-option');
        }
        
        // Disable all inputs
        input.disabled = true;
    });
}

// Display the final score
function showScore() {
    // Stop timer if running
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('feedback').textContent = '';
    
    const scoreContainer = document.getElementById('score-container');
    scoreContainer.style.display = 'block';
    document.getElementById('score').textContent = `${score} out of ${questions.length} (${Math.round(score/questions.length*100)}%)`;
    
    // Show result threshold
    const resultMessage = document.getElementById('result-message');
    const passPercentage = Math.round(score/questions.length*100);
    if (passPercentage >= readinessThreshold) {
        resultMessage.textContent = `Congratulations! You've exceeded the ${readinessThreshold}% readiness threshold.`;
        resultMessage.style.color = 'green';
    } else {
        resultMessage.textContent = `You need to reach ${readinessThreshold}% to be ready for the certification.`;
        resultMessage.style.color = 'red';
    }
    
    // Show review button
    document.getElementById('review-btn').style.display = 'block';
    
    // Show analytics
    generateAnalytics();
}

// Generate performance analytics
function generateAnalytics() {
    const analyticsContainer = document.getElementById('analytics-container');
    analyticsContainer.innerHTML = '<h3>Performance by Topic</h3>';
    
    // Group questions by topic
    const topicPerformance = {};
    
    answeredQuestions.forEach(qa => {
        const topic = qa.question.topic || 'Unknown';
        if (!topicPerformance[topic]) {
            topicPerformance[topic] = { correct: 0, total: 0 };
        }
        
        topicPerformance[topic].total += 1;
        if (qa.isCorrect) {
            topicPerformance[topic].correct += 1;
        }
    });
    
    // Create table
    const table = document.createElement('table');
    table.classList.add('analytics-table');
    
    // Add header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Topic', 'Score', 'Performance'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    Object.entries(topicPerformance).forEach(([topic, performance]) => {
        const row = document.createElement('tr');
        
        // Topic name
        const topicCell = document.createElement('td');
        topicCell.textContent = topic;
        row.appendChild(topicCell);
        
        // Score
        const scoreCell = document.createElement('td');
        scoreCell.textContent = `${performance.correct}/${performance.total} (${Math.round(performance.correct/performance.total*100)}%)`;
        row.appendChild(scoreCell);
        
        // Performance bar
        const barCell = document.createElement('td');
        const progressBar = document.createElement('div');
        progressBar.classList.add('topic-progress-bar-container');
        
        const progressFill = document.createElement('div');
        progressFill.classList.add('topic-progress-bar');
        const percentage = Math.round(performance.correct/performance.total*100);
        progressFill.style.width = `${percentage}%`;
        progressFill.style.backgroundColor = percentage >= readinessThreshold ? '#4CAF50' : '#f44336';
        
        progressBar.appendChild(progressFill);
        barCell.appendChild(progressBar);
        row.appendChild(barCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    analyticsContainer.appendChild(table);
}

// Show review of all questions
function showReview() {
    document.getElementById('score-container').style.display = 'none';
    document.getElementById('review-container').style.display = 'block';
    
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    
    answeredQuestions.forEach((qa, index) => {
        const reviewItem = document.createElement('div');
        reviewItem.classList.add('review-item');
        reviewItem.classList.add(qa.isCorrect ? 'correct-review' : 'incorrect-review');
        
        // Question number and result
        const header = document.createElement('div');
        header.classList.add('review-header');
        header.textContent = `Question ${index + 1}: ${qa.isCorrect ? 'Correct' : 'Incorrect'}`;
        reviewItem.appendChild(header);
        
        // Question topic
        if (qa.question.topic) {
            const topic = document.createElement('div');
            topic.classList.add('review-topic');
            topic.textContent = `Topic: ${qa.question.topic}`;
            reviewItem.appendChild(topic);
        }
        
        // Question text
        const questionText = document.createElement('div');
        questionText.classList.add('review-question');
        questionText.textContent = qa.question.question;
        reviewItem.appendChild(questionText);
        
        // User's answer
        const userAnswer = document.createElement('div');
        userAnswer.classList.add('review-answer');
        userAnswer.textContent = `Your answer: ${qa.userAnswer.join(', ')}`;
        reviewItem.appendChild(userAnswer);
        
        // Correct answer
        const correctAnswer = document.createElement('div');
        correctAnswer.classList.add('review-correct');
        correctAnswer.textContent = `Correct answer: ${qa.question.correct.join(', ')}`;
        reviewItem.appendChild(correctAnswer);
        
        // Explanation
        const explanation = document.createElement('div');
        explanation.classList.add('review-explanation');
        explanation.textContent = qa.question.explanation;
        reviewItem.appendChild(explanation);
        
        reviewList.appendChild(reviewItem);
    });
}

// Start/reset the timer
function startTimer() {
    // Clear any existing timer
    if (timer) {
        clearInterval(timer);
    }
    
    // Set initial time (e.g., 2 minutes per question)
    timeRemaining = questions.length * 2 * 60; // 2 min per question in seconds
    
    updateTimerDisplay();
    
    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            alert('Time is up!');
            showScore();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer-display').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Toggle dark mode
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    darkModeEnabled = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', darkModeEnabled);
    
    // Update icon
    const darkModeIcon = document.getElementById('dark-mode-icon');
    if (darkModeEnabled) {
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
    } else {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
    }
}

// Toggle bookmark for current question
function toggleBookmark() {
    const bookmarkBtn = document.getElementById('bookmark-btn');
    
    if (bookmarkedQuestions.has(currentQuestionIndex)) {
        bookmarkedQuestions.delete(currentQuestionIndex);
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Bookmark';
    } else {
        bookmarkedQuestions.add(currentQuestionIndex);
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarked';
    }
    
    // Save bookmarks to localStorage
    localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarkedQuestions)));
}

// Load bookmarked questions
function loadBookmarkedQuestions() {
    const savedBookmarks = localStorage.getItem('bookmarks');
    if (savedBookmarks) {
        bookmarkedQuestions = new Set(JSON.parse(savedBookmarks));
    }
}

// Filter questions by bookmarks
function showBookmarkedQuestions() {
    if (bookmarkedQuestions.size === 0) {
        alert('No bookmarked questions yet. Bookmark questions during the quiz to review them later.');
        return;
    }
    
    questions = bookmarkedQuestions.size > 0 
        ? Array.from(bookmarkedQuestions).map(index => allQuestions[index]) 
        : [...allQuestions];
    
    currentQuestionIndex = 0;
    score = 0;
    answeredQuestions = [];
    
    updateProgress();
    document.getElementById('score-container').style.display = 'none';
    document.getElementById('review-container').style.display = 'none';
    document.getElementById('question-container').style.display = 'block';
    
    loadQuestion();
}

// Toggle study mode
function toggleStudyMode() {
    studyMode = !studyMode;
    document.getElementById('study-mode-btn').textContent = studyMode ? 'Quiz Mode' : 'Study Mode';
    
    if (studyMode) {
        // If in study mode, show explanation for current question
        const currentQuestion = questions[currentQuestionIndex];
        document.getElementById('feedback').textContent = currentQuestion.explanation;
        document.getElementById('feedback').style.display = 'block';
        document.getElementById('feedback').style.color = '#333';
        document.getElementById('next-btn').style.display = 'block';
    } else {
        // If moving to quiz mode, hide feedback unless answered
        const submitVisible = document.getElementById('submit-btn').style.display !== 'none';
        if (submitVisible) {
            document.getElementById('feedback').style.display = 'none';
            document.getElementById('next-btn').style.display = 'none';
        }
    }
}

// Toggle timer
function toggleTimer() {
    timerEnabled = !timerEnabled;
    document.getElementById('timer-btn').textContent = timerEnabled ? 'Disable Timer' : 'Enable Timer';
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerEnabled) {
        timerDisplay.style.display = 'inline-block';
        startTimer();
    } else {
        timerDisplay.style.display = 'none';
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load saved bookmarks
    loadBookmarkedQuestions();
    
    // Set up event listeners
    const testSelector = document.getElementById('test-selector');
    const startBtn = document.getElementById('start-quiz');
    const message = document.getElementById('message');
    const testSelection = document.getElementById('test-selection');
    const quizContainer = document.getElementById('quiz-container');
    const testNameHeading = document.getElementById('test-name');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const topicFilterSelect = document.getElementById('topic-filter');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const studyModeBtn = document.getElementById('study-mode-btn');
    const timerBtn = document.getElementById('timer-btn');
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const reviewBtn = document.getElementById('review-btn');
    const returnToScoreBtn = document.getElementById('return-to-score-btn');
    const returnToTestBtn = document.getElementById('return-to-test-btn');
    const bookmarkedBtn = document.getElementById('bookmarked-btn');

    startBtn.addEventListener('click', () => {
        const selectedFile = testSelector.value;
        const testName = testSelector.selectedOptions[0].text; // Get test name from dropdown
        if (!selectedFile) {
            message.textContent = "Please select a test.";
            return;
        }
        message.textContent = "";
        testNameHeading.textContent = testName;
        testSelection.style.display = 'none';
        quizContainer.style.display = 'block';
        startQuiz(selectedFile, testName);
    });

    submitBtn.addEventListener('click', checkAnswer);

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex + 1 < questions.length) {
            currentQuestionIndex++;
            loadQuestion();
        } else {
            showScore();
        }
    });
    
    topicFilterSelect.addEventListener('change', () => {
        topicFilter = topicFilterSelect.value;
        if (allQuestions.length > 0) {
            filteredQuestions = filterQuestionsByTopic(allQuestions, topicFilter);
            questions = [...filteredQuestions];
            currentQuestionIndex = 0;
            score = 0;
            answeredQuestions = [];
            updateProgress();
            loadQuestion();
        }
    });
    
    darkModeBtn.addEventListener('click', toggleDarkMode);
    studyModeBtn.addEventListener('click', toggleStudyMode);
    timerBtn.addEventListener('click', toggleTimer);
    bookmarkBtn.addEventListener('click', toggleBookmark);
    
    reviewBtn.addEventListener('click', showReview);
    
    returnToScoreBtn.addEventListener('click', () => {
        document.getElementById('review-container').style.display = 'none';
        document.getElementById('score-container').style.display = 'block';
    });
    
    returnToTestBtn.addEventListener('click', () => {
        document.getElementById('score-container').style.display = 'none';
        document.getElementById('review-container').style.display = 'none';
        document.getElementById('test-selection').style.display = 'block';
        document.getElementById('quiz-container').style.display = 'none';
    });
    
    bookmarkedBtn.addEventListener('click', showBookmarkedQuestions);
    
    // Initialize dark mode if previously enabled
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-icon').classList.remove('fa-moon');
        document.getElementById('dark-mode-icon').classList.add('fa-sun');
    }
});
