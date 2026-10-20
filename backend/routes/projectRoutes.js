import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  getProjectFiles,
  downloadProject,
  runProject,
  deleteProject,
  modifyProject,
} from "../controllers/projectController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { withProjectLock } from "../utils/projectLock.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createProject);
router.get("/", getProjects);
router.delete("/:id", withProjectLock("delete", deleteProject));
router.get("/:id/files", getProjectFiles);
router.get("/:id/download", downloadProject);
router.post("/:id/run", withProjectLock("run", runProject));
router.post("/:id/modify", withProjectLock("modification", modifyProject));
router.get("/:id", getProjectById);

export default router;