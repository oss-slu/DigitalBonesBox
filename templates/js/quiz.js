// quiz.js - Quiz functionality for Digital Bones Box

import { fetchCombinedData } from "./api.js";

class QuizManager {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.isQuizActive = false;
        this.totalQuestions = 10;
        this.allBones = [];
        this.answered = false;
    }

    /**
     * Initialize the quiz system
     */
    async initialize() {
        try {
            // Fetch bone data
            const data = await fetchCombinedData();
            this.allBones = data.bones || [];

            if (this.allBones.length < 3) {
                console.error("Not enough bones to create a quiz");
                return false;
            }

            // Setup event listeners
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error("Error initializing quiz:", error);
            return false;
        }
    }

    /**
     * Setup event listeners for quiz UI
     */
    setupEventListeners() {
        const quizButton = document.getElementById("start-quiz-btn");
        const exitButton = document.getElementById("exit-quiz-btn");
        const nextButton = document.getElementById("next-question-btn");

        if (quizButton) {
            quizButton.addEventListener("click", () => this.startQuiz());
        }

        if (exitButton) {
            exitButton.addEventListener("click", () => this.exitQuiz());
        }

        if (nextButton) {
            nextButton.addEventListener("click", () => this.nextQuestion());
        }
    }

    /**
     * Generate quiz questions
     */
    generateQuestions() {
        this.questions = [];
        const usedBones = new Set();

        // Generate specified number of questions
        for (let i = 0; i < this.totalQuestions && this.allBones.length >= 3; i++) {
            // Get a random bone that hasn't been used
            let correctBone;
            let attempts = 0;
            do {
                correctBone = this.allBones[Math.floor(Math.random() * this.allBones.length)];
                attempts++;
            } while (usedBones.has(correctBone.id) && attempts < 50);

            if (usedBones.has(correctBone.id)) break; // Skip if we can't find unused bone

            usedBones.add(correctBone.id);

            // Generate wrong answers
            const wrongAnswers = this.generateWrongAnswers(correctBone.id, 3);

            // Create question object
            const question = {
                boneId: correctBone.id,
                boneName: correctBone.name,
                correctAnswer: correctBone.name,
                allAnswers: this.shuffleArray([correctBone.name, ...wrongAnswers]),
                imageUrl: this.getImageUrl(correctBone.id)
            };

            this.questions.push(question);
        }
    }

    /**
     * Generate wrong answer choices
     */
    generateWrongAnswers(correctBoneId, count) {
        const wrongAnswers = [];
        const availableBones = this.allBones.filter(b => b.id !== correctBoneId);

        while (wrongAnswers.length < count && availableBones.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableBones.length);
            const bone = availableBones.splice(randomIndex, 1)[0];
            wrongAnswers.push(bone.name);
        }

        return wrongAnswers;
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get image URL for a bone
     */
    getImageUrl(boneId) {
        // This returns a placeholder - images will be fetched from API
        return `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/images/${boneId}_image.png`;
    }

    /**
     * Start the quiz
     */
    startQuiz() {
        // Generate questions
        this.generateQuestions();

        if (this.questions.length === 0) {
            alert("Unable to generate quiz questions. Please try again.");
            return;
        }

        // Reset quiz state
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.isQuizActive = true;
        this.answered = false;

        // Show quiz container, hide main content
        this.showQuizMode();

        // Display first question
        this.displayQuestion();
    }

    /**
     * Display current question
     */
    displayQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.answered = false;

        // Update progress
        const progressText = document.getElementById("quiz-progress");
        if (progressText) {
            progressText.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`;
        }

        // Update score display
        const scoreText = document.getElementById("quiz-score");
        if (scoreText) {
            scoreText.textContent = `Score: ${this.score}/${this.questions.length}`;
        }

        // Update question text
        const questionText = document.getElementById("quiz-question-text");
        if (questionText) {
            questionText.textContent = "What bone is this?";
        }

        // Update bone image (placeholder for now - will be enhanced with actual image fetching)
        const imageContainer = document.getElementById("quiz-bone-image");
        if (imageContainer) {
            imageContainer.innerHTML = `
                <div class="quiz-image-placeholder">
                    <p>🦴</p>
                    <p>${question.boneName}</p>
                    <small>Image loading...</small>
                </div>
            `;
        }

        // Display answer choices
        this.displayAnswerChoices(question);

        // Hide next button, show answer choices
        const nextBtn = document.getElementById("next-question-btn");
        if (nextBtn) nextBtn.style.display = "none";

        // Clear feedback
        const feedback = document.getElementById("quiz-feedback");
        if (feedback) {
            feedback.style.display = "none";
            feedback.className = "quiz-feedback";
        }
    }

    /**
     * Display answer choice buttons
     */
    displayAnswerChoices(question) {
        const choicesContainer = document.getElementById("quiz-choices");
        if (!choicesContainer) return;

        choicesContainer.innerHTML = "";

        question.allAnswers.forEach((answer, index) => {
            const button = document.createElement("button");
            button.className = "quiz-choice-btn";
            button.textContent = answer;
            button.dataset.answer = answer;
            button.addEventListener("click", () => this.handleAnswerClick(answer, question.correctAnswer));
            choicesContainer.appendChild(button);
        });
    }

    /**
     * Handle answer selection
     */
    handleAnswerClick(selectedAnswer, correctAnswer) {
        if (this.answered) return; // Prevent multiple answers
        this.answered = true;

        const isCorrect = selectedAnswer === correctAnswer;

        // Update score
        if (isCorrect) {
            this.score++;
        }

        // Update score display
        const scoreText = document.getElementById("quiz-score");
        if (scoreText) {
            scoreText.textContent = `Score: ${this.score}/${this.questions.length}`;
        }

        // Highlight answers
        const buttons = document.querySelectorAll(".quiz-choice-btn");
        buttons.forEach(btn => {
            btn.disabled = true;
            const answer = btn.dataset.answer;

            if (answer === correctAnswer) {
                btn.classList.add("correct");
            } else if (answer === selectedAnswer && !isCorrect) {
                btn.classList.add("incorrect");
            }
        });

        // Show feedback
        this.showFeedback(isCorrect, correctAnswer);

        // Show next button
        const nextBtn = document.getElementById("next-question-btn");
        if (nextBtn) {
            nextBtn.style.display = "block";
        }
    }

    /**
     * Show feedback after answer
     */
    showFeedback(isCorrect, correctAnswer) {
        const feedback = document.getElementById("quiz-feedback");
        if (!feedback) return;

        feedback.style.display = "block";

        if (isCorrect) {
            feedback.className = "quiz-feedback correct";
            feedback.innerHTML = `
                <span class="feedback-icon">✓</span>
                <span class="feedback-text">Correct! Great job!</span>
            `;
        } else {
            feedback.className = "quiz-feedback incorrect";
            feedback.innerHTML = `
                <span class="feedback-icon">✗</span>
                <span class="feedback-text">Incorrect. The correct answer is: <strong>${correctAnswer}</strong></span>
            `;
        }
    }

    /**
     * Move to next question
     */
    nextQuestion() {
        this.currentQuestionIndex++;
        this.displayQuestion();
    }

    /**
     * Show quiz results
     */
    showResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        
        let message = "";
        let emoji = "";
        
        if (percentage >= 90) {
            message = "Outstanding! You're a bone expert!";
            emoji = "🏆";
        } else if (percentage >= 70) {
            message = "Great job! You know your bones well!";
            emoji = "🎉";
        } else if (percentage >= 50) {
            message = "Good effort! Keep studying!";
            emoji = "👍";
        } else {
            message = "Keep practicing! You'll improve with time!";
            emoji = "📚";
        }

        const quizContainer = document.getElementById("quiz-container");
        if (!quizContainer) return;

        quizContainer.innerHTML = `
            <div class="quiz-results">
                <div class="results-emoji">${emoji}</div>
                <h2>Quiz Complete!</h2>
                <div class="results-score">
                    <div class="score-number">${this.score}/${this.questions.length}</div>
                    <div class="score-percentage">${percentage}%</div>
                </div>
                <p class="results-message">${message}</p>
                <div class="results-buttons">
                    <button id="retry-quiz-btn" class="quiz-btn quiz-btn-primary">
                        Try Again
                    </button>
                    <button id="exit-results-btn" class="quiz-btn quiz-btn-secondary">
                        Exit Quiz
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to new buttons
        document.getElementById("retry-quiz-btn")?.addEventListener("click", () => this.startQuiz());
        document.getElementById("exit-results-btn")?.addEventListener("click", () => this.exitQuiz());
    }

    /**
     * Show quiz mode (hide main content)
     */
    showQuizMode() {
        const mainContent = document.querySelector(".container");
        const quizModal = document.getElementById("quiz-modal");

        if (mainContent) mainContent.style.display = "none";
        if (quizModal) quizModal.style.display = "flex";
    }

    /**
     * Exit quiz and return to main view
     */
    exitQuiz() {
        this.isQuizActive = false;
        
        const mainContent = document.querySelector(".container");
        const quizModal = document.getElementById("quiz-modal");

        if (mainContent) mainContent.style.display = "block";
        if (quizModal) quizModal.style.display = "none";

        // Reset quiz
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];
    }
}

// Create and export singleton instance
const quizManager = new QuizManager();
export default quizManager;
