// Tests real authentication on the running app, the way the browser does it:
// through the Vite dev server, whose /api proxy forwards to FastAPI.

import fs from "fs/promises";
import path from "path";
import { extractFastApiEndpoints } from "./validators.js";

const REQUEST_TIMEOUT_MS = 20000;

const request = async (url, { method = "GET", body, token } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON: the assertions below report it
  }

  return { status: response.status, json, text: text.slice(0, 400) };
};

const usersFilePath = (projectId) =>
  path.join(
    process.cwd(),
    "generated-projects",
    String(projectId),
    "backend",
    "data",
    "users.json"
  );

// The test account must not end up in the user's project or download
const removeTestUser = async (filePath, email) => {
  const users = JSON.parse(await fs.readFile(filePath, "utf8"));

  await fs.writeFile(
    filePath,
    JSON.stringify(users.filter((user) => user.email !== email), null, 2),
    "utf8"
  );
};

const runPythonAuthSmokeTest = async ({ files = [], previewUrl, projectId }) => {
  if (!previewUrl) {
    return { skipped: true, reason: "No frontend preview URL" };
  }

  const base = `${previewUrl.replace(/\/+$/, "")}/api`;
  const stamp = Date.now();
  const email = `smoketest${stamp}@example.com`;
  const password = "SmokeTest123!";
  const steps = [];

  const expectStatus = (label, result, expected) => {
    if (result.status !== expected) {
      throw new Error(
        `${label}: expected HTTP ${expected}, got ${result.status}: ${result.text}`
      );
    }

    steps.push(`${label} ${result.status}`);
  };

  let signedUp = false;

  try {
    const signup = await request(`${base}/auth/signup`, {
      method: "POST",
      body: { name: "Smoke Test", email, password },
    });

    expectStatus("signup", signup, 201);
    signedUp = true;

    const duplicate = await request(`${base}/auth/signup`, {
      method: "POST",
      body: { name: "Smoke Test", email, password },
    });

    expectStatus("duplicate signup", duplicate, 400);

    const wrongPassword = await request(`${base}/auth/login`, {
      method: "POST",
      body: { email, password: "WrongPassword123!" },
    });

    expectStatus("wrong password", wrongPassword, 401);

    const login = await request(`${base}/auth/login`, {
      method: "POST",
      body: { email, password },
    });

    expectStatus("login", login, 200);

    const token = login.json?.token;

    if (!token) {
      throw new Error(`login returned no token: ${login.text}`);
    }

    expectStatus("me without token", await request(`${base}/auth/me`), 401);

    const me = await request(`${base}/auth/me`, { token });

    expectStatus("me with token", me, 200);

    if (me.json?.user?.email !== email || "password" in (me.json?.user || {})) {
      throw new Error(`/auth/me returned the wrong user data: ${me.text}`);
    }

    // The password must be stored only as a hash
    if (projectId) {
      const stored = await fs.readFile(usersFilePath(projectId), "utf8");
      const account = JSON.parse(stored).find((user) => user.email === email);

      if (!account) {
        throw new Error("The new account was not saved to backend/data/users.json");
      }

      if (stored.includes(password)) {
        throw new Error("backend/data/users.json contains a plain-text password");
      }

      steps.push("password stored hashed");
    }

    // Logged-in GET routes of the features must not crash
    for (const endpoint of extractFastApiEndpoints(files)) {
      if (
        endpoint.method !== "GET" ||
        endpoint.path.includes("{") ||
        endpoint.path.startsWith("/api/auth")
      ) {
        continue;
      }

      const result = await request(
        `${previewUrl.replace(/\/+$/, "")}${endpoint.path}`,
        { token }
      );

      if (result.status >= 300 && result.status < 400) {
        throw new Error(
          `GET ${endpoint.path} redirected instead of answering: HTTP ${result.status}`
        );
      }

      if (result.status >= 500) {
        throw new Error(
          `GET ${endpoint.path} crashed with HTTP ${result.status}: ${result.text}`
        );
      }

      steps.push(`GET ${endpoint.path} ${result.status}`);
    }

    return { success: true, steps };
  } catch (error) {
    return {
      success: false,
      error: `${error.message}. Steps passed: ${steps.join("; ") || "none"}.`,
      steps,
    };
  } finally {
    if (signedUp && projectId) {
      await removeTestUser(usersFilePath(projectId), email).catch((error) =>
        console.warn("Could not remove the test account:", error.message)
      );
    }
  }
};

export default runPythonAuthSmokeTest;
