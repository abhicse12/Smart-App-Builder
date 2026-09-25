import runProject from "./services/runnerService.js";

const projectId = "6aa31f95767d915bbe06cf07";

const test = async () => {
  try {
    const result = await runProject(projectId);

    console.log("\nRunner Result:");
    console.log(result);
  } catch (error) {
    console.error("\nRunner Error:");
    console.error(error.message);
  }
};

test();