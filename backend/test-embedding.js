import "dotenv/config";

import {
  generateDocumentEmbedding,
  generateQueryEmbedding,
} from "./services/embeddingService.js";

const test = async () => {
  try {
    console.log("Testing document embedding...");

    const documentVector =
      await generateDocumentEmbedding(
        "Static HTML CSS JavaScript applications do not require React or Node.js."
      );

    console.log(
      "Document embedding generated!"
    );

    console.log(
      "Vector length:",
      documentVector.length
    );

    console.log(
      "First 5 values:",
      documentVector.slice(0, 5)
    );

    console.log("\nTesting query embedding...");

    const queryVector =
      await generateQueryEmbedding(
        "Create a static HTML CSS JavaScript application"
      );

    console.log(
      "Query embedding generated!"
    );

    console.log(
      "Vector length:",
      queryVector.length
    );

    console.log(
      "First 5 values:",
      queryVector.slice(0, 5)
    );
  } catch (error) {
    console.error(
      "Embedding test failed:",
      error
    );
  }
};

test();