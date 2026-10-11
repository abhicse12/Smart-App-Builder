import KnowledgeChunk from "../models/KnowledgeChunk.js";
import { generateQueryEmbedding } from "./embeddingService.js";

const cosineSimilarity = (vectorA, vectorB) => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (
    dotProduct /
    (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
  );
};

const calculateStackRelevance = (source, techStack = []) => {
  const normalizedStack = techStack.map((tech) =>
    tech.toLowerCase()
  );

  const sourceName = source.toLowerCase();

  // Static HTML/CSS/JS project
  if (
    normalizedStack.includes("html") &&
    normalizedStack.includes("css") &&
    normalizedStack.includes("javascript") &&
    !normalizedStack.includes("react") &&
    !normalizedStack.includes("next.js")
  ) {
    if (sourceName === "static-web.md") {
      return 1.0;
    }

    if (sourceName === "docker.md") {
      return 0.7;
    }

    if (sourceName === "react-vite.md") {
      return 0.2;
    }
  }

  // React project
  if (normalizedStack.includes("react")) {
    if (sourceName === "react-vite.md") {
      return 1.0;
    }

    if (sourceName === "docker.md") {
      return 0.7;
    }
  }

  // MERN / Node backend project
  if (
    normalizedStack.includes("node.js") ||
    normalizedStack.includes("express") ||
    normalizedStack.includes("mongodb")
  ) {
    if (sourceName === "mern.md") {
      return 1.0;
    }

    if (sourceName === "authentication.md") {
      return 0.8;
    }

    if (sourceName === "docker.md") {
      return 0.7;
    }
  }

  // Default
  return 0.5;
};

const retrieveRelevantKnowledge = async (
  query,
  techStack = [],
  topK = 3
) => {
  if (!query || !query.trim()) {
    throw new Error("Query is required for retrieval");
  }

  // 1. Convert query into embedding
  const queryEmbedding =
    await generateQueryEmbedding(query);

  // 2. Get knowledge chunks
  const knowledgeChunks =
    await KnowledgeChunk.find({}).lean();

  if (knowledgeChunks.length === 0) {
    return [];
  }

  // 3. Calculate semantic + technology relevance
  const rankedChunks = knowledgeChunks
    .map((chunk) => {
      const semanticScore = cosineSimilarity(
        queryEmbedding,
        chunk.embedding
      );

      const stackScore = calculateStackRelevance(
        chunk.source,
        techStack
      );

      // 70% semantic similarity
      // 30% technology relevance
      const finalScore =
        semanticScore * 0.7 +
        stackScore * 0.3;

      return {
        ...chunk,
        semanticScore,
        stackScore,
        score: finalScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 4. Minimum relevance threshold
  const MIN_RELEVANCE_SCORE = 0.60;

  const relevantChunks = rankedChunks.filter(
    (chunk) => chunk.score >= MIN_RELEVANCE_SCORE
  );

  // 5. Return top relevant knowledge
  return relevantChunks
    .slice(0, topK)
    .map((chunk) => ({
      source: chunk.source,
      content: chunk.content,
      score: chunk.score,
      semanticScore: chunk.semanticScore,
      stackScore: chunk.stackScore,
    }));
};

export default retrieveRelevantKnowledge;