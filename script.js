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
let readinessThreshold = 70; // Default threshold

// Thresholds for each test (stored in script.js, not JSON files)
const thresholds = {
    "AgentForce": 70,
    "Data Cloud": 80,
    "Platform Developer 1": 75,
    "Platform Developer 2": 85
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
        readinessThreshold = thresholds[testName] || 70; // Set threshold based on testName, default to 70
        currentQuestionIndex = 0;
        score = 0;
        updateProgress(); // Initialize progress bar
        document.getElementById('score-container').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';
        loadQuestion();
    } catch (error) {
        document.getElementById('message').textContent = 'Failed to load questions. Please try again.';
    }
}

// Load the current question with shuffled options
function loadQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
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
    updateProgress(); // Update progress after each answer

    const feedback = document.getElementById('feedback');
    feedback.textContent = isCorrect ? "Correct! " + currentQuestion.getFeedback() : "Incorrect. " + currentQuestion.getFeedback();
    feedback.style.color = isCorrect ? 'green' : 'red';

    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';
}

// Display the final score
function showScore() {
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('feedback').textContent = '';
    const scoreContainer = document.getElementById('score-container');
    scoreContainer.style.display = 'block';
    document.getElementById('score').textContent = `${score} out of ${questions.length}`;
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
        const testName = testSelector.selectedOptions[0].text; // Get test name from dropdown
        if (!selectedFile) {
            message.textContent = "Please select a test.";
            return;
        }
        message.textContent = "";
        testNameHeading.textContent = testName;
        testSelection.style.display = 'none';
        quizContainer.style.display = 'block';
        startQuiz(selectedFile, testName); // Pass both fileName and testName
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