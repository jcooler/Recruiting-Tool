import express from "express";
import * as candidatesController from "../controllers/candidates";


const router = express.Router();

router.get("/", candidatesController.getCandidates);
router.get("/:candidateId", candidatesController.getCandidate);
router.post("/", candidatesController.createCandidate);
router.patch("/:candidateId", candidatesController.updateCandidate);
router.delete("/:candidateId", candidatesController.deleteCandidate);

export default router;