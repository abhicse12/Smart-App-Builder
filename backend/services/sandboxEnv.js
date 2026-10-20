import fs from "fs";
import path from "path";

// Database hostnames that can never be reached from inside a generated
// project's sandbox container (there is no MongoDB service / Docker
// Compose network there). A MONGO_URI pointing at one of these only
// breaks the app's JSON demo mode.
const UNREACHABLE_DB_HOSTS = new Set([
  "mongodb",
  "mongo",
  "db",
  "database",
  "localhost",
  "127.0.0.1",
]);

// MONGO_URI=mongodb://[user:pass@]host[:port]/...   (optionally quoted / exported)
const MONGO_URI_LINE =
  /^\s*(?:export\s+)?MONGO_URI\s*=\s*["']?mongodb(?:\+srv)?:\/\/(?:[^@/\s"']*@)?([^:/?\s"',]+)/i;

const getUnreachableMongoHost = (line) => {
  const match = line.match(MONGO_URI_LINE);

  if (!match) {
    return null;
  }

  const host = match[1].toLowerCase();

  return UNREACHABLE_DB_HOSTS.has(host) ? host : null;
};

export const isEnvFile = (filePath = "") =>
  path.posix.basename(String(filePath).replace(/\\/g, "/")) === ".env";

// Remove MONGO_URI lines that point at sandbox-unreachable hosts.
// Every other line (including real external MONGO_URI values) is kept.
export const stripUnreachableMongoUri = (content = "") => {
  const removedHosts = [];

  const kept = content.split(/\r?\n/).filter((line) => {
    const host = getUnreachableMongoHost(line);

    if (host) {
      removedHosts.push(host);
      return false;
    }

    return true;
  });

  return {
    content: kept.join("\n"),
    removedHosts,
  };
};

// Returns the unreachable host if the env file sets MONGO_URI to one.
export const findUnreachableMongoUri = (envFilePath) => {
  if (!fs.existsSync(envFilePath)) {
    return null;
  }

  for (const line of fs.readFileSync(envFilePath, "utf8").split(/\r?\n/)) {
    const host = getUnreachableMongoHost(line);

    if (host) {
      return host;
    }
  }

  return null;
};
