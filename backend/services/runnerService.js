import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr?.trim() ||
                stdout?.trim() ||
                error.message
            )
          );
          return;
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }
    );
  });
};


// =====================================
// Docker host port
// =====================================

const getDockerHostPort = async (
  containerName,
  containerPort
) => {
  const result = await runCommand("docker", [
    "port",
    containerName,
    `${containerPort}/tcp`,
  ]);

  const match = result.stdout.match(/:(\d+)$/);

  if (!match) {
    throw new Error(
      `Could not determine host port for container port ${containerPort}`
    );
  }

  return Number(match[1]);
};


// =====================================
// Host health check
// =====================================

const waitForHealth = async (
  url,
  serviceName,
  attempts = 15
) => {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      console.log(
        `${serviceName} health check ${attempt}/${attempts}`
      );

      const response = await fetch(url);

      if (response.ok) {
        console.log(
          `✅ ${serviceName} is healthy`
        );

        return true;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }

    await sleep(2000);
  }

  throw new Error(
    `${serviceName} health check failed: ${lastError}`
  );
};


// =====================================
// Container health check
// =====================================

const waitForContainerHealth = async (
  containerName,
  containerPort,
  serviceName,
  attempts = 15
) => {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      console.log(
        `${serviceName} health check ${attempt}/${attempts}`
      );

      await runCommand("docker", [
        "exec",
        containerName,
        "wget",
        "-q",
        "-O",
        "/dev/null",
        `http://127.0.0.1:${containerPort}`,
      ]);

      console.log(
        `✅ ${serviceName} is healthy`
      );

      return true;
    } catch (error) {
      lastError = error.message;
    }

    await sleep(2000);
  }

  throw new Error(
    `${serviceName} health check failed: ${lastError}`
  );
};


// =====================================
// Detect project type
// =====================================

const detectProjectType = (projectRoot) => {
  const hasBackend = fs.existsSync(
    path.join(projectRoot, "backend")
  );

  const hasFrontend = fs.existsSync(
    path.join(projectRoot, "frontend")
  );

  const hasIndexHtml = fs.existsSync(
    path.join(projectRoot, "index.html")
  );

  // MERN / full-stack project
  if (hasBackend && hasFrontend) {
    return "fullstack";
  }

  // Simple HTML/CSS/JS project
  if (hasIndexHtml) {
    return "static";
  }

  return "unknown";
};


// =====================================
// Run Project
// =====================================

const runProject = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const projectRoot = path.resolve(
    process.cwd(),
    "generated-projects",
    projectId.toString()
  );

  const generatedProjectsRoot = path.resolve(
    process.cwd(),
    "generated-projects"
  );


  // =====================================
  // Security
  // =====================================

  if (
    projectRoot === generatedProjectsRoot ||
    !projectRoot.startsWith(
      generatedProjectsRoot + path.sep
    )
  ) {
    throw new Error("Invalid project path");
  }


  if (!fs.existsSync(projectRoot)) {
    throw new Error(
      `Generated project not found: ${projectRoot}`
    );
  }


  // =====================================
  // Detect project
  // =====================================

  const projectType =
    detectProjectType(projectRoot);

  console.log(
    `Detected project type: ${projectType}`
  );


  if (projectType === "unknown") {
    throw new Error(
      "Unsupported project structure. Could not detect a runnable project."
    );
  }


  const containerName =
    `ai-builder-${projectId}`;


  console.log(
    `Starting Docker container: ${containerName}`
  );


  // =====================================
  // Remove old container
  // =====================================

  try {
    await runCommand("docker", [
      "rm",
      "-f",
      containerName,
    ]);
  } catch {
    // Container does not exist
  }


  // =====================================
  // STATIC HTML/CSS/JS PROJECT
  // =====================================

  if (projectType === "static") {

    console.log(
      "Starting static HTML/CSS/JS project..."
    );


    await runCommand("docker", [
      "run",
      "-d",
      "--name",
      containerName,

      // Resource limits
      "--memory",
      "256m",

      "--cpus",
      "1",

      "--pids-limit",
      "100",

      // Security
      "--security-opt",
      "no-new-privileges",

      // Serve project directly from Nginx document root
      "-v",
      `${projectRoot}:/usr/share/nginx/html:ro`,

      // Nginx listens on port 80
      "-p",
      "127.0.0.1::80",

      "nginx:alpine",
    ]);


    console.log(
      "Static Docker container started."
    );


    // =====================================
    // Get frontend host port
    // =====================================

    const frontendHostPort =
    await getDockerHostPort(
      containerName,
      80
    );


    console.log(
      `Static project mapped to host port: ${frontendHostPort}`
    );


    // =====================================
    // Frontend health check
    // =====================================

    await waitForContainerHealth(
      containerName,
      80,
      "Static Frontend"
    );


    // =====================================
    // Preview URL
    // =====================================

    const frontendPreviewUrl =
      `http://127.0.0.1:${frontendHostPort}`;


    console.log(
      "✅ Static application is fully running!"
    );


    return {
      success: true,

      projectId,

      containerName,

      projectType: "static",

      frontend: {
        hostPort: frontendHostPort,

        previewUrl:
          frontendPreviewUrl,

        status: "running",
      },

      status: "running",
    };
  }


  // =====================================
  // FULL STACK PROJECT
  // =====================================

  if (projectType === "fullstack") {

    console.log(
      "Starting full-stack project..."
    );


    await runCommand("docker", [
      "run",
      "-d",
      "--name",
      containerName,

      // Resource limits
      "--memory",
      "512m",

      "--cpus",
      "1",

      "--pids-limit",
      "100",

      // Security
      "--security-opt",
      "no-new-privileges",

      // Project mount
      "-v",
      `${projectRoot}:/app`,

      // Backend
      "-p",
      "127.0.0.1::5001",

      // Frontend
      "-p",
      "127.0.0.1::5173",

      "node:22-alpine",

      "sh",
      "-c",

      "cd /app/backend && npm install && npm start & cd /app/frontend && npm install && npm run dev -- --host 0.0.0.0 --port 5173",
    ]);


    console.log(
      "Full-stack Docker container started."
    );


    // =====================================
    // Backend
    // =====================================

    const backendHostPort =
      await getDockerHostPort(
        containerName,
        5001
      );


    // =====================================
    // Frontend
    // =====================================

    const frontendHostPort =
      await getDockerHostPort(
        containerName,
        5173
      );


    console.log(
      `Generated backend mapped to host port: ${backendHostPort}`
    );

    console.log(
      `Generated frontend mapped to host port: ${frontendHostPort}`
    );


    // =====================================
    // Backend health
    // =====================================

    const backendHealthUrl =
      `http://127.0.0.1:${backendHostPort}/health`;


    await waitForHealth(
      backendHealthUrl,
      "Backend"
    );


    // =====================================
    // Frontend health
    // =====================================

    await waitForContainerHealth(
      containerName,
      5173,
      "Frontend"
    );


    // =====================================
    // Preview
    // =====================================

    const frontendPreviewUrl =
      `http://127.0.0.1:${frontendHostPort}`;


    console.log(
      "✅ Generated application is fully running!"
    );


    return {
      success: true,

      projectId,

      containerName,

      projectType: "fullstack",

      backend: {
        hostPort: backendHostPort,

        healthUrl:
          backendHealthUrl,

        status: "running",
      },

      frontend: {
        hostPort: frontendHostPort,

        previewUrl:
          frontendPreviewUrl,

        status: "running",
      },

      status: "running",
    };
  }
};


export default runProject;