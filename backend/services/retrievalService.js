import KnowledgeChunk from "../models/KnowledgeChunk.js";
import { generateQueryEmbedding } from "./embeddingService.js";
import { detectTechAreas } from "./techStackMatcher.js";

/* ==================================================
   COSINE SIMILARITY
================================================== */

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

/* ==================================================
   GET ALLOWED TECHNOLOGIES
   (same matching as the architecture rules loader)
================================================== */

const getAllowedTechnologies = (techStack = []) =>
  new Set(["common", ...detectTechAreas(techStack)]);

/* ==================================================
   TECHNOLOGY RELEVANCE
================================================== */

const calculateTechnologyRelevance = (
  chunk,
  allowedTechnologies
) => {
  const category =
    chunk.metadata?.category || "common";

  const technology =
    chunk.metadata?.technology || "";

  /* Common documents are always relevant */
  if (category === "common") {
    return 0.8;
  }

  /* Selected technology-specific document */
  if (allowedTechnologies.has(technology)) {
    return 1.0;
  }

  /* Different technology */
  return 0.0;
};

/* ==================================================
   RETRIEVE RELEVANT KNOWLEDGE
================================================== */

const retrieveRelevantKnowledge = async (
  query,
  techStack = [],
  topK = 3
) => {
  if (!query || !query.trim()) {
    throw new Error(
      "Query is required for retrieval"
    );
  }

  /*
    Backward compatibility:
    If second argument is a number,
    treat it as topK.
  */

  if (typeof techStack === "number") {
    topK = techStack;
    techStack = [];
  }

  /* ----------------------------------------------
     1. Generate query embedding
  ---------------------------------------------- */

  const queryEmbedding =
    await generateQueryEmbedding(query);

  /* ----------------------------------------------
     2. Get knowledge chunks
  ---------------------------------------------- */

  const knowledgeChunks =
    await KnowledgeChunk.find({}).lean();

  if (knowledgeChunks.length === 0) {
    return [];
  }

  /* ----------------------------------------------
     3. Determine allowed technologies
  ---------------------------------------------- */

  const allowedTechnologies =
    getAllowedTechnologies(
      techStack
    );

  console.log(
    "\n🧠 RAG allowed technologies:",
    [...allowedTechnologies]
  );

  /* ----------------------------------------------
     4. Filter technology-specific knowledge
  ---------------------------------------------- */

  const filteredChunks =
    knowledgeChunks.filter((chunk) => {
      const category =
        chunk.metadata?.category || "common";

      /*
        Common documents are always allowed.
        Technology-specific documents are allowed
        only when they match the selected stack.
      */

      if (category === "common") {
        return true;
      }

      const technology =
        chunk.metadata?.technology;

      return allowedTechnologies.has(
        technology
      );
    });

  /* ----------------------------------------------
     5. Calculate semantic + technology score
  ---------------------------------------------- */

  const rankedChunks =
    filteredChunks
      .map((chunk) => {
        const semanticScore =
          cosineSimilarity(
            queryEmbedding,
            chunk.embedding
          );

        const technologyScore =
          calculateTechnologyRelevance(
            chunk,
            allowedTechnologies
          );

        /*
          70% semantic similarity
          30% technology relevance
        */

        const finalScore =
          semanticScore * 0.7 +
          technologyScore * 0.3;

        return {
          ...chunk,
          semanticScore,
          technologyScore,
          score: finalScore,
        };
      })
      .sort(
        (a, b) => b.score - a.score
      );

  /* ----------------------------------------------
     6. Minimum relevance threshold
  ---------------------------------------------- */

  const MIN_RELEVANCE_SCORE = 0.60;

  const relevantChunks =
    rankedChunks.filter(
      (chunk) =>
        chunk.score >=
        MIN_RELEVANCE_SCORE
    );

  /* ----------------------------------------------
     7. Return top results
  ---------------------------------------------- */

  return relevantChunks
    .slice(0, topK)
    .map((chunk) => ({
      source: chunk.source,
      content: chunk.content,
      score: chunk.score,
      semanticScore:
        chunk.semanticScore,
      technologyScore:
        chunk.technologyScore,
    }));
};

export default retrieveRelevantKnowledge;