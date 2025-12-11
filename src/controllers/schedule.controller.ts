import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Schedule from "../models/schedule.model";

export const createSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { doctorId, start, end } = req.body;

    if (!doctorId || !start || !end) {
      return next(new AppError("All fields must be filled.", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return next(new AppError("Invalid doctor ID.", 400));
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
      return next(new AppError("End time must be after start time.", 400));
    }

    const overlap = await Schedule.findOne({
      doctorId,
      $or: [
        {
          start: { $lt: endDate },
          end: { $gt: startDate },
        },
      ],
    });

    if (overlap) {
      return next(
        new AppError("Schedule overlaps with an existing schedule.", 400),
      );
    }

    const schedule = await Schedule.create({
      doctorId,
      start: startDate,
      end: endDate,
    });

    res.status(201).json({
      status: "Success",
      message: "Schedule successfully created",
      data: schedule,
    });
  },
);

export const getSchedules = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { doctorId, startDate, endDate } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (doctorId) {
      if (!mongoose.Types.ObjectId.isValid(doctorId as string)) {
        return next(new AppError("Invalid doctor ID.", 400));
      }
      filter.doctorId = doctorId;
    }

    if (startDate || endDate) {
      filter.start = {};
      if (startDate) filter.start.$gte = new Date(startDate as string);
      if (endDate) filter.start.$lte = new Date(endDate as string);
    }

    const total = await Schedule.countDocuments(filter);

    const schedules = await Schedule.find(filter)
      .populate("doctorId", "name specialization")
      .skip(skip)
      .limit(limit)
      .sort({ start: -1 });

    res.status(200).json({
      status: "Success",
      total,
      results: schedules.length,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: schedules,
    });
  },
);

export const getSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid schedule ID.", 400));
    }

    const schedule = await Schedule.findById(id).populate(
      "doctorId",
      "name specialization",
    );

    if (!schedule) return next(new AppError("Schedule not found.", 404));

    res.status(200).json({ status: "Success", data: schedule });
  },
);

export const updateSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { doctorId, start, end } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid schedule ID.", 400));
    }

    const existing = await Schedule.findById(id);
    if (!existing) return next(new AppError("Schedule not found.", 404));

    const newDoctorId = doctorId || existing.doctorId;
    const newStart = start ? new Date(start) : existing.start;
    const newEnd = end ? new Date(end) : existing.end;

    if (newEnd <= newStart) {
      return next(new AppError("End time must be after start time.", 400));
    }

    const conflict = await Schedule.findOne({
      doctorId: newDoctorId,
      _id: { $ne: id },
      start: { $lt: newEnd },
      end: { $gt: newStart },
    });

    if (conflict) {
      return next(
        new AppError("Updated schedule overlaps with another schedule.", 400),
      );
    }

    const updated = await Schedule.findByIdAndUpdate(
      id,
      {
        doctorId: newDoctorId,
        start: newStart,
        end: newEnd,
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      status: "Success",
      message: "Schedule updated successfully",
      data: updated,
    });
  },
);

export const deleteSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid schedule ID.", 400));
    }

    const schedule = await Schedule.findByIdAndDelete(id);

    if (!schedule) return next(new AppError("Schedule not found.", 404));

    res.status(200).json({
      status: "Success",
      message: "Schedule deleted successfully",
    });
  },
);

export const getTodaySchedules = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + utc8Offset);

    const startOfDay = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const { doctorId } = req.query;

    const filter: any = {
      start: { $gte: startOfDay, $lte: endOfDay },
    };

    if (doctorId) {
      if (!mongoose.Types.ObjectId.isValid(doctorId as string)) {
        return next(new AppError("Invalid doctor ID.", 400));
      }
      filter.doctorId = doctorId;
    }

    const schedules = await Schedule.find(filter)
      .populate("doctorId", "name specialization")
      .sort({ start: -1 });

    res.status(200).json({
      status: "Success",
      results: schedules.length,
      data: schedules,
    });
  },
);
