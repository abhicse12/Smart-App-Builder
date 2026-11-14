// Limits for running previews on a shared server. All settings come from
// backend/.env and are off by default, so local development is unchanged.
//
//   PREVIEW_BASE_DOMAIN    previews become https://p<port>.<domain>
//                          (a reverse proxy such as Caddy forwards them to
//                          127.0.0.1:<port>); unset keeps http://127.0.0.1:<port>
//   MAX_RUNNING_PREVIEWS   starting one more stops the oldest (0 = no limit)
//   PREVIEW_TTL_MINUTES    previews are stopped after this long (0 = never)
//
// The Docker containers themselves are the record of what is running, so
// a backend restart loses nothing.

import { execFile } from "child_process";
import { isProjectBusy } from "../utils/projectLock.js";

// Main container of a real project (MongoDB ObjectId); the -frontend,
// -tests and step containers are removed together with it by stopProject
const PREVIEW_CONTAINER = /^ai-builder-([0-9a-f]{24})$/;

const CLEANUP_INTERVAL_MS = 60 * 1000;

const readNumber = (name) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const docker = (args) =>
  new Promise((resolve, reject) => {
    execFile("docker", args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });

// [{ projectId, startedAt }] oldest first
const listRunningPreviews = async () => {
  const ids = await docker(["ps", "-q", "--filter", "name=^ai-builder-"]);

  if (!ids) {
    return [];
  }

  const lines = await docker([
    "inspect",
    "--format",
    "{{.Name}}|{{.State.StartedAt}}",
    ...ids.split(/\s+/),
  ]);

  return lines
    .split("\n")
    .map((line) => {
      const [name, startedAt] = line.trim().replace(/^\//, "").split("|");
      const match = PREVIEW_CONTAINER.exec(name);

      return match
        ? { projectId: match[1], startedAt: new Date(startedAt).getTime() }
        : null;
    })
    .filter((preview) => preview && Number.isFinite(preview.startedAt))
    .sort((a, b) => a.startedAt - b.startedAt);
};

// Public address of a preview that runs on 127.0.0.1:<port>
export const publicPreviewUrl = (url) => {
  const domain = process.env.PREVIEW_BASE_DOMAIN?.trim().replace(/^\.+|\/+$/g, "");
  const match = /^http:\/\/127\.0\.0\.1:(\d+)(\/.*)?$/.exec(url || "");

  if (!domain || !match) {
    return url;
  }

  return `https://p${match[1]}.${domain}${match[2] || ""}`;
};

// Runner result as sent to the browser. Health checks and smoke tests keep
// using the original 127.0.0.1 address.
export const toPublicRunnerResult = (runnerResult) => {
  if (!runnerResult?.frontend?.previewUrl) {
    return runnerResult;
  }

  return {
    ...runnerResult,
    frontend: {
      ...runnerResult.frontend,
      previewUrl: publicPreviewUrl(runnerResult.frontend.previewUrl),
    },
  };
};

// Called before a project starts: stops the oldest previews of other
// projects until there is room for one more. Projects with a request in
// progress are never stopped.
export const makeRoomForPreview = async (projectId, stopProject) => {
  const limit = readNumber("MAX_RUNNING_PREVIEWS");

  if (!limit) {
    return;
  }

  const others = (await listRunningPreviews().catch(() => [])).filter(
    (preview) => preview.projectId !== String(projectId)
  );

  const stoppable = others.filter(
    (preview) => !isProjectBusy(preview.projectId)
  );

  for (const preview of stoppable.slice(0, Math.max(0, others.length - limit + 1))) {
    console.log(
      `Preview limit (${limit}) reached: stopping project ${preview.projectId}`
    );
    await stopProject(preview.projectId).catch(() => {});
  }
};

// Stops previews older than PREVIEW_TTL_MINUTES, checked once a minute
export const startPreviewCleanup = (stopProject) => {
  const ttlMinutes = readNumber("PREVIEW_TTL_MINUTES");

  if (!ttlMinutes) {
    return;
  }

  console.log(`Previews stop automatically after ${ttlMinutes} minutes`);

  const cleanup = async () => {
    const cutoff = Date.now() - ttlMinutes * 60 * 1000;
    const previews = await listRunningPreviews().catch(() => []);

    for (const preview of previews) {
      if (preview.startedAt < cutoff && !isProjectBusy(preview.projectId)) {
        console.log(
          `Preview of project ${preview.projectId} ran ${ttlMinutes} minutes: stopping it`
        );
        await stopProject(preview.projectId).catch(() => {});
      }
    }
  };

  setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();
};
