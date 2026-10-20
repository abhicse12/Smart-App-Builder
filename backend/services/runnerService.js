import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import { findUnreachableMongoUri } from "./sandboxEnv.js";

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

    // docker logs writes the container's stdout and
    // stderr to separate streams. Keep both, since
    // crashes are usually printed to stderr.
    return {
      success: true,
      logs: [result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
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
// Check whether any process inside the
// container is running from processDir
// (e.g. the backend's npm start / node)
// =====================================

const isProcessRunningInDir = async (
  containerName,
  processDir
) => {
  try {
    await runCommand("docker", [
      "exec",
      containerName,
      "sh",
      "-c",
      `for p in /proc/[0-9]*; do [ "$(readlink "$p/cwd" 2>/dev/null)" = "${processDir}" ] && exit 0; done; exit 1`,
    ]);

    return true;
  } catch {
    // No matching process, or container is not running
    return false;
  }
};

// =====================================
// Host health check
//
// When containerName is provided, a failure
// throws a RUNTIME_ERROR with Docker logs
// (same format as waitForContainerHealth).
//
// When processDir is also provided, polling
// stops early if no process is running from
// that directory anymore.
// =====================================

const waitForHealth = async (
  url,
  serviceName,
  attempts = 60,
  { containerName = null, processDir = null } = {}
) => {
  let lastError = null;
  let missedProcessChecks = 0;

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
      // Expected while the app is still starting; one short line
      lastError = error.cause?.code || error.message;
      console.log(
        `${serviceName} not reachable yet (${lastError})`
      );
    }

    // Stop early if the service process has exited.
    // Two consecutive misses are required to avoid
    // false positives while the process is starting.
    if (containerName && processDir) {
      const processRunning =
        await isProcessRunningInDir(
          containerName,
          processDir
        );

      missedProcessChecks = processRunning
        ? 0
        : missedProcessChecks + 1;

      if (missedProcessChecks >= 2) {
        console.log(
          `❌ ${serviceName} process is no longer running. Stopping health checks.`
        );

        lastError =
          `${serviceName} process exited before becoming healthy (last error: ${lastError})`;

        break;
      }
    }

    await sleep(2000);
  }

  if (containerName) {
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
        // vite build (Rollup) errors
        "is not exported by",
        "error during build",
        "Could not resolve",
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

  // Basic console programs
  if (fs.existsSync(path.join(projectRoot, "main.py"))) {
    return "python";
  }

  if (fs.existsSync(path.join(projectRoot, "src", "Main.java"))) {
    return "java";
  }

  return "unknown";
};

// =====================================
// Console projects (Python / Java)
// =====================================

// Like runCommand, but a non-zero exit code is a result, not an error
const runToCompletion = (command, args, timeoutMs) =>
  new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        timeout: timeoutMs,
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0,
          output: [stdout, stderr]
            .map((text) => String(text || "").trimEnd())
            .filter(Boolean)
            .join("\n"),
          killed: Boolean(error?.killed),
        });
      }
    );
  });

const CONSOLE_RUNTIMES = {
  python: {
    image: "python:3.12-slim",
    label: "Python program",
    memory: "256m",
    pids: "64",
    env: ["PYTHONDONTWRITEBYTECODE=1", "PYTHONUNBUFFERED=1"],
    program: "timeout 15 python main.py < /dev/null",
    // Tests are optional at run time (the validator requires them)
    tests:
      "if [ -d tests ]; then timeout 30 python -m unittest discover -s tests -v < /dev/null; else echo 'No tests folder'; fi",
  },
  java: {
    image: "eclipse-temurin:21-jdk",
    label: "Java program",
    memory: "512m",
    pids: "256",
    env: [],
    compile: "mkdir -p /tmp/out && javac -d /tmp/out $(find src -name '*.java')",
    program: "timeout 15 java -cp /tmp/out Main < /dev/null",
    tests:
      "if [ -f src/TestRunner.java ]; then timeout 30 java -ea -cp /tmp/out TestRunner < /dev/null; else echo 'No TestRunner'; fi",
  },
};

const describeExit = (result) =>
  result.exitCode === 124 || result.killed
    ? "timed out (infinite loop, or waiting for keyboard input although stdin is not a terminal)"
    : `exited with code ${result.exitCode}`;

const runConsoleProject = async ({
  projectId,
  projectRoot,
  projectType,
  containerName,
}) => {
  const runtime = CONSOLE_RUNTIMES[projectType];

  console.log(`Running ${runtime.label} in ${runtime.image}...`);

  // One short-lived, locked-down container per step: no network,
  // read-only project files, writable /tmp only
  const dockerRun = (step, script) =>
    runToCompletion(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        `${containerName}-${step}`,
        "--network",
        "none",
        "--memory",
        runtime.memory,
        "--cpus",
        "1",
        "--pids-limit",
        runtime.pids,
        "--security-opt",
        "no-new-privileges",
        "--cap-drop=ALL",
        "--read-only",
        "--tmpfs",
        "/tmp:exec",
        ...runtime.env.flatMap((variable) => ["-e", variable]),
        "-v",
        `${projectRoot}:/app:ro`,
        "-w",
        "/app",
        runtime.image,
        "sh",
        "-c",
        script,
      ],
      120000
    );

  const withCompile = (script) =>
    runtime.compile ? `${runtime.compile} && ${script}` : script;

  const program = await dockerRun("run", withCompile(runtime.program));

  console.log(
    `${runtime.label} ${describeExit(program)}`
  );

  if (program.exitCode !== 0) {
    throw new Error(
      JSON.stringify({
        type: "RUNTIME_ERROR",
        service: runtime.label,
        healthError: `${runtime.label} ${describeExit(program)} when run without a keyboard (stdin is /dev/null)`,
        dockerLogs: program.output.slice(-6000),
      })
    );
  }

  const tests = await dockerRun("tests", withCompile(runtime.tests));

  console.log(`${runtime.label} tests ${describeExit(tests)}`);

  if (tests.exitCode !== 0) {
    throw new Error(
      JSON.stringify({
        type: "RUNTIME_ERROR",
        service: `${runtime.label} tests`,
        healthError: `Tests ${describeExit(tests)}; fix the program logic or the failing test`,
        dockerLogs: tests.output.slice(-6000),
      })
    );
  }

  console.log(`✅ ${runtime.label} and its tests ran successfully!`);

  return {
    success: true,
    projectId,
    containerName,
    projectType,
    console: {
      output: program.output.slice(-20000),
      exitCode: program.exitCode,
      tests: {
        passed: true,
        output: tests.output.slice(-20000),
      },
    },
    status: "completed",
  };
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
    // -v also removes the container's anonymous
    // node_modules volumes
    await runCommand("docker", [
      "rm",
      "-f",
      "-v",
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
    // -v also removes the container's anonymous
    // node_modules volumes
    await runCommand("docker", [
      "rm",
      "-f",
      "-v",
      containerName,
    ]);
  } catch {
    // Container does not exist
  }

  // =====================================
  // PYTHON / JAVA CONSOLE PROJECT
  // =====================================

  if (projectType === "python" || projectType === "java") {
    return runConsoleProject({
      projectId,
      projectRoot,
      projectType,
      containerName,
    });
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

      // nginx's root master only needs these to set up its cache
      // dirs and switch to the unprivileged worker user
      "--cap-drop=ALL",
      "--cap-add=CHOWN",
      "--cap-add=SETUID",
      "--cap-add=SETGID",

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

      // Generated code and npm install scripts need no Linux
      // capabilities
      "--cap-drop=ALL",

      "-v",
      `${projectRoot}:/app`,

      // Keep node_modules inside the container (anonymous
      // volume) so an interrupted npm install never leaves
      // corrupted modules in the host project folder
      "-v",
      "/app/frontend/node_modules",

      "-p",
      "127.0.0.1::5173",

      "node:22-alpine",

      "sh",
      "-c",

      "cd /app/frontend && npm install && npm run build && npm run dev -- --host 0.0.0.0 --port 5173",
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

    const frontendUrl = `http://127.0.0.1:${frontendHostPort}`;

    await waitForHealth(
      frontendUrl,
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

    // backend/.env may point MONGO_URI at a Docker Compose host
    // (e.g. mongodb://mongodb:27017) that does not exist in the
    // sandbox. The file is not changed; the variable is blanked
    // for this container only. Real external URIs are kept.
    const unreachableMongoHost = findUnreachableMongoUri(
      path.join(projectRoot, "backend", ".env")
    );

    if (unreachableMongoHost) {
      console.warn(
        `backend/.env sets MONGO_URI to sandbox-unreachable host "${unreachableMongoHost}"; starting with MONGO_URI unset (JSON mode).`
      );
    }

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

      // Generated code and npm install scripts need no Linux
      // capabilities
      "--cap-drop=ALL",

      "-v",
      `${projectRoot}:/app`,

      // Keep node_modules inside the container (anonymous
      // volumes) so an interrupted npm install never leaves
      // corrupted modules in the host project folder
      "-v",
      "/app/backend/node_modules",

      "-v",
      "/app/frontend/node_modules",

      // An empty MONGO_URI is not overridden by dotenv, so the
      // backend falls back to JSON mode instead of hanging on an
      // unreachable database
      ...(unreachableMongoHost ? ["-e", "MONGO_URI="] : []),

      "-p",
      `127.0.0.1::${backendPort}`,

      "-p",
      `127.0.0.1::${frontendPort}`,

      "node:22",

      "sh",
      "-c",

      // "npm run build" compiles every module first, so a broken import
      // (e.g. a missing named export) fails here with a log the Fixer
      // can use, instead of a blank page in the browser. The output goes
      // to /tmp so nothing is written into the project folder.
      "cd /app/backend && npm install && npm start & cd /app/frontend && npm install && npm run build -- --outDir /tmp/vite-build-check --emptyOutDir && npm run dev -- --host 0.0.0.0 --port 5173",
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
      "Node Backend",
      60,
      {
        containerName,
        processDir: "/app/backend",
      }
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