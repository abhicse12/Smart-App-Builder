import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import KnowledgeChunk from "../models/KnowledgeChunk.js";

import {
  generateDocumentEmbedding,
} from "../services/embeddingService.js";

const DOCUMENTS_DIR = path.join(
  process.cwd(),
  "rag",
  "documents"
);

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

const chunkText = (
  text,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
) => {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(
      start + chunkSize,
      text.length
    );

    const chunk = text
      .slice(start, end)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === text.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
};

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
        "MONGO_URI is not loaded"
    );
  }

  await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log(
    "MongoDB connected"
  );
};

const indexKnowledgeBase = async () => {
  try {
    await connectDB();

    console.log(
      "\nReading knowledge documents..."
    );

    const files = await fs.readdir(
      DOCUMENTS_DIR
    );

    const markdownFiles = files.filter(
      (file) => file.endsWith(".md")
    );

    console.log(
      "Documents found:",
      markdownFiles
    );

    // Remove old knowledge chunks
    await KnowledgeChunk.deleteMany({});

    console.log(
      "\nOld knowledge chunks removed."
    );

    let totalChunks = 0;

    for (const fileName of markdownFiles) {
      const filePath = path.join(
        DOCUMENTS_DIR,
        fileName
      );

      const content = await fs.readFile(
        filePath,
        "utf-8"
      );

      const chunks = chunkText(content);

      console.log(
        `\n${fileName}: ${chunks.length} chunks`
      );

      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        const chunk = chunks[i];

        console.log(
          `Embedding ${fileName} - chunk ${
            i + 1
          }/${chunks.length}`
        );

        const embedding =
          await generateDocumentEmbedding(
            chunk
          );

        await KnowledgeChunk.create({
          source: fileName,
          content: chunk,
          embedding,
          metadata: {
            chunkIndex: i,
          },
        });

        totalChunks++;
      }
    }

    console.log(
      `\n✅ Knowledge base indexed successfully!`
    );

    console.log(
      "Total chunks:",
      totalChunks
    );
  } catch (error) {
    console.error(
      "\n❌ Knowledge indexing failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB connection closed."
    );
  }
};

indexKnowledgeBase();