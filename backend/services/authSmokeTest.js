import {
  extractBackendEndpoints,
  extractFrontendCalls,
} from "./validators/apiContractValidator.js";

// After the generated app starts in Docker, exercise the real login flow
// the way the browser does: through the frontend dev server, whose /api
// proxy forwards to the backend. Catches apps that start fine but whose
// signup/login/session do not actually work.

const REQUEST_TIMEOUT_MS = 20000;

const request = async (
  url,
  { method = "GET", body, token, cookie } = {}
) => {
  const headers = {
    Accept: "application/json",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();

  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    // not JSON (e.g. the Vite index.html when the path is not proxied)
  }

  return {
    status: response.status,
    json,
    text: text.slice(0, 400),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
  };
};

const describe = (endpoint, label, result) =>
  `${label} request ${endpoint.method} ${endpoint.path} returned HTTP ${result.status}` +
  (result.json
    ? `: ${JSON.stringify(result.json).slice(0, 300)}`
    : result.text.trimStart().startsWith("<") || result.text.trim() === ""
      ? ` with ${result.text.trim() === "" ? "an empty body" : "an HTML page"} instead of JSON: the request never reached a backend route (the path does not exist on the backend, or does not start with /api, which is the only path the Vite dev server proxies)`
      : `: ${result.text}`);

const findEndpoint = (endpoints, method, patterns) => {
  for (const pattern of patterns) {
    const endpoint = endpoints.find(
      (item) => item.method === method && pattern.test(item.path)
    );

    if (endpoint) {
      return endpoint;
    }
  }

  return null;
};

// The request the frontend itself makes (path after the api client's
// baseURL, and the fields its form sends), when it can be resolved
const findFrontendCall = (calls, patterns) => {
  for (const pattern of patterns) {
    const call = calls.find(
      (item) =>
        item.method === "POST" &&
        item.fullPath &&
        pattern.test(item.fullPath)
    );

    if (call) {
      return call;
    }
  }

  return null;
};

// Body with only the fields the frontend sends (all fields if unknown)
const buildBody = (keys, credentials) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    return credentials;
  }

  return Object.fromEntries(
    keys.map((key) => {
      if (/password/i.test(key)) return [key, credentials.password];
      if (/email/i.test(key)) return [key, credentials.email];
      if (/user(name)?$/i.test(key)) return [key, credentials.username];
      return [key, credentials.name];
    })
  );
};

const runAuthSmokeTest = async ({ files = [], previewUrl }) => {
  const { endpoints } = extractBackendEndpoints(files);
  const calls = extractFrontendCalls(files);

  const SIGNUP_PATTERNS = [/\/auth\/(signup|register)$/i, /\/(signup|register)$/i];
  const LOGIN_PATTERNS = [/\/auth\/(login|signin)$/i, /\/(login|signin)$/i];

  const frontendSignup = findFrontendCall(calls, SIGNUP_PATTERNS);
  const frontendLogin = findFrontendCall(calls, LOGIN_PATTERNS);

  // Prefer what the frontend really calls; fall back to the backend route
  const toEndpoint = (call) =>
    call ? { method: call.method, path: call.fullPath, keys: call.bodyKeys } : null;

  const signup =
    toEndpoint(frontendSignup) ||
    findEndpoint(endpoints, "POST", SIGNUP_PATTERNS);

  const login =
    toEndpoint(frontendLogin) ||
    findEndpoint(endpoints, "POST", LOGIN_PATTERNS);

  const me = findEndpoint(endpoints, "GET", [
    /\/auth\/(me|profile|user|current-user)$/i,
  ]);

  if (!login || !previewUrl) {
    return {
      skipped: true,
      reason: !login
        ? "The project has no login endpoint"
        : "No frontend preview URL",
    };
  }

  const base = previewUrl.replace(/\/+$/, "");
  const stamp = Date.now();

  const credentials = {
    name: "Smoke Test",
    username: `smoketest${stamp}`,
    email: `smoketest${stamp}@example.com`,
    password: "SmokeTest123!",
  };

  const steps = [];

  const fail = (message) => ({
    success: false,
    error: `${message}. Requests were sent through the frontend dev server (as the browser does) with ${JSON.stringify(
      credentials
    )}. Steps: ${steps.join("; ") || "none"}.`,
    steps,
  });

  try {
    // 1. Signup
    if (signup) {
      const result = await request(base + signup.path, {
        method: "POST",
        body: buildBody(signup.keys, credentials),
      });

      if (result.status < 200 || result.status >= 300 || !result.json) {
        return fail(describe(signup, "Signup", result));
      }

      steps.push(`signup ${result.status}`);
    }

    // 2. Login with the account just created
    const loginResult = await request(base + login.path, {
      method: "POST",
      body: buildBody(login.keys, {
        email: credentials.email,
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (
      loginResult.status < 200 ||
      loginResult.status >= 300 ||
      !loginResult.json
    ) {
      return fail(
        describe(login, "Login", loginResult) +
          (signup ? " right after a successful signup" : "")
      );
    }

    const token =
      loginResult.json?.token ||
      loginResult.json?.accessToken ||
      loginResult.json?.data?.token ||
      null;

    if (!token && !loginResult.cookie) {
      return fail(
        `Login ${login.method} ${login.path} succeeded but returned neither a "token" in the JSON body nor a session cookie: ${loginResult.text}`
      );
    }

    steps.push(`login ${loginResult.status}`);

    // 3. Session works on a protected endpoint
    if (me) {
      const meResult = await request(base + me.path, {
        token,
        cookie: loginResult.cookie,
      });

      if (meResult.status !== 200) {
        return fail(
          describe(me, "Current-user", meResult) +
            ` using the token/cookie returned by login`
        );
      }

      steps.push(`me ${meResult.status}`);
    }

    return {
      success: true,
      steps,
    };
  } catch (error) {
    return fail(`Auth request failed: ${error.message}`);
  }
};

export default runAuthSmokeTest;
