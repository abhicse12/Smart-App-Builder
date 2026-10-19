import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const parseAIJson = (text) => {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(
        "AI response does not contain valid JSON"
      );
    }

    const jsonText = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );

    return JSON.parse(jsonText);
  }
};

const generateWithGemini = async (prompt, retries) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not loaded");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `🤖 Gemini request: Attempt ${attempt}/${retries}`
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      return parseAIJson(response.text);
    } catch (error) {
      console.error(
        `Gemini failed: Attempt ${attempt}/${retries}`,
        error.message
      );

      if (attempt < retries) {
        const waitTime = 5000 * attempt;

        console.log(
          `Waiting ${waitTime / 1000}s before Gemini retry...`
        );

        await sleep(waitTime);
      }
    }
  }

  throw new Error("Gemini failed after all retry attempts");
};

const generateWithGroq = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not loaded");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  console.log("🟢 Switching to Groq fallback...");

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "You are an AI software engineering agent. Return valid JSON only. Do not use markdown code fences.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
    response_format: {
      type: "json_object",
    },
  });

  const text =
    response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  return parseAIJson(text);
};

const generateWithAI = async (prompt, retries = 3) => {
  try {
    return await generateWithGemini(prompt, retries);
  } catch (geminiError) {
    console.error(
      "❌ Gemini unavailable:",
      geminiError.message
    );

    console.log(
      "🔄 Attempting Groq fallback..."
    );

    try {
      return await generateWithGroq(prompt);
    } catch (groqError) {
      console.error(
        "❌ Groq fallback failed:",
        groqError.message
      );

      throw new Error(
        `Both AI providers failed. Gemini: ${geminiError.message} | Groq: ${groqError.message}`
      );
    }
  }
};

export default generateWithAI;