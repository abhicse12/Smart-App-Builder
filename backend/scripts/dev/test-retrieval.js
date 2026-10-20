import "dotenv/config";

import mongoose from "mongoose";
import retrieveRelevantKnowledge from "../../services/retrievalService.js";

const testRetrieval = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected\n");

    const query =
      "Create a Tic-Tac-Toe game using HTML, CSS and JavaScript";

    console.log("Query:");
    console.log(query);

    console.log("\nRetrieving relevant knowledge...\n");

    const results =
      await retrieveRelevantKnowledge(query, 3);

    console.log("Top Results:\n");

    results.forEach((result, index) => {
      console.log(`--- Result ${index + 1} ---`);
      console.log("Source:", result.source);
      console.log("Score:", result.score);
      console.log("Content:");
      console.log(result.content);
      console.log();
    });
  } catch (error) {
    console.error(
      "Retrieval test failed:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB connection closed.");
  }
};

testRetrieval();