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

/* ==================================================
   CHUNK TEXT
================================================== */

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

/* ==================================================
   GET ALL MARKDOWN FILES RECURSIVELY
================================================== */

const getMarkdownFiles = async (directory) => {
  const entries = await fs.readdir(
    directory,
    {
      withFileTypes: true,
    }
  );

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      const nestedFiles =
        await getMarkdownFiles(fullPath);

      files.push(...nestedFiles);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md")
    ) {
      files.push(fullPath);
    }
  }

  return files;
};

/* ==================================================
   EXTRACT DOCUMENT METADATA
================================================== */

const getDocumentMetadata = (
  filePath
) => {
  const relativePath = path
    .relative(
      DOCUMENTS_DIR,
      filePath
    )
    .replace(/\\/g, "/");

  const parts = relativePath.split("/");

  const fileName =
    parts[parts.length - 1];

  const fileNameWithoutExtension =
    fileName.replace(/\.md$/, "");

  let category = "common";
  let technology = "common";

  if (parts.length >= 2) {
    category = parts[0];
    technology =
      fileNameWithoutExtension;
  }

  return {
    relativePath,
    category,
    technology,
  };
};

/* ==================================================
   CONNECT DATABASE
================================================== */

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

/* ==================================================
   INDEX KNOWLEDGE BASE
================================================== */

const indexKnowledgeBase = async () => {
  try {
    await connectDB();

    console.log(
      "\nReading knowledge documents..."
    );

    /* ----------------------------------------------
       Find markdown files recursively
    ---------------------------------------------- */

    const markdownFiles =
      await getMarkdownFiles(
        DOCUMENTS_DIR
      );

    console.log(
      "\nDocuments found:"
    );

    for (const filePath of markdownFiles) {
      const metadata =
        getDocumentMetadata(
          filePath
        );

      console.log(
        `- ${metadata.relativePath}`
      );
    }

    /* ----------------------------------------------
       Remove old knowledge chunks
    ---------------------------------------------- */

    await KnowledgeChunk.deleteMany({});

    console.log(
      "\nOld knowledge chunks removed."
    );

    let totalChunks = 0;

    /* ----------------------------------------------
       Process every document
    ---------------------------------------------- */

    for (const filePath of markdownFiles) {
      const content =
        await fs.readFile(
          filePath,
          "utf-8"
        );

      const chunks =
        chunkText(content);

      const metadata =
        getDocumentMetadata(
          filePath
        );

      console.log(
        `\n${metadata.relativePath}: ${chunks.length} chunks`
      );

      /* --------------------------------------------
         Generate embeddings
      -------------------------------------------- */

      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        const chunk = chunks[i];

        console.log(
          `Embedding ${metadata.relativePath} - chunk ${
            i + 1
          }/${chunks.length}`
        );

        const embedding =
          await generateDocumentEmbedding(
            chunk
          );

        await KnowledgeChunk.create({
          source:
            metadata.relativePath,

          content: chunk,

          embedding,

          metadata: {
            chunkIndex: i,

            category:
              metadata.category,

            technology:
              metadata.technology,
          },
        });

        totalChunks++;
      }
    }

    console.log(
      "\n✅ Knowledge base indexed successfully!"
    );

    console.log(
      "Total documents:",
      markdownFiles.length
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