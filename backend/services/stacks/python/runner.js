// Runs a Python full-stack project in two containers that share one network
// namespace, so the Vite proxy reaches the backend on localhost:5001:
//
//   ai-builder-<id>            python:3.12-slim   FastAPI on 5001 (publishes both ports)
//   ai-builder-<id>-frontend   node:22            Vite on 5173
//
// The backend sees the source read-only; only backend/data is writable.
// Python packages stay in the container's /tmp, never in the project folder.

const BACKEND_PORT = 5001;
const FRONTEND_PORT = 5173;

const BACKEND_START =
  "pip install --quiet --disable-pip-version-check --no-cache-dir --target /tmp/pydeps -r requirements.txt " +
  `&& PYTHONPATH=/tmp/pydeps python -m uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}`;

// "npm run build" compiles every module first, so a broken import fails
// here with a log the Fixer can use. The output goes to /tmp.
const FRONTEND_START =
  "npm install --no-audit --no-fund " +
  "&& npm run build -- --outDir /tmp/vite-build-check --emptyOutDir " +
  `&& npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT}`;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const frontendContainerName = (containerName) =>
  `${containerName}-frontend`;

// docker = { runCommand, getDockerLogs, getDockerHostPort } from runnerService
export const removePythonFrontend = async (containerName, docker) => {
  try {
    await docker.runCommand("docker", [
      "rm",
      "-f",
      "-v",
      frontendContainerName(containerName),
    ]);
  } catch {
    // Not running (every other project type has no such container)
  }
};

const isRunning = async (name, docker) => {
  const state = await docker
    .runCommand("docker", ["inspect", "-f", "{{.State.Running}}", name])
    .catch(() => ({ stdout: "false" }));

  return state.stdout.trim() === "true";
};

// Polls url until it answers; a stopped container ends the wait right away
const waitForService = async ({ url, label, name, docker, attempts }) => {
  const fail = async (healthError) => {
    const logs = await docker.getDockerLogs(name);

    throw new Error(
      JSON.stringify({
        type: "RUNTIME_ERROR",
        service: label,
        healthError,
        dockerLogs: logs.logs,
      })
    );
  };

  let lastError = "not started";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return;
      }

      lastError = `GET ${url} returned HTTP ${response.status}`;
    } catch (error) {
      lastError = error.cause?.code || error.message;
    }

    if (!(await isRunning(name, docker))) {
      await fail(`${label} exited before it was ready (last error: ${lastError})`);
    }

    console.log(`${label} not ready yet (${lastError})`);
    await sleep(2000);
  }

  await fail(`${label} never became ready (last error: ${lastError})`);
};

export const runPythonFullstack = async ({
  projectId,
  projectRoot,
  containerName,
  docker,
}) => {
  await docker.runCommand("docker", [
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
    "--cap-drop=ALL",
    "--read-only",
    "--tmpfs",
    "/tmp:exec",
    "-e",
    "PYTHONDONTWRITEBYTECODE=1",
    "-e",
    "PYTHONUNBUFFERED=1",
    "-e",
    "PIP_ROOT_USER_ACTION=ignore",
    "-v",
    `${projectRoot}/backend:/app/backend:ro`,
    "-v",
    `${projectRoot}/backend/data:/app/backend/data`,
    "-w",
    "/app/backend",
    "-p",
    `127.0.0.1::${BACKEND_PORT}`,
    "-p",
    `127.0.0.1::${FRONTEND_PORT}`,
    "python:3.12-slim",
    "sh",
    "-c",
    BACKEND_START,
  ]);

  const frontendName = frontendContainerName(containerName);

  await docker.runCommand("docker", [
    "run",
    "-d",
    "--name",
    frontendName,
    "--network",
    `container:${containerName}`,
    "--memory",
    "768m",
    "--cpus",
    "1",
    "--pids-limit",
    "150",
    "--security-opt",
    "no-new-privileges",
    "--cap-drop=ALL",
    "-v",
    `${projectRoot}/frontend:/app/frontend`,
    // Keep node_modules in the container, never in the project folder
    "-v",
    "/app/frontend/node_modules",
    "-w",
    "/app/frontend",
    "node:22",
    "sh",
    "-c",
    FRONTEND_START,
  ]);

  const backendHostPort = await docker.getDockerHostPort(containerName, BACKEND_PORT);
  const frontendHostPort = await docker.getDockerHostPort(containerName, FRONTEND_PORT);

  const backendBaseUrl = `http://127.0.0.1:${backendHostPort}`;
  const frontendPreviewUrl = `http://127.0.0.1:${frontendHostPort}`;

  await waitForService({
    url: `${backendBaseUrl}/health`,
    label: "Python backend",
    name: containerName,
    docker,
    attempts: 120,
  });

  await waitForService({
    url: frontendPreviewUrl,
    label: "React frontend",
    name: frontendName,
    docker,
    // npm install alone took 5 minutes on a slow connection
    attempts: 300,
  });

  console.log("✅ Python full-stack application is running!");

  return {
    success: true,
    projectId,
    containerName,
    projectType: "python-fullstack",
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
};
