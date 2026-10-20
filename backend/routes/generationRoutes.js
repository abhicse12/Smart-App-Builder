import express from "express";
import { generateProject } from "../controllers/generationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", generateProject);

export default router;