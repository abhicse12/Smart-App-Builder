// One generate / run / modify / delete at a time per project.
// These operations share the project's Docker container and folder,
// so overlapping requests (double clicks, two tabs) would race.
// In-memory: valid for a single backend process.
const busyProjects = new Map(); // projectId -> operation name

export const withProjectLock = (operation, handler) =>
  async (req, res) => {
    const projectId =
      req.params?.id || req.body?.projectId;

    // Let the handler report a missing / invalid project id
    if (!projectId) {
      return handler(req, res);
    }

    const key = String(projectId);
    const current = busyProjects.get(key);

    if (current) {
      return res.status(409).json({
        success: false,
        message: `Project is busy: a ${current} is already in progress. Please wait for it to finish.`,
      });
    }

    busyProjects.set(key, operation);

    try {
      return await handler(req, res);
    } finally {
      busyProjects.delete(key);
    }
  };
