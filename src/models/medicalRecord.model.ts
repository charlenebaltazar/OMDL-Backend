import mongoose, { Schema } from "mongoose";
import { IMedicalRecord } from "../@types/interfaces";

const MedicalRecordSchema = new mongoose.Schema<IMedicalRecord>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  driveId: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const MedicalRecord = mongoose.model<IMedicalRecord>(
  "medicalrecord",
  MedicalRecordSchema,
);

export default MedicalRecord;
