// Which user the project containers run as.
//
// On Linux, a bind-mounted project folder keeps real file ownership. The
// containers drop every capability, so root inside them cannot write files
// owned by the backend's user (EACCES on package-lock.json, backend/data),
// and files it did create could not be changed or deleted by the backend
// afterwards. There, containers run as the backend's own uid:gid with
// HOME and the npm cache in /tmp. Docker Desktop (Windows/macOS) maps file
// ownership itself, so containers keep the image's user.
//
// CONTAINER_USER in backend/.env overrides this: "uid:gid", or "image" to
// keep the image's user.

import fs from "fs";
import path from "path";

const runAsUser = () => {
  const setting = process.env.CONTAINER_USER?.trim();

  if (setting === "image") {
    return null;
  }

  if (/^\d+:\d+$/.test(setting || "")) {
    return setting;
  }

  if (process.platform === "linux" && typeof process.getuid === "function") {
    return `${process.getuid()}:${process.getgid()}`;
  }

  return null;
};

// Docker creates a new volume's directory as root (the mount paths such as
// node_modules do not exist in the images), and a container running as
// another user could not write it. A one-shot container gives the volume
// to that user; it only changes entries that belong to someone else, so
// a large shared cache costs nothing once it is owned.
const giveVolumesToUser = async (runCommand, containerId, user) => {
  const { stdout } = await runCommand("docker", [
    "inspect",
    "--format",
    '{{.Config.Image}}{{range .Mounts}}{{if eq .Type "volume"}} {{.Name}}{{end}}{{end}}',
    containerId,
  ]);

  const [image, ...volumes] = stdout.trim().split(/\s+/);
  const [uid, gid] = user.split(":");

  for (const volume of volumes) {
    await runCommand("docker", [
      "run",
      "--rm",
      "--network",
      "none",
      "--user",
      "0:0",
      "--cap-drop=ALL",
      "--cap-add=CHOWN",
      "--cap-add=DAC_READ_SEARCH",
      "--security-opt",
      "no-new-privileges",
      "--entrypoint",
      "",
      "-v",
      `${volume}:/volume`,
      image,
      "find",
      "/volume",
      "(",
      "!",
      "-user",
      uid,
      "-o",
      "!",
      "-group",
      gid,
      ")",
      "-exec",
      "chown",
      "-h",
      user,
      "{}",
      "+",
    ]);
  }
};

// Docker creates the mount point of a volume that sits inside a bind mount
// (e.g. frontend/node_modules) as root on the host. Creating it first keeps
// every entry of the project folder owned by the backend's user.
const createVolumeMountPoints = (args) => {
  const binds = [];
  const volumePaths = [];

  args.forEach((arg, index) => {
    if (args[index - 1] !== "-v") {
      return;
    }

    const parts = arg.split(":");

    if (parts.length === 1) {
      volumePaths.push(arg);
    } else if (path.isAbsolute(parts[0]) || /^[A-Za-z]$/.test(parts[0])) {
      // Host path (a Windows drive letter adds one more ":")
      const offset = /^[A-Za-z]$/.test(parts[0]) ? 1 : 0;
      binds.push({
        hostPath: parts.slice(0, offset + 1).join(":"),
        containerPath: parts[offset + 1],
      });
    }
  });

  for (const volumePath of volumePaths) {
    const bind = binds.find(({ containerPath }) =>
      volumePath.startsWith(`${containerPath}/`)
    );

    if (bind) {
      fs.mkdirSync(
        path.join(bind.hostPath, volumePath.slice(bind.containerPath.length)),
        { recursive: true }
      );
    }
  }
};

// Drop-in for runCommand("docker", ["run", "-d", ...args])
export const runDetachedContainer = async (runCommand, args) => {
  const user = runAsUser();

  if (!user) {
    return runCommand("docker", args);
  }

  if (args[0] !== "run" || args[1] !== "-d") {
    throw new Error('runDetachedContainer expects ["run", "-d", ...]');
  }

  createVolumeMountPoints(args);

  const { stdout } = await runCommand("docker", [
    "create",
    "--user",
    user,
    "-e",
    "HOME=/tmp",
    "-e",
    "npm_config_cache=/tmp/.npm",
    ...args.slice(2),
  ]);

  const containerId = stdout.trim().split(/\s+/).pop();

  try {
    await giveVolumesToUser(runCommand, containerId, user);
    await runCommand("docker", ["start", containerId]);
  } catch (error) {
    await runCommand("docker", ["rm", "-f", "-v", containerId]).catch(() => {});
    throw error;
  }

  return { stdout: containerId, stderr: "" };
};
