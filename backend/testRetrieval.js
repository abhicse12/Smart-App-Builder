import "dotenv/config";

import mongoose from "mongoose";

import retrieveRelevantKnowledge from "./services/retrievalService.js";

const runTest = async (
  name,
  query,
  techStack
) => {
  console.log("\n=================================");
  console.log(name);
  console.log("=================================");

  console.log("Tech Stack:", techStack);

  const results =
    await retrieveRelevantKnowledge(
      query,
      techStack,
      5
    );

  results.forEach(
    (result, index) => {
      console.log(
        `\n${index + 1}. ${result.source}`
      );

      console.log(
        "Score:",
        result.score.toFixed(3)
      );

      console.log(
        "Semantic:",
        result.semanticScore.toFixed(3)
      );

      console.log(
        "Technology:",
        result.technologyScore.toFixed(3)
      );
    }
  );
};

const main = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected"
    );

    await runTest(
      "STATIC WEB TEST",
      "Build a responsive website using HTML CSS and JavaScript",
      [
        "HTML",
        "CSS",
        "JavaScript",
      ]
    );

    await runTest(
      "REACT TEST",
      "Build a React application using Vite and React components",
      [
        "React",
        "Vite",
      ]
    );

    await runTest(
      "MERN TEST",
      "Build a full stack application using React Node Express and MongoDB",
      [
        "MERN",
      ]
    );

    await runTest(
      "PYTHON FASTAPI TEST",
      "Build a REST API using Python and FastAPI",
      [
        "Python",
        "FastAPI",
      ]
    );

    await runTest(
      "JAVA SPRING BOOT TEST",
      "Build a REST API using Java and Spring Boot",
      [
        "Java",
        "Spring Boot",
      ]
    );
  } catch (error) {
    console.error(
      "\n❌ Retrieval test failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "\nMongoDB connection closed."
    );
  }
};

main();