import express from "express";
import * as candidatesController from "../controllers/candidates";

const router = express.Router();

router.get("/", candidatesController.getCandidates);
router.post("/", candidatesController.createCandidate);
export default router;