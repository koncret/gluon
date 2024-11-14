require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define the quiz questions with yes/no values
const quizQuestions = JSON.parse(process.env.QUIZ_QUESTIONS);
const quarks = JSON.parse(process.env.QUARKS_JSON);

// System message
const systemMessage = {
    role: "system",
    content: process.env.SERVER_SYSTEM_MESSAGE_CONTENT
};

// Define the /api/greet endpoint
app.get('/api/greet', async (req, res) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Generate a message that includes: " +
                             "'The path of every particle was chosen at the dawn of the universe, this includes the ones that form you.'" +
                             "Vary this line slightly, then say exactly this 'To find out your assigned Quark type 'I want to know my Quark''."
                }
            ],
            temperature: 0.7
        });

        const greetingMessage = response.choices[0].message.content;
        return res.json({ reply: greetingMessage });

    } catch (error) {
        console.error("Error generating greeting:", error);
        // Fallback message in case of error
        return res.json({
            reply: "The path of every particle was chosen at the dawn of the universe, this includes the ones that form you.\n" +
                   "The path of every particle was chosen at the dawn of the universe, this includes the ones that form you.\n" +
                   "To find out your assigned Quark type 'I want to know my Quark'."
        });
    }
});


let userState = {};

app.post('/api/chat', async (req, res) => {
    const userId = req.body.userId;
    const userInput = req.body.prompt.toLowerCase();

    if (!userState[userId]) {
        userState[userId] = { isInQuiz: false, questionIndex: 0, answers: { '1/2': 0, '3/4': 0, '5/6': 0, '7/8': 0 } };
    }

    const user = userState[userId];

    // Begin quiz if the user requests it
    if (userInput === "i want to know my quark") {
        user.isInQuiz = true;
        user.questionIndex = 0;
        user.answers = { '1/2': 0, '3/4': 0, '5/6': 0, '7/8': 0 };
        
        // Ask the first question immediately
        return res.json({ reply: quizQuestions[user.questionIndex].question });
    }

    // Proceed with quiz if in progress
    if (user.isInQuiz) {
        const currentQuestion = quizQuestions[user.questionIndex];
        
        if (userInput === "yes" || userInput === "no") {
            // Track the response
            const answerValue = currentQuestion[userInput];
            const category = answerValue === "1" || answerValue === "2" ? '1/2'
                           : answerValue === "3" || answerValue === "4" ? '3/4'
                           : answerValue === "5" || answerValue === "6" ? '5/6'
                           : '7/8';

            user.answers[category] += answerValue === "1" || answerValue === "3" || answerValue === "5" || answerValue === "7" ? 1 : -1;

            // Move to the next question
            user.questionIndex += 1;

            // Check if the quiz is complete
            if (user.questionIndex >= quizQuestions.length) {
                user.isInQuiz = false;

                // Calculate the 4-digit number based on answer tallies
                const finalNumber = [
                    user.answers['1/2'] > 0 ? "1" : "2",
                    user.answers['3/4'] > 0 ? "3" : "4",
                    user.answers['5/6'] > 0 ? "5" : "6",
                    user.answers['7/8'] > 0 ? "7" : "8"
                ].join('');
                
                const selectedQuark = quarks[finalNumber];
                // Extract the name and description if a match is found
                let quarkName, quarkDescription;
                if (selectedQuark) {
                    quarkName = selectedQuark.name;
                    quarkDescription = selectedQuark.description;
                } else {
                    quarkName = "Unknown Quark";
                    quarkDescription = "This quark does not exist in the current quark map.";
                }
                
                return res.json({ reply: `Your Quark is: ${quarkName}, this means you are ${quarkDescription}. If you would like to learn more about ${quarkName} simpley say 'Tell me about the ${quarkName} Quark'.` });
            } else {
                // Send the next question
                const nextQuestion = quizQuestions[user.questionIndex].question;
                return res.json({ reply: nextQuestion });
            }
        } else if (userInput === "please make it stop mr.gluon") {
            // Exit the quiz and return to normal conversation
            user.isInQuiz = false;
            return res.json({ reply: "You've exited the questions, we may now speak about whatever you'd like, or you can type 'I want to know my Quark' anytime to start the questions again." });
        } else {
            // Handle invalid response
            return res.json({ reply: "Please respond with 'yes' or 'no' only, or type 'Please make it stop mr.Gluon' to exit the questions." });
            
        }
    }

    // Handle normal conversation outside of quiz
    try {
        const conversationResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                systemMessage,
                { role: "user", content: userInput }
            ],
            temperature: 0.9
        });
        
        const aiReply = conversationResponse.choices[0].message.content;
        return res.json({ reply: aiReply });
        
    } catch (error) {
        console.error("Error generating conversation response:", error);
        return res.json({ reply: "I'm here to chat about whatever's on your mind. What's up?" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});