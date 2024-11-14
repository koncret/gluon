require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const TwitterApi = require('twitter-api-v2').default;


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
    console.log(`Server is running on ${PORT}`);
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

console.log("Bot initialized and starting...");

// Directory where images are stored and starting image index
const imageDir = path.join(__dirname, 'imgs');
let currentImageIndex = 1;

// Function to get the next image path in sequence
function getNextImagePath() {
  const imagePath = path.join(imageDir, `${currentImageIndex}.jpg`);
  if (!fs.existsSync(imagePath)) {
    console.log(`Image ${currentImageIndex}.jpg not found, resetting to 1.jpg.`);
    currentImageIndex = 1;
    return path.join(imageDir, `${currentImageIndex}.jpg`);
  }
  currentImageIndex += 1;
  return imagePath;
}

// Personality prompt and base tweet prompt
const personalityPrompt = process.env.XBOT_SYSTEM_MESSAGE_CONTENT

// Function to generate the quark-specific prompt
function quarkPromptTemplate(quarkName) {
  return process.env.XBOT_PROMPT.replace("${quarkName}", quarkName);
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

// Function to ensure all Quarks are covered randomly before reshuffling
async function generateUniqueQuarkTweet() {
  if (quarkIndex === 0) shuffle(quarksXbot);

  const selectedQuark = quarksXbot[quarkIndex];
  quarkIndex = (quarkIndex + 1) % quarksXbot.length;

  const quarkPrompt = quarkPromptTemplate(selectedQuark);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: personalityPrompt },
        { role: "user", content: quarkPrompt }
      ],
    });

    let tweetContent = response.choices[0].message.content;

    // console.log(`Generated fortune tweet content for ${selectedQuark}: ${tweetContent}`);
    return `${selectedQuark}: ${tweetContent}`;
  } catch (error) {
    console.error("Error generating tweet:", error);
    return null;
  }
}

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
    // console.log(`Generated personality tweet: ${response.choices[0].message.content.trim()}`);
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating personality tweet:", error);
    return null;
  }
}

// Function to post a personality tweet every 2 hours at a random time within that interval
function schedulePersonalityTweet() {
  const minInterval = 0;
  const maxInterval = 2 * 60 * 60 * 1000;
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  console.log(`Scheduling personality tweet in ${(randomInterval / (60 * 60 * 1000)).toFixed(2)} hours.`);
  
  setTimeout(async () => {
    const tweetContent = await generatePersonalityTweet();
    if (tweetContent) {
      try {
        await twitterClient.v2.tweet({ text: tweetContent });
        console.log("Personality tweet posted:", tweetContent);
      } catch (error) {
        console.error("Error posting personality tweet:", error);
      }
    }
    schedulePersonalityTweet(); // Schedule the next personality tweet
  }, randomInterval);
}

// Function to post a fortune tweet every 4-8 hours at a random time within that interval
function scheduleFortuneTweet() {
  const minInterval = 2 * 60 * 60 * 1000;
  const maxInterval = 5 * 60 * 60 * 1000;
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  console.log(`Scheduling fortune tweet in ${(randomInterval / (60 * 60 * 1000)).toFixed(2)} hours.`);
  
  setTimeout(async () => {
    const tweetContent = await generateUniqueQuarkTweet();
    if (tweetContent) {
      const imagePath = getNextImagePath();
      try {
        const mediaId = await twitterClient.v1.uploadMedia(imagePath);
        await twitterClient.v2.tweet({
          text: tweetContent,
          media: { media_ids: [mediaId] },
        });
        console.log("Fortune tweet posted with image:", tweetContent);
      } catch (error) {
        console.error("Error posting fortune tweet with image:", error);
      }
    }
    scheduleFortuneTweet(); // Schedule the next fortune tweet
  }, randomInterval);
}


// Start the tweet schedules
schedulePersonalityTweet();
scheduleFortuneTweet();
console.log("Tweet schedules have been set up.");

// Function to check for recent mentions and occasionally reply
async function checkForMentionsAndReplies() {
  try {
    // Fetch the 10 most recent mentions and replies to Gluon
    const mentions = await twitterClient.v2.userMentionTimeline(process.env.GLUON_USER_ID, { max_results: 10 });

    // Loop through mentions
    for (const mention of mentions.data) {
      // 30% chance for Gluon to respond
      const shouldReply = Math.random() < 0.3;
      
      if (shouldReply) {
        const userName = mention.author_id; // Twitter user who mentioned Gluon
        const replyPrompt = `Generate an extremely original, sharp-witted tweet in Gluon's tone. Avoid clichés, tired jokes, or anything that feels overdone, and don't start the tweet with 'Ah,' or 'Oh,' just dive right into the content. The tweet should feel fresh, funny, maybe a little bit like existential crisis, can also be self deprecating but not always, capturing modern internet humor with brainrot phrasing. You can also use curse words if it makes sense to. It must be one sentence, with no more than 100 characters. No hashtags or emojis.. Respond to this text: "${mention.text}"`;

        // Generate reply content
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: personalityPrompt },
            { role: "user", content: replyPrompt }
          ],
        });

        const replyContent = response.choices[0].message.content;

        // Post the reply
        try {
          await twitterClient.v2.reply(replyContent, mention.id);
          console.log(`Replied to ${userName}: ${replyContent}`);
        } catch (error) {
          console.error("Error posting reply:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching mentions or generating reply:", error);
  }
}

// Set up a recurring check for mentions every hour
setInterval(checkForMentionsAndReplies, 60 * 60 * 1000); // 1 hour in milliseconds

// Function to log a custom note to the terminal every 10 minutes
function logPeriodicNote() {
  console.log("Note: Gluon is monitoring tweets and mentions...");
}

// Set up a recurring log every 10 minutes (600,000 milliseconds)
setInterval(logPeriodicNote, 5 * 60 * 1000); // 10 minutes