// Runs a Java full-stack project in two containers that share one network
// namespace, so the Vite proxy reaches the backend on localhost:5001:
//
//   ai-builder-<id>            maven (Java 21)   Spring Boot on 5001 (publishes both ports)
//   ai-builder-<id>-frontend   node:22           Vite on 5173
//
// The backend sees the source read-only and builds a copy in /tmp, so target/
// never appears in the project folder; only backend/data is writable.
//
// Downloaded Maven packages stay in one shared Docker volume, so only the
// first project waits for them. Generated code can write to that volume, which
// is acceptable on a local machine but not for public hosting.

const BACKEND_PORT = 5001;
const FRONTEND_PORT = 5173;
const BACKEND_IMAGE = "maven:3.9-eclipse-temurin-21";
const MAVEN_CACHE_VOLUME = "ai-builder-maven-cache";

const BACKEND_START =
  "mkdir -p /tmp/build " +
  "&& cp -r pom.xml src /tmp/build/ " +
  "&& mvn -q -B -ntp -f /tmp/build/pom.xml -DskipTests package " +
  "&& exec java -Xmx384m -jar /tmp/build/target/app.jar";

// "npm run build" compiles every module first, so a broken import fails
// here with a log the Fixer can use. The output goes to /tmp.
const FRONTEND_START =
  "npm install --no-audit --no-fund " +
  "&& npm run build -- --outDir /tmp/vite-build-check --emptyOutDir " +
  `&& npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT}`;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// runnerService removes this container before every run and on stop
const frontendContainerName = (containerName) =>
  `${containerName}-frontend`;

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

export const runJavaFullstack = async ({
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
    "1g",
    "--cpus",
    "1",
    "--pids-limit",
    "200",
    "--security-opt",
    "no-new-privileges",
    "--cap-drop=ALL",
    "--read-only",
    "--tmpfs",
    "/tmp:exec",
    "-e",
    "MAVEN_OPTS=-Xmx384m",
    "-v",
    `${MAVEN_CACHE_VOLUME}:/root/.m2`,
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
    BACKEND_IMAGE,
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

  // The first build downloads every Maven package
  await waitForService({
    url: `${backendBaseUrl}/health`,
    label: "Spring Boot backend",
    name: containerName,
    docker,
    attempts: 300,
  });

  await waitForService({
    url: frontendPreviewUrl,
    label: "React frontend",
    name: frontendName,
    docker,
    // npm install alone took 5 minutes on a slow connection
    attempts: 300,
  });

  console.log("✅ Java full-stack application is running!");

  return {
    success: true,
    projectId,
    containerName,
    projectType: "java-fullstack",
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
