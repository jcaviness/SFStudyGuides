// Add at the top of script.js
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

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
    // Add more tests and their actual passing scores as needed
};

// Global variables
let testId = '';
let questions = [];
let currentQuestionIndex = 0;
let answers = []; // Array to store user answers for each question

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
        questions = await loadQuestions(fileName);
        currentQuestionIndex = 0;
        document.getElementById('score-container').style.display = 'none';
        document.getElementById('question-container').style.display = 'block';

        const savedState = localStorage.getItem(`test_state_${testId}`);
        if (savedState) {
            if (confirm('Resume from your last session?')) {
                const state = JSON.parse(savedState);
                currentQuestionIndex = state.currentQuestionIndex;
                answers = state.answers;
            } else {
                localStorage.removeItem(`test_state_${testId}`);
                answers = new Array(questions.length).fill(null);
            }
        } else {
            answers = new Array(questions.length).fill(null);
        }

        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            showScore();
        }
    } catch (error) {
        document.getElementById('message').textContent = 'Failed to load questions. Please try again.';
    }
}

// Replace the existing loadQuestion function
function loadQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question').textContent = currentQuestion.question;
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    const shuffledOptions = shuffleArray([...currentQuestion.options]);

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
    answers[currentQuestionIndex] = selectedOptions; // Store the user's answer
    const isCorrect = currentQuestion.isCorrect(selectedOptions);

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

    // Calculate score based on stored answers
    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].isCorrect(answers[i])) {
            correctCount++;
        }
    }
    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    document.getElementById('score').textContent = `${correctCount} out of ${questions.length} (${scorePercentage}%)`;

    // Compare to passing score and display readiness message
    const passingScore = passingScores[testId];
    if (passingScore) {
        const message = scorePercentage >= passingScore
            ? "You're ready to take the certification exam!"
            : "Keep studying to improve your score.";
        document.getElementById('readiness-message').textContent = message;
    } else {
        document.getElementById('readiness-message').textContent = '';
    }

    // Clear saved state after completion
    localStorage.removeItem(`test_state_${testId}`);
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
        testId = selectedFile; // Set testId for state saving
        message.textContent = "";
        const testName = testSelector.selectedOptions[0].text;
        testNameHeading.textContent = testName;
        testSelection.style.display = 'none';
        quizContainer.style.display = 'block';
        startQuiz(selectedFile);
    });

    submitBtn.addEventListener('click', checkAnswer);

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        // Save state with the next question index and current answers
        const state = {
            currentQuestionIndex: currentQuestionIndex,
            answers: answers
        };
        localStorage.setItem(`test_state_${testId}`, JSON.stringify(state));

        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            showScore();
        }
    });
});