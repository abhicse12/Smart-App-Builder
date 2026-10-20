import express from "express";
import { generateProject } from "../controllers/generationController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { withProjectLock } from "../utils/projectLock.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", withProjectLock("generation", generateProject));

export default router;