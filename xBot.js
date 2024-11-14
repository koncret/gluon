const fs = require('fs');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');
const TwitterApi = require('twitter-api-v2').default;

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  return process.env.TWEET_PROMPT.replace("${quarkName}", quarkName);
}

// Array of all Quarks
const quarks = ["Fynix", "Glyon", "Netlyn", "Qurin", "Byon", "Mayro", "Toch", "Gravix", "Nerix", "Eryx", "Prot", "Korax", "Hyrin", "Moryn", "Feryn", "Charm"];

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
  if (quarkIndex === 0) shuffle(quarks);

  const selectedQuark = quarks[quarkIndex];
  quarkIndex = (quarkIndex + 1) % quarks.length;

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
    const quarkPattern = new RegExp(`^\\s*Quark\\s+${selectedQuark}\\s*[:,]?\\s*`, 'i');
    tweetContent = tweetContent.replace(quarkPattern, '').trim();

    console.log(`Generated fortune tweet content for ${selectedQuark}: ${tweetContent}`);
    return `${selectedQuark}: ${tweetContent}`;
  } catch (error) {
    console.error("Error generating tweet:", error);
    return null;
  }
}

// Function to generate a personality-based tweet without an image
async function generatePersonalityTweet() {
  const generalPrompt = `Generate a tweet in Gluon's tone. It should be an observation, open-ended question, or insightful thought, within 280 characters. Avoid using Quark-specific terms.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: personalityPrompt },
        { role: "user", content: generalPrompt }
      ],
    });
    console.log(`Generated personality tweet: ${response.choices[0].message.content.trim()}`);
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
  const minInterval = 4 * 60 * 60 * 1000;
  const maxInterval = 8 * 60 * 60 * 1000;
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