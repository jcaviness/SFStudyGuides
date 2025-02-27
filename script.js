// Define the Question class
class Question {
    constructor(question, type, options, correct, explanation) {
        this.question = question;
        this.type = type;
        this.options = options;
        this.correct = correct;
        this.explanation = explanation;
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
let selectedTestName = ''; // To store the current test name

// Map test names to readiness thresholds
const readinessThresholds = {
    'AgentForce': 73,           // 73%
    'Data Cloud': 62,          // 62%
    'Platform Developer 1': 68, // 68%
    'Platform Developer 2': 70  // 70%
};

// Map test names to CSS classes
const testClasses = {
    'AgentForce': 'agentforce',
    'Data Cloud': 'data-cloud',
    'Platform Developer 1': 'platform-dev-1',
    'Platform Developer 2': 'platform-dev-2'
};

// Load questions from the selected JSON file
async function loadQuestions(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        const data = await response.json();
        return data.map(q => new Question(q.question, q.type, q.options, q.correct, q.explanation));
    } catch (error) {
        console.error('Error loading questions:', error);
        throw error;
    }
}

// Start the quiz with the selected test
async function startQuiz(fileName, testName) {
    try {
        questions = await loadQuestions(fileName);
        currentQuestionIndex = 0;
        score = 0;
        selectedTestName = testName; // Store the selected test name
        document.getElementById('score-container').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';

        // Apply test-specific class to quiz-container
        const quizContainer = document.getElementById('quiz-container');
        const allTestClasses = Object.values(testClasses);
        allTestClasses.forEach(cls => quizContainer.classList.remove(cls)); // Remove previous classes
        const testClass = testClasses[testName];
        if (testClass) {
            quizContainer.classList.add(testClass);
        }

        loadQuestion();
    } catch (error) {
        document.getElementById('message').textContent = 'Failed to load questions. Please try again.';
    }
}

// Load the current question
function loadQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    currentQuestion.options.forEach((option) => {
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

    document.getElementById('feedback').textContent = '';
    document.getElementById('submit-btn').style.display = 'block';
    document.getElementById('next-btn').style.display = 'none';
}

// Check the user's answer
function checkAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(input => input.value);
    const isCorrect = currentQuestion.isCorrect(selectedOptions);

    if (isCorrect) {
        score++;
    }

    const feedback = document.getElementById('feedback');
    if (isCorrect) {
        feedback.textContent = "Correct! " + currentQuestion.getFeedback();
        feedback.style.color = 'green';
    } else {
        feedback.textContent = "Incorrect. " + currentQuestion.getFeedback();
        feedback.style.color = 'red';
    }

    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';
}

// Display the final score with readiness threshold
function showScore() {
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('feedback').textContent = '';
    const scoreContainer = document.getElementById('score-container');
    scoreContainer.style.display = 'block';
    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;
    document.getElementById('score').textContent = `${score} out of ${totalQuestions} (${percentage.toFixed(2)}%)`;

    // Check readiness threshold
    const threshold = readinessThresholds[selectedTestName] || 70; // Default to 70% if not found
    const readinessMessage = document.getElementById('readiness-message');
    if (percentage >= threshold) {
        readinessMessage.textContent = 'You have met the readiness threshold!';
        readinessMessage.style.color = 'green';
    } else {
        readinessMessage.textContent = `You need ${(threshold - percentage).toFixed(2)}% more to meet the readiness threshold.`;
        readinessMessage.style.color = 'red';
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    const testSelector = document.getElementById('test-selector');
    const startBtn = document.getElementById('start-quiz');
    const message = document.getElementById('message');
    const testSelection = document.getElementById('test-selection');
    const quizContainer = document.getElementById('quiz-container');
    const testNameHeading = document.getElementById('test-name');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');

    startBtn.addEventListener('click', () => {
        const selectedFile = testSelector.value;
        if (!selectedFile) {
            message.textContent = "Please select a test.";
            return;
        }
        message.textContent = "";
        const testName = testSelector.selectedOptions[0].text;
        testNameHeading.textContent = testName;
        testSelection.style.display = 'none';
        quizContainer.style.display = 'block';
        startQuiz(selectedFile, testName); // Pass testName to startQuiz
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
});