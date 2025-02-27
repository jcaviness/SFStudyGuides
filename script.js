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

// Configuration for passing scores (percentage out of 100)
const passingScores = {
    "questions/agentforce.json": 70,
    "questions/data_cloud_questions.json": 75,
    "questions/platform_developer_1_questions.json": 80,
    "questions/platform_developer_2_questions.json": 85
};

// Global variables
let testId = '';
let questions = [];
let currentQuestionIndex = 0;
let score = 0;

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
async function startQuiz(fileName) {
    try {
        testId = fileName;
        questions = await loadQuestions(fileName);
        currentQuestionIndex = 0;
        score = 0;

        document.getElementById('score-container').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';
        
        updateScoreProgress(); // Initialize the progress bar
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

// Update the score progress bar
function updateScoreProgress() {
    const total = questions.length;
    const scorePercentage = Math.round((score / total) * 100);
    
    document.getElementById('score-progress-bar').style.width = `${scorePercentage}%`;
    document.getElementById('current-score-text').textContent = `Score: ${score}/${total} (${scorePercentage}%)`;

    // Set passing score marker
    const passingScore = passingScores[testId] || 70;
    document.getElementById('passing-score-marker').style.left = `${passingScore}%`;
}

// Check the user's answer
function checkAnswer() {
    const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(input => input.value);
    if (selectedOptions.length === 0) {
        document.getElementById('feedback').textContent = 'Please select at least one option.';
        document.getElementById('feedback').style.color = 'orange';
        return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.isCorrect(selectedOptions);

    if (isCorrect) {
        score++;
    }
    updateScoreProgress(); // Update progress bar after answering

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
        if (!selectedFile) {
            message.textContent = "Please select a test.";
            return;
        }
        message.textContent = "";
        const testName = testSelector.selectedOptions[0].text;
        testNameHeading.textContent = testName;
        testSelection.style.display = 'none';
        quizContainer.style.display = 'block';
        startQuiz(selectedFile);
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