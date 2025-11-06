import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Service from "../models/service.model";

export const createService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, price, status } = req.body;

    if (!name || !price || !status)
      return next(new AppError("All fields must be filled.", 400));

    await Service.create({ name, price, status });

    res.status(201).json({
      status: "success",
      message: "Service successfully created",
    });
  },
);

export const getServices = catchAsync(async (_req: Request, res: Response) => {
  const services = await Service.find();
  res.status(200).json({ status: "success", data: services });
});

export const getService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) return next(new AppError("ID not found", 404));

    const service = await Service.findById(id);
    if (!service) return next(new AppError("Service not found", 404));

    res.status(200).json({ status: "success", data: service });
  },
);

export const updateService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) return next(new AppError("ID not found", 404));

    const service = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!service) return next(new AppError("Service not found", 404));

    res.status(200).json({
      status: "success",
      message: "Service updated successfully",
      data: service,
    });
  },
);

export const deleteService = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) return next(new AppError("ID not found", 404));

    const service = await Service.findByIdAndDelete(id);
    if (!service) return next(new AppError("Service not found", 404));

    res.status(200).json({
      status: "success",
      message: "Service deleted successfully",
    });
  },
);
