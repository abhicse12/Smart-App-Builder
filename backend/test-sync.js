import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import syncProjectFiles from "./services/syncProjectFiles.js";

const projectId = "6aa31f95767d915bbe06cf07";

const run = async () => {
  try {
    await connectDB();

    const result = await syncProjectFiles(projectId);

    console.log("\nSync Result:");
    console.log(result);

    process.exit(0);
  } catch (error) {
    console.error("Sync Error:", error.message);
    process.exit(1);
  }
};

run();