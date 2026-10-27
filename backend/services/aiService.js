import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const parseAIJson = (text) => {
  // Remove a markdown code fence only when it wraps the whole
  // response. ``` inside generated file contents (e.g. README
  // code blocks) must be kept.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?[^\S\r\n]*\r?\n?/i, "")
    .replace(/\r?\n?[^\S\r\n]*```$/, "")
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

// Gemini models tried in order. A 503 "high demand" is per model, so
// another model usually answers right away. Override with GEMINI_MODELS
// (comma-separated).
const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
];

const getGeminiModels = () => {
  const configured = (process.env.GEMINI_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_GEMINI_MODELS;
};

// 503 / overloaded: worth one more try on the same model
const isOverloaded = (message = "") =>
  /\b503\b|UNAVAILABLE|high demand|overloaded/i.test(message);

// Quota / missing model: move to the next model immediately
const isUnusableModel = (message = "") =>
  /\b(429|404)\b|RESOURCE_EXHAUSTED|quota|NOT_FOUND|no longer available/i.test(
    message
  );

const generateWithGemini = async (prompt, retries) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not loaded");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const models = getGeminiModels();

  // Attempts per model (the first model gets the full retry budget for
  // invalid JSON; overload/quota errors move on sooner)
  const attemptsPerModel = Math.max(1, Math.min(retries, 2));
  const failures = [];

  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        console.log(
          `🤖 Gemini request (${model}): Attempt ${attempt}/${attemptsPerModel}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        return parseAIJson(response.text);
      } catch (error) {
        const message = String(error.message || error);

        console.error(
          `Gemini failed (${model}): Attempt ${attempt}/${attemptsPerModel}`,
          message.slice(0, 300)
        );

        if (isUnusableModel(message)) {
          failures.push(`${model}: unavailable (quota or model)`);
          break;
        }

        if (attempt < attemptsPerModel) {
          const waitTime = isOverloaded(message) ? 3000 : 5000;

          console.log(
            `Waiting ${waitTime / 1000}s before retrying ${model}...`
          );

          await sleep(waitTime);
        } else {
          failures.push(
            `${model}: ${isOverloaded(message) ? "overloaded" : message.slice(0, 120)}`
          );
        }
      }
    }

    console.log(`↪️ Trying the next Gemini model...`);
  }

  throw new Error(
    `Gemini failed on every model (${failures.join("; ")})`
  );
};

// Groq fallback. The free/on-demand tier allows about 8,000 tokens per
// minute per model (prompt + answer), so large prompts are skipped
// instead of failing with 413. Override with GROQ_MODEL / GROQ_TPM_LIMIT.
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

const estimateTokens = (text = "") => Math.ceil(text.length / 3.5);

const generateWithGroq = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not loaded");
  }

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const tokensPerMinute = Number(process.env.GROQ_TPM_LIMIT) || 8000;

  // Room for the generated files in the answer
  const RESERVED_OUTPUT_TOKENS = 2000;
  const promptTokens = estimateTokens(prompt);

  if (promptTokens + RESERVED_OUTPUT_TOKENS > tokensPerMinute) {
    throw new Error(
      `prompt is about ${promptTokens} tokens, more than Groq ${model} accepts (${tokensPerMinute} tokens per minute incl. the answer); skipped`
    );
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  console.log(`🟢 Switching to Groq fallback (${model})...`);

  const response = await groq.chat.completions.create({
    model,
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