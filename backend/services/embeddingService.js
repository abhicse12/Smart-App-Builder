import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not loaded"
    );
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
};

// ==========================================
// Generate embedding for a knowledge document
// ==========================================

export const generateDocumentEmbedding = async (
  text
) => {
  if (!text || !text.trim()) {
    throw new Error(
      "Document text is required for embedding"
    );
  }

  const ai = getAIClient();

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  return response.embeddings[0].values;
};

// ==========================================
// Generate embedding for a user query
// ==========================================

export const generateQueryEmbedding = async (
  query
) => {
  if (!query || !query.trim()) {
    throw new Error(
      "Query is required for embedding"
    );
  }

  const ai = getAIClient();

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
    },
  });

  return response.embeddings[0].values;
};