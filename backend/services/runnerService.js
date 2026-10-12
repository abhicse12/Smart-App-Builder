import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// =====================================
// Docker command
// =====================================

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
// Docker Runtime Logs
// =====================================

const getDockerLogs = async (containerName, tail = 100) => {
  try {
    const result = await runCommand("docker", [
      "logs",
      "--tail",
      String(tail),
      containerName,
    ]);

    return {
      success: true,
      logs: result.stdout || result.stderr || "",
    };
  } catch (error) {
    return {
      success: false,
      logs: error.message,
    };
  }
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
// Get Docker container IP
// =====================================


// =====================================
// Container health check
// =====================================

const waitForContainerHealth = async (
  containerName,
  containerPort,
  serviceName,
  attempts = 60
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

      const healthUrl =
  `http://127.0.0.1:${containerPort}`;


      console.log(
        `${serviceName} health URL: [${healthUrl}]`
      );

      // =====================================
      // Check Docker Container Logs
      // =====================================

      const dockerLogs =
        await getDockerLogs(containerName);

      const logs = dockerLogs.logs || "";

      // Detect common Vite / React runtime errors
      const runtimeErrorPatterns = [
        "Failed to resolve import",
        "Cannot find module",
        "Module not found",
        "SyntaxError",
        "ReferenceError",
        "TypeError",
        "does not provide an export",
        "Internal server error",
        "Pre-transform error",
        "Failed to load url",
      ];

      const detectedError =
        runtimeErrorPatterns.find((pattern) =>
          logs.includes(pattern)
        );

      if (detectedError) {
        console.log(
          `❌ Runtime error detected in Docker logs: ${detectedError}`
        );

        throw new Error(
          JSON.stringify({
            type: "RUNTIME_ERROR",
            service: serviceName,
            healthError:
              `Detected runtime error: ${detectedError}`,
            dockerLogs: logs,
          })
        );
      }

      // =====================================
      // Check HTTP Health
      // =====================================

      await runCommand("docker", [
        "exec",
        containerName,
        "wget",
        "-q",
        "-O",
        "/dev/null",
        healthUrl,
      ]);

      console.log(
        `✅ ${serviceName} is healthy`
      );

      return true;

    } catch (error) {
      lastError = error.message;

      console.log(
        `❌ ${serviceName} health check failed: ${lastError}`
      );

      // If this is an actual runtime error,
      // immediately stop health checking.
      try {
        const parsedError =
          JSON.parse(error.message);

        if (
          parsedError.type === "RUNTIME_ERROR"
        ) {
          throw error;
        }
      } catch (parseError) {
        if (
          parseError.message === error.message
        ) {
          throw error;
        }
      }
    }

    await sleep(2000);
  }

  const logs =
    await getDockerLogs(containerName);

  throw new Error(
    JSON.stringify({
      type: "RUNTIME_ERROR",
      service: serviceName,
      healthError: lastError,
      dockerLogs: logs.logs,
    })
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

  const frontendPackagePath = path.join(
    projectRoot,
    "frontend",
    "package.json"
  );

  const viteConfigPath = path.join(
    projectRoot,
    "frontend",
    "vite.config.js"
  );

  const mainJsxPath = path.join(
    projectRoot,
    "frontend",
    "src",
    "main.jsx"
  );

  let isReactVite = false;

  // Detect React + Vite
  if (
    hasFrontend &&
    fs.existsSync(frontendPackagePath) &&
    fs.existsSync(viteConfigPath) &&
    fs.existsSync(mainJsxPath)
  ) {
    try {
      const frontendPackage = JSON.parse(
        fs.readFileSync(
          frontendPackagePath,
          "utf-8"
        )
      );

      const dependencies = {
        ...(frontendPackage.dependencies || {}),
        ...(frontendPackage.devDependencies || {}),
      };

      isReactVite =
        Boolean(dependencies.react) &&
        Boolean(dependencies["react-dom"]) &&
        Boolean(dependencies.vite);
    } catch (error) {
      console.log(
        "Could not read frontend/package.json:",
        error.message
      );
    }
  }

  // Full-stack
  if (hasBackend && hasFrontend) {
    return "fullstack";
  }

  // React + Vite
  if (isReactVite) {
    return "react";
  }

  // Static HTML/CSS/JS
  if (hasIndexHtml) {
    return "static";
  }

  return "unknown";
};

// =====================================
// Stop Project
// =====================================

const stopProject = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const containerName =
    `ai-builder-${projectId}`;

  console.log(
    `Stopping Docker container: ${containerName}`
  );

  try {
    await runCommand("docker", [
      "rm",
      "-f",
      containerName,
    ]);

    console.log(
      `Docker container stopped: ${containerName}`
    );
  } catch (error) {
    console.log(
      `Container ${containerName} was not running or already stopped.`
    );
  }
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
  // Detect project type
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
  // STATIC PROJECT
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

      "--memory",
      "256m",

      "--cpus",
      "1",

      "--pids-limit",
      "100",

      "--security-opt",
      "no-new-privileges",

      "-v",
      `${projectRoot}:/usr/share/nginx/html:ro`,

      "-p",
      "127.0.0.1::80",

      "nginx:alpine",
    ]);

    console.log(
      "Static Docker container started."
    );

    const frontendHostPort =
      await getDockerHostPort(
        containerName,
        80
      );

    console.log(
      `Static project mapped to host port: ${frontendHostPort}`
    );

    await waitForContainerHealth(
      containerName,
      80,
      "Static Frontend"
    );

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
        previewUrl: frontendPreviewUrl,
        status: "running",
      },

      status: "running",
    };
  }

  // =====================================
  // REACT + VITE PROJECT
  // =====================================

  if (projectType === "react") {
    console.log(
      "Starting React + Vite project..."
    );

    await runCommand("docker", [
      "run",
      "-d",

      "--name",
      containerName,

      "--memory",
      "512m",

      "--cpus",
      "1",

      "--pids-limit",
      "100",

      "--security-opt",
      "no-new-privileges",

      "-v",
      `${projectRoot}:/app`,

      "-p",
      "127.0.0.1::5173",

      "node:22-alpine",

      "sh",
      "-c",

      "cd /app/frontend && rm -rf node_modules package-lock.json && npm install && npm run build && npm run dev -- --host 0.0.0.0 --port 5173",
    ]);

    console.log(
      "React Docker container started."
    );

    // =====================================
    // Get dynamically assigned host port
    // =====================================

    const frontendHostPort =
      await getDockerHostPort(
        containerName,
        5173
      );

    console.log(
      `React frontend mapped to host port: ${frontendHostPort}`
    );

    // =====================================
    // Container health check
    //
    // Vite runs inside the container on
    // 0.0.0.0:5173.
    // =====================================

    await waitForContainerHealth(
      containerName,
      5173,
      "React Frontend"
    );

    const frontendPreviewUrl =
      `http://127.0.0.1:${frontendHostPort}`;

    console.log(
      "✅ React application is fully running!"
    );

    return {
      success: true,

      projectId,

      containerName,

      projectType: "react",

      frontend: {
        hostPort: frontendHostPort,
        previewUrl: frontendPreviewUrl,
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

    // =====================================
    // Backend port
    // =====================================

    const backendPort = 5001;

    // =====================================
    // Frontend port
    // =====================================

    const frontendPort = 5173;

    await runCommand("docker", [
      "run",
      "-d",

      "--name",
      containerName,

      "--memory",
      "768m",

      "--cpus",
      "1",

      "--pids-limit",
      "150",

      "--security-opt",
      "no-new-privileges",

      "-v",
      `${projectRoot}:/app`,

      "-p",
      `127.0.0.1::${backendPort}`,

      "-p",
      `127.0.0.1::${frontendPort}`,

      "node:22",

      "sh",
      "-c",

      "cd /app/backend && npm install && npm start & cd /app/frontend && npm install && npm run dev -- --host 0.0.0.0 --port 5173",
    ]);

    console.log(
      "Full-stack Docker container started."
    );

    // =====================================
    // Get host ports
    // =====================================

    const backendHostPort =
      await getDockerHostPort(
        containerName,
        backendPort
      );

    const frontendHostPort =
      await getDockerHostPort(
        containerName,
        frontendPort
      );

    console.log(
      `Backend mapped to host port: ${backendHostPort}`
    );

    console.log(
      `Frontend mapped to host port: ${frontendHostPort}`
    );

    // =====================================
    // Backend health
    // =====================================

    const backendUrl =
      `http://127.0.0.1:${backendHostPort}/health`;

    await waitForHealth(
      backendUrl,
      "Node Backend"
    );

    // =====================================
    // Frontend health
    // =====================================

    await waitForContainerHealth(
      containerName,
      frontendPort,
      "React Frontend"
    );

    const frontendPreviewUrl =
      `http://127.0.0.1:${frontendHostPort}`;

    const backendBaseUrl =
      `http://127.0.0.1:${backendHostPort}`;

    console.log(
      "✅ Full-stack application is fully running!"
    );

    return {
      success: true,

      projectId,

      containerName,

      projectType: "fullstack",

      frontend: {
        hostPort: frontendHostPort,
        previewUrl: frontendPreviewUrl,
        status: "running",
      },

      backend: {
        hostPort: backendHostPort,
        baseUrl: backendBaseUrl,
        status: "running",
      },

      status: "running",
    };
  }

  // =====================================
  // Unsupported project type
  // =====================================

  throw new Error(
    `Unsupported project type: ${projectType}`
  );
};

// =====================================
// Exports
// =====================================

export {
  stopProject,
  getDockerLogs,
};

export default runProject;