import { GoogleGenAI } from "@google/genai";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateWithAI = async (prompt, retries = 5) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not loaded");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,

        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;

      return JSON.parse(text);
    } catch (error) {
      console.error(
        `AI Request failed: Attempt ${attempt}/${retries}`,
        error.message
      );

      if (error.status === 429 && attempt < retries) {
        const waitTime = 60000;

        console.log(
          `Rate limit reached. Waiting ${
            waitTime / 1000
          } seconds before retrying...`
        );

        await sleep(waitTime);

        continue;
      }

      throw error;
    }
  }
};

export default generateWithAI;