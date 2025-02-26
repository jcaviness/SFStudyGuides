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

// Function to load questions from the JSON file
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
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

// Main function to start the quiz
async function startQuiz() {
    const loadingDiv = document.getElementById('loading');
    const questionContainer = document.getElementById('question-container');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const feedback = document.getElementById('feedback');
    const scoreContainer = document.getElementById('score-container');
    const scoreSpan = document.getElementById('score');

    try {
        // Show loading message and hide quiz content
        loadingDiv.style.display = 'block';
        questionContainer.style.display = 'none';
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        scoreContainer.style.display = 'none';

        // Load questions from JSON
        const questions = await loadQuestions();
        if (questions.length === 0) {
            throw new Error('No questions found');
        }

        // Hide loading message and show quiz content
        loadingDiv.style.display = 'none';
        questionContainer.style.display = 'block';
        submitBtn.style.display = 'block';

        let currentQuestionIndex = 0;
        let score = 0; // Initialize score to track correct answers

        // Function to load the current question
        function loadQuestion() {
            const currentQuestion = questions[currentQuestionIndex];
            document.getElementById('question').textContent = currentQuestion.question;
            const optionsContainer = document.getElementById('options');
            optionsContainer.innerHTML = '';

            // Generate options based on question type
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

            // Reset feedback and button states
            feedback.textContent = '';
            submitBtn.style.display = 'block';
            nextBtn.style.display = 'none';
        }

        // Function to check the user's answer
        function checkAnswer() {
            const currentQuestion = questions[currentQuestionIndex];
            const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked'))
                .map(input => input.value);
            const isCorrect = currentQuestion.isCorrect(selectedOptions);

            // Increment score if the answer is correct
            if (isCorrect) {
                score++;
            }

            // Display feedback
            if (isCorrect) {
                feedback.textContent = "Correct! " + currentQuestion.getFeedback();
                feedback.style.color = 'green';
            } else {
                feedback.textContent = "Incorrect. " + currentQuestion.getFeedback();
                feedback.style.color = 'red';
            }

            // Toggle button visibility
            submitBtn.style.display = 'none';
            nextBtn.style.display = 'block';
        }

        // Function to display the final score
        function showScore() {
            questionContainer.style.display = 'none';
            submitBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            feedback.textContent = '';
            scoreContainer.style.display = 'block';
            scoreSpan.textContent = `${score} out of ${questions.length}`;
        }

        // Set up event listeners
        submitBtn.addEventListener('click', checkAnswer);
        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex + 1 < questions.length) {
                currentQuestionIndex++;
                loadQuestion();
            } else {
                showScore();
            }
        });

        // Load the first question
        loadQuestion();
    } catch (error) {
        // Handle errors by updating the loading message
        loadingDiv.textContent = 'Failed to load questions. Please try again.';
        loadingDiv.style.color = 'red';
    }
}

// Start the quiz when the page loads
document.addEventListener('DOMContentLoaded', startQuiz);