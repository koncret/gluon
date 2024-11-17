require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const TwitterApi = require('twitter-api-v2').default;
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

/*
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
*/
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`)
});

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
                    content: "Say: 'To find out your assigned Quark click the 'Find My Quark' button above.'"
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
            reply: "Say: 'To find out your assigned Quark click the 'Find My Quark' button above.'"
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

/**************************************************************************
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                          XBOT LOGIC SECTION                            *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 *                                                                        *
 **************************************************************************/

// Initialize Twitter API with your credentials
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});





/**************************************************************************
 *                                                                        *
 *                                                                        *
 *                        FORTUNE/QUARK TWEETS                            *
 *                                                                        *
 *                                                                        *
 **************************************************************************/


/**************************************************************************
 *                              GET IMAGE                                 *
 **************************************************************************/
// Base URL where images are hosted and starting image index
const imageBaseUrl = 'https://g1u0n10.github.io/Gluon-Images/imgs';
let currentImageIndex = 1;

// Function to get the next image URL in sequence
function getNextImagePath() {
  const imageUrl = `${imageBaseUrl}/${currentImageIndex}.jpg`;
  currentImageIndex += 1;
  return imageUrl;
}


/**************************************************************************
 *                              GET QUARK                                 *
 **************************************************************************/
// Function to generate the quark-specific prompt
function quarkPromptTemplate(quarkName) {
  return process.env.XBOT_PROMPT_FORTUNE.replace("${quarkName}", quarkName);
}

// Array of all Quarks
const quarksXbot = ["Fynix", "Glyon", "Netlyn", "Qurin", "Byon", "Mayro", "Toch", "Gravix", "Nerix", "Eryx", "Prot", "Korax", "Hyrin", "Moryn", "Feryn", "Charm"];

// Shuffle function to randomize the array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Track index of the next Quark to tweet about
let quarkIndex = 0;


/**************************************************************************
 *                         RANDOM WORD LISTS                              *
 **************************************************************************/
const wordList1 = JSON.parse(process.env.WORDS1);
const wordList2 = JSON.parse(process.env.WORDS2);
const wordList3 = JSON.parse(process.env.WORDS3);

// Function to select a random word from each list
function getRandomWords() {
  const word1 = wordList1[Math.floor(Math.random() * wordList1.length)];
  const word2 = wordList2[Math.floor(Math.random() * wordList2.length)];
  const word3 = wordList3[Math.floor(Math.random() * wordList3.length)];
  return { word1, word2, word3 };
}

/**************************************************************************
 *                        GENERATE QUARK TWEET                            *
 **************************************************************************/
async function generateUniqueQuarkTweet(word1, word2, word3) {
  if (quarkIndex === 0) shuffle(quarksXbot);

  const selectedQuark = quarksXbot[quarkIndex];
  quarkIndex = (quarkIndex + 1) % quarksXbot.length;

  const quarkPrompt = quarkPromptTemplate(selectedQuark);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: personalityPrompt },
        {
          role: "user",
          content: `${quarkPrompt} use these words and outcome as inspiration but do not quote them directly: "${word1}", "${word2}", and "${word3}". Keep each tweet under 200 characters. Do not use hashtags, emojis, or exclamation marks.`
        }
      ],
    });

    let tweetContent = response.choices[0].message.content;
    return `${selectedQuark}: ${tweetContent}`;
  } catch (error) {
    console.error("Error generating tweet:", error);
    return null;
  }
}

/**************************************************************************
 *                        SCHEDULE QUARK TWEET                            *
 **************************************************************************/
function scheduleFortuneTweet() {
  const minInterval = 2 * 60 * 60 * 1000; // 4 hours in milliseconds
  const maxInterval = 4 * 60 * 60 * 1000; // 8 hours in milliseconds
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  console.log(`Scheduling fortune tweet in ${(randomInterval / (60 * 60 * 1000)).toFixed(2)} hours.`);
  
  setTimeout(async () => {
    const { word1, word2, word3 } = getRandomWords();
    const tweetContent = await generateUniqueQuarkTweet(word1, word2, word3);

    if (tweetContent) {
      const imageUrl = getNextImagePath();

      try {
        // Fetch the image from the URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');

        // Upload image to Twitter
        const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType: 'image/jpeg' });
        await twitterClient.v2.tweet({
          text: tweetContent,
          media: { media_ids: [mediaId] },
        });
        console.log("Fortune tweet posted with", tweetContent, "Image URL:", imageUrl);
      } catch (error) {
        if (error.code === 429) {
          console.error("Rate limit reached. Backing off and rescheduling.");
          // If rate-limited, wait 15 minutes (900,000 milliseconds) before retrying
          setTimeout(scheduleFortuneTweet, 15 * 60 * 1000);
          return;
        } else {
          console.error("Error posting fortune tweet with image:", error);
        }
      }
    }
    scheduleFortuneTweet(); // Schedule the next fortune tweet
  }, randomInterval);
}

/**************************************************************************
 *               FUNCTION USED TO TEST IN TERMINAL ONLY                   *
 **************************************************************************/
/*
// Function to post a fortune tweet every 30 seconds for testing
function scheduleFortuneTweet() {
  const randomInterval = 5 * 1000; // 10 seconds for personality tweets

  console.log(`Scheduling fortune tweet in ${(randomInterval / 1000).toFixed(2)} seconds.`);
  
  setTimeout(async () => {
    const { word1, word2, word3 } = getRandomWords();
    const tweetContent = await generateUniqueQuarkTweet(word1, word2, word3);
    if (tweetContent) {
      const imagePath = getNextImagePath();
      
      // Log the fortune tweet content and image path to the console instead of tweeting
      console.log("Fortune tweet posted with", tweetContent, "Image:", imagePath);
    }
    scheduleFortuneTweet(); // Schedule the next fortune tweet
  }, randomInterval);
}
*/
// Start the tweet schedules
scheduleFortuneTweet();


/**************************************************************************
 *                                                                        *
 *                                                                        *
 *                           RANDOM TWEETS                                *
 *                                                                        *
 *                                                                        *
 **************************************************************************/

/**************************************************************************
 *                           GENERATE TWEET                               *
 **************************************************************************/
// Personality prompt and base tweet prompt
const personalityPrompt = process.env.XBOT_SYSTEM_MESSAGE_CONTENT

// Function to generate a personality-based tweet without an image
async function generatePersonalityTweet() {
  const generalPrompt = process.env.XBOT_PROMPT_GENERAL

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: personalityPrompt },
        { role: "user", content: generalPrompt }
      ],
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating personality tweet:", error);
    return null;
  }
}

/**************************************************************************
 *                           SCHEDULE TWEET                               *
 **************************************************************************/
// Function to post a personality tweet every 1-3 hours at a random time within that interval
function schedulePersonalityTweet() {
  const minInterval = 1 * 60 * 60 * 1000; // 1 hours in milliseconds
  const maxInterval = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  console.log(`Scheduling personality tweet in ${(randomInterval / (60 * 60 * 1000)).toFixed(2)} hours.`);
  
  setTimeout(async () => {
    const tweetContent = await generatePersonalityTweet();
    if (tweetContent) {
      try {
        await twitterClient.v2.tweet({ text: tweetContent });
        console.log("Personality tweet posted:", tweetContent);
      } catch (error) {
        if (error.code === 429) {
          console.error("Rate limit reached. Backing off and rescheduling.");
          // If rate-limited, wait 15 minutes (900,000 milliseconds) before retrying
          setTimeout(schedulePersonalityTweet, 15 * 60 * 1000);
          return;
        } else {
          console.error("Error posting personality tweet:", error);
        }
      }
    }
    schedulePersonalityTweet(); // Schedule the next personality tweet
  }, randomInterval);
}

/**************************************************************************
 *               FUNCTION USED TO TEST IN TERMINAL ONLY                   *
 **************************************************************************/
/*
// Function to post a personality tweet every 10 seconds for testing
function schedulePersonalityTweet() {
  const randomInterval = 5 * 1000; // 10 seconds for personality tweets

  console.log(`Scheduling personality tweet in ${(randomInterval / 1000).toFixed(2)} seconds.`);
  
  setTimeout(async () => {
    const tweetContent = await generatePersonalityTweet();
    if (tweetContent) {
      // Log the personality tweet content to the console instead of tweeting
      console.log("Generated personality tweet:", tweetContent);
    }
    schedulePersonalityTweet(); // Schedule the next personality tweet
  }, randomInterval);
}
*/
// Start the tweet schedules
schedulePersonalityTweet();



/**************************************************************************
 *                                                                        *
 *                                                                        *
 *                            REPLY TWEETS                                *
 *                                                                        *
 *                                                                        *
 **************************************************************************/
/* Will add later */


/**************************************************************************
 *                                                                        *
 *                                                                        *
 *                     MAKE SURE CODE IS RUNNING                          *
 *                                                                        *
 *                                                                        *
 **************************************************************************/
// Function to log a custom note to the terminal every 10 minutes
function logPeriodicNote() {
  console.log("Note: Gluon is monitoring tweets and mentions...");
}
// Set up a recurring log every 10 minutes (600,000 milliseconds)
setInterval(logPeriodicNote, 60 * 60 * 1000); // 60 minutes