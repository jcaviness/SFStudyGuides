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

// Update progress bar and score display
function updateProgress() {
    const correctCount = score;
    const totalQuestions = questions.length;
    const percentage = (correctCount / totalQuestions) * 100;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('score-percentage').textContent = percentage.toFixed(2) + '%';
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';
    const threshold = 70; // Readiness threshold at 70%
    progressBar.style.backgroundColor = percentage >= threshold ? '#4CAF50' : '#f44336'; // Green if >=70%, red if <70%
}

// Load questions from the selected JSON file with debugging
async function loadQuestions(fileName) {
    try {
        console.log('Loading questions from:', fileName);
        const response = await fetch(fileName);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Questions loaded:', data);
        return data.map(q => new Question(q.question, q.type, q.options, q.correct, q.explanation));
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('message').textContent = 'Failed to load questions. Check console for details.';
        throw error;
    }
}

// Start the quiz with the selected test
async function startQuiz(fileName) {
    try {
        questions = await loadQuestions(fileName);
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
        updateProgress(); // Update progress after score change
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