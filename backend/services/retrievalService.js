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

const retrieveRelevantKnowledge = async (
  query,
  topK = 3
) => {
  if (!query || !query.trim()) {
    throw new Error("Query is required for retrieval");
  }

  // 1. Convert user query into embedding
  const queryEmbedding =
    await generateQueryEmbedding(query);

  // 2. Get all knowledge chunks from MongoDB
  const knowledgeChunks =
    await KnowledgeChunk.find({}).lean();

  if (knowledgeChunks.length === 0) {
    return [];
  }

  // 3. Calculate similarity with every stored chunk
  const rankedChunks = knowledgeChunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(
        queryEmbedding,
        chunk.embedding
      ),
    }))
    .sort((a, b) => b.score - a.score);

  // 4. Return top relevant chunks
  return rankedChunks
    .slice(0, topK)
    .map((chunk) => ({
      source: chunk.source,
      content: chunk.content,
      score: chunk.score,
    }));
};

export default retrieveRelevantKnowledge;