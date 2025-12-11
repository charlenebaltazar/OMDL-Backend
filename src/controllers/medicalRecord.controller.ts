import { Request, Response, NextFunction } from "express";
import { uploadToSupabase, deleteFromSupabase } from "../utils/drive";
import MedicalRecord from "../models/medicalRecord.model";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import multer from "multer";
import path from "path";
import { supabase } from "../configs/supabaseClient";
import Appointment from "../models/appointment.model";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadMedicalRecord = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { appointmentId } = req.body;
    if (!appointmentId) return next(new AppError("Missing appointmentId", 400));
    if (!req.file) return next(new AppError("No file uploaded", 400));

    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${file.originalname}`;

    // upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("medical-records") // your bucket name
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error)
      return next(new AppError(`Upload failed: ${error.message}`, 500));

    const fileUrl = supabase.storage
      .from("medical-records")
      .getPublicUrl(fileName).data.publicUrl;

    const medicalRecord = await MedicalRecord.create({
      appointmentId,
      filename: fileName,
      originalName: file.originalname,
      driveId: data.path,
      fileUrl,
    });

    await Appointment.findByIdAndUpdate(appointmentId, {
      medicalRecord: medicalRecord._id,
    });

    res.status(200).json({
      status: "success",
      data: { medicalRecord },
    });
  },
);

export const getMedicalRecords = catchAsync(async (req, res) => {
  const { appointmentId } = req.query;
  const filter: any = {};

  if (appointmentId) filter.appointmentId = appointmentId;

  const records = await MedicalRecord.find(filter);

  res.status(200).json({
    status: "success",
    results: records.length,
    data: { records },
  });
});

export const getMedicalRecord = catchAsync(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return next(new AppError("Medical record not found", 404));

  res.status(200).json({
    status: "success",
    data: { record },
  });
});

export const updateMedicalRecord = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return next(new AppError("Medical record not found", 404));

    if (req.file) {
      await deleteFromSupabase(record.driveId);

      const { path, url } = await uploadToSupabase(req.file);

      record.filename = req.file.filename;
      record.originalName = req.file.originalname;
      record.driveId = path;
      record.fileUrl = url;
    }

    if (req.body.appointmentId) record.appointmentId = req.body.appointmentId;

    await record.save();

    res.status(200).json({
      status: "success",
      data: { record },
    });
  },
);

export const deleteMedicalRecord = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { appointmentId, recordId } = req.params;

    if (!appointmentId || !recordId)
      return next(new AppError("Missing appointmentId or recordId", 400));

    const appointment = await Appointment.findById(appointmentId).populate<{
      medicalRecord?: {
        _id: string;
        driveId: string;
        filename: string;
      };
    }>("medicalRecord");

    if (!appointment) return next(new AppError("Appointment not found", 404));

    const record = appointment.medicalRecord;
    if (!record) return next(new AppError("Medical record not found", 404));

    await deleteFromSupabase(record.driveId);

    appointment.medicalRecord = undefined;
    await appointment.save();

    await MedicalRecord.findByIdAndDelete(record._id);

    res.status(204).json({ status: "success", data: null });
  },
);
