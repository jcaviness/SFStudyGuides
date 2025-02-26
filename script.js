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

    try {
        // Show loading message and hide quiz content
        loadingDiv.style.display = 'block';
        questionContainer.style.display = 'none';
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';

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

        // Set up event listeners
        submitBtn.addEventListener('click', checkAnswer);
        nextBtn.addEventListener('click', () => {
            currentQuestionIndex = (currentQuestionIndex + 1) % questions.length; // Loop through questions
            loadQuestion();
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