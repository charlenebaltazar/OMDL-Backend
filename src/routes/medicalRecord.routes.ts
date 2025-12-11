import express from "express";
import { upload } from "../middlewares/multer";
import {
  deleteMedicalRecord,
  uploadMedicalRecord,
} from "../controllers/medicalRecord.controller";

const router = express.Router();

router.post("/upload", upload.single("file"), uploadMedicalRecord);
router.delete("/:recordId/appointments/:appointmentId", deleteMedicalRecord);

export default router;
