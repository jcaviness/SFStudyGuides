// Global variables
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let readinessThreshold = 65; // Default threshold if none is specified
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
let certificationThresholds = {}; // Will store all thresholds loaded from the JSON file

// Define the Question class
class Question {
    constructor(question, type, options, correct, explanation, topic) {
        this.question = question;
        this.type = type || "single"; // Default to single if not specified
        this.options = options;
        this.correct = Array.isArray(correct) ? correct : [correct];
        this.explanation = explanation || "";
        this.topic = topic || "";
    }

    // Check if the user's answer is correct
    isCorrect(userAnswer) {
        if (this.type === "single") {
            return userAnswer.length === 1 && userAnswer[0] === this.correct[0];
        } else if (this.type === "multiple") {
            // For multiple choice, all correct options must be selected and nothing else
            if (userAnswer.length !== this.correct.length) return false;
            return userAnswer.sort().join(',') === this.correct.sort().join(',');
        }
        return false;
    }

    // Provide feedback for the answer
    getFeedback() {
        return this.explanation;
    }
}

// Load certification thresholds from the JSON file
async function loadCertificationThresholds() {
    try {
        console.log('Loading certification thresholds...');
        const response = await fetch('./certification-thresholds.json');
        
        if (!response.ok) {
            console.error('Failed to load thresholds, status:', response.status);
            throw new Error(`Failed to load thresholds: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Successfully loaded thresholds data');
        
        if (data.thresholds) {
            certificationThresholds = data.thresholds;
            console.log(`Loaded thresholds for ${Object.keys(certificationThresholds).length} certifications`);
        } else {
            console.warn('Thresholds data not found in expected format');
        }
    } catch (error) {
        console.error('Error loading certification thresholds:', error);
        // Use default thresholds as fallback
    }
}

// Find threshold for a specific certification
function getThresholdForCertification(certificationName) {
    // Try to match the exact certification name
    if (certificationThresholds[certificationName]) {
        return certificationThresholds[certificationName];
    }
    
    // Try to match by doing a partial search
    for (const [cert, threshold] of Object.entries(certificationThresholds)) {
        if (certificationName.includes(cert) || cert.includes(certificationName)) {
            console.log(`Found matching threshold for ${certificationName} using partial match with ${cert}`);
            return threshold;
        }
    }
    
    // If no match found, return default threshold
    console.log(`No threshold found for ${certificationName}, using default: ${readinessThreshold}`);
    return readinessThreshold;
}

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

// Robust function to parse different JSON question formats
function processQuestion(q) {
    // Defensive approach - ensure we have at least the basic structure
    if (!q || typeof q !== 'object') {
        console.warn('Invalid question object:', q);
        return null;
    }

    // Try to extract question text from various possible fields
    const questionText = q.question || q.questionText || q.text || q.title || "Question text missing";
    
    // Extract options - handle different possible formats
    let options = [];
    if (Array.isArray(q.options)) {
        options = q.options;
    } else if (q.choices && Array.isArray(q.choices)) {
        options = q.choices;
    } else if (q.answers && Array.isArray(q.answers)) {
        // Some formats might have an array of answer objects with text/value properties
        options = q.answers.map(a => a.text || a.value || a);
    }

    // Determine the question type (single/multiple)
    let type = q.type || "single";
    // Some formats use different terminology
    if (q.questionType === "multiselect" || q.isMultipleChoice === true) {
        type = "multiple";
    }

    // Extract correct answer(s) from various possible fields
    let correct = [];
    if (q.correct !== undefined) {
        correct = q.correct;
    } else if (q.correctAnswer !== undefined) {
        correct = q.correctAnswer;
    } else if (q.answer !== undefined) {
        correct = q.answer;
    } else if (q.correctAnswers !== undefined) {
        correct = q.correctAnswers;
    } else if (q.answers && Array.isArray(q.answers)) {
        // Some formats mark the correct answers within the answers array
        correct = q.answers
            .filter(a => a.isCorrect || a.correct)
            .map(a => a.text || a.value || a);
    }

    // Extract explanation
    const explanation = q.explanation || q.feedback || q.rationale || q.correctExplanation || "";

    // Extract topic
    const topic = q.topic || q.category || q.subject || "";

    // Ensure correct is always an array for consistency
    if (!Array.isArray(correct)) {
        correct = [correct];
    }

    // Filter out any null or undefined values from correct array
    correct = correct.filter(c => c !== null && c !== undefined);

    // Create and return the question object
    return new Question(
        questionText,
        type,
        options,
        correct,
        explanation,
        topic
    );
}

// Load questions from the selected JSON file
async function loadQuestions(fileName) {
    try {
        console.log('Loading questions from:', fileName);
        const response = await fetch(fileName);
        
        if (!response.ok) {
            console.error('Failed to load questions, status:', response.status);
            throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
        }
        
        let data = await response.json();
        console.log('Successfully loaded data from', fileName);
        
        // Handle special case for Salesforce admin format, which has questions nested in an array with ids
        if (fileName.includes('sf-admin-cert-questions.json')) {
            console.log('Detected Salesforce admin format');
        }
        
        // Handle potential wrapper structures - sometimes questions are nested in a data property
        if (data.questions && Array.isArray(data.questions)) {
            data = data.questions;
        } else if (data.data && Array.isArray(data.data)) {
            data = data.data;
        } else if (!Array.isArray(data)) {
            // If it's not an array or doesn't have a standard questions/data array property,
            // try to convert it to an array of the property values
            const possibleDataArrays = Object.values(data).filter(val => Array.isArray(val));
            if (possibleDataArrays.length > 0) {
                // Use the longest array we can find as our data source
                data = possibleDataArrays.reduce((a, b) => a.length > b.length ? a : b);
            } else {
                // If we can't find an array, try to make an array of the values
                console.warn('Could not find an array of questions, attempting to convert object to array');
                data = Object.values(data);
            }
        }
        
        console.log(`Processing ${data.length} questions`);
        
        // Process each question using our robust processing function
        const questions = data.map(q => processQuestion(q)).filter(q => q !== null);
        
        // Verify we have valid questions
        if (questions.length === 0) {
            throw new Error('No valid questions found in the file');
        }
        
        // Verify that each question has options
        const invalidQuestions = questions.filter(q => !q.options || q.options.length === 0);
        if (invalidQuestions.length > 0) {
            console.warn(`${invalidQuestions.length} questions have no options:`, invalidQuestions);
        }
        
        console.log(`Successfully processed ${questions.length} valid questions`);
        return questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('message').textContent = `Failed to load questions: ${error.message}`;
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
        document.getElementById('message').textContent = 'Loading questions...';
        
        // Reset state
        allQuestions = await loadQuestions(fileName);
        
        console.log(`Loaded ${allQuestions.length} questions for ${testName}`);
        
        if (allQuestions.length === 0) {
            document.getElementById('message').textContent = 'No questions found in the selected file.';
            return;
        }
        
        document.getElementById('message').textContent = '';
        
        // Look up the threshold for this certification
        readinessThreshold = getThresholdForCertification(testName);
        console.log(`Using readiness threshold of ${readinessThreshold}% for ${testName}`);
        
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
        console.error('Error starting quiz:', error);
        document.getElementById('message').textContent = `Failed to load questions: ${error.message}`;
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
    
    if (selectedOptions.length === 0) {
        alert("Please select an answer");
        return;
    }
    
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app');
    
    // Load certification thresholds first
    await loadCertificationThresholds();
    
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
        console.log('Starting quiz with file:', selectedFile, 'and test name:', testName);
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
    
    console.log('App initialization complete');
});