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

const router = express.Router();

router.use(authMiddleware);

router.post("/", createProject);
router.get("/", getProjects);
router.delete("/:id", deleteProject);
router.get("/:id/files", getProjectFiles);
router.get("/:id/download", downloadProject);
router.post("/:id/run", runProject);
router.post("/:id/modify", modifyProject);
router.get("/:id", getProjectById);

export default router;