import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Doctor from "../models/doctor.model";

export const createDoctor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, specialization, schedule } = req.body;

    if (!name || !specialization || !schedule)
      return next(new AppError("All fields must be filled.", 400));

    await Doctor.create({
      name,
      specialization,
      schedule: new Date(schedule),
    });

    res.status(201).json({
      status: "Success",
      message: "Doctor successfully created",
    });
  },
);

export const getDoctors = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const doctors = await Doctor.find();

    res.status(200).json({ status: "Success", data: doctors });
  },
);

export const getDoctor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const doctor = await Doctor.findById(id);

    if (!doctor) return next(new AppError("Doctor not found", 404));

    res.status(200).json({ status: "Success", data: doctor });
  },
);

export const updateDoctor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const doctor = await Doctor.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doctor) return next(new AppError("Doctor not found", 404));

    res.status(200).json({
      status: "Success",
      message: "Doctor updated successfully",
      data: doctor,
    });
  },
);

export const deleteDoctor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const doctor = await Doctor.findByIdAndDelete(id);

    if (!doctor) return next(new AppError("Doctor not found", 404));

    res.status(200).json({
      status: "Success",
      message: "Doctor deleted successfully",
    });
  },
);
