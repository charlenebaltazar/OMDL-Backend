import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Service from "../models/service.model";
import Appointment from "../models/appointment.model";

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

export const getServices = catchAsync(async (req: Request, res: Response) => {
  const { status, search } = req.query;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (status) filter.status = status;

  if (search) {
    const regex = new RegExp(search as string, "i");
    filter.$or = [{ name: { $regex: regex } }];
  }

  const total = await Service.countDocuments(filter);

  const services = await Service.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    total,
    results: services.length,
    currentPage: page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: services,
  });
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

const utc8Offset = 8 * 60 * 60 * 1000;

const getAppointmentRevenue = async (appt: any) => {
  const services = await Service.find({
    name: { $in: appt.medicalDepartment },
  });
  return services.reduce((sum, s) => sum + s.price, 0);
};

export const getWeeklyServicesAvailed = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const localNow = new Date(now.getTime() + utc8Offset);

    const day = localNow.getUTCDay();
    const sunday = new Date(localNow);
    sunday.setUTCDate(localNow.getUTCDate() - day);
    sunday.setUTCHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setUTCDate(sunday.getUTCDate() + 6);
    saturday.setUTCHours(23, 59, 59, 999);

    const prevSunday = new Date(sunday);
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 7);
    const prevSaturday = new Date(saturday);
    prevSaturday.setUTCDate(prevSaturday.getUTCDate() - 7);

    const appointments = await Appointment.find({
      schedule: { $gte: sunday, $lte: saturday },
      status: "Completed",
    });

    const prevAppointments = await Appointment.find({
      schedule: { $gte: prevSunday, $lte: prevSaturday },
      status: "Completed",
    });

    const allServices = Array.from(
      new Set(
        appointments
          .flatMap((a) => a.medicalDepartment)
          .concat(prevAppointments.flatMap((a) => a.medicalDepartment)),
      ),
    );

    const counts: number[] = [];
    const currentRevenue: number[] = [];
    const prevRevenue: number[] = [];

    for (const service of allServices) {
      const currentAppts = appointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );
      const previousAppts = prevAppointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );

      counts.push(currentAppts.length);
      currentRevenue.push(
        (await Promise.all(currentAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
      prevRevenue.push(
        (await Promise.all(previousAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
    }

    res.status(200).json({
      status: "Success",
      labels: allServices,
      counts,
      totalCurrent: currentRevenue.reduce((a, b) => a + b, 0),
      totalPrevious: prevRevenue.reduce((a, b) => a + b, 0),
    });
  },
);

export const getMonthlyServicesAvailed = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const localNow = new Date(now.getTime() + utc8Offset);

    const year = localNow.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const startPrevYear = new Date(Date.UTC(year - 1, 0, 1));
    const endPrevYear = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));

    const appointments = await Appointment.find({
      schedule: { $gte: startOfYear, $lte: endOfYear },
      status: "Completed",
    });

    const prevAppointments = await Appointment.find({
      schedule: { $gte: startPrevYear, $lte: endPrevYear },
      status: "Completed",
    });

    const allServices = Array.from(
      new Set(
        appointments
          .flatMap((a) => a.medicalDepartment)
          .concat(prevAppointments.flatMap((a) => a.medicalDepartment)),
      ),
    );

    const counts: number[] = [];
    const currentRevenue: number[] = [];
    const prevRevenue: number[] = [];

    for (const service of allServices) {
      const currentAppts = appointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );
      const previousAppts = prevAppointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );

      counts.push(currentAppts.length);
      currentRevenue.push(
        (await Promise.all(currentAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
      prevRevenue.push(
        (await Promise.all(previousAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
    }

    res.status(200).json({
      status: "Success",
      labels: allServices,
      counts,
      totalCurrent: currentRevenue.reduce((a, b) => a + b, 0),
      totalPrevious: prevRevenue.reduce((a, b) => a + b, 0),
    });
  },
);

export const getYearlyServicesAvailed = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const localNow = new Date(now.getTime() + utc8Offset);

    const currentYear = localNow.getUTCFullYear();
    const startYear = currentYear - 4;

    const appointments = await Appointment.find({
      schedule: {
        $gte: new Date(Date.UTC(startYear, 0, 1)),
        $lte: new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)),
      },
      status: "Completed",
    });

    const prevAppointments = await Appointment.find({
      schedule: {
        $gte: new Date(Date.UTC(startYear - 5, 0, 1)),
        $lte: new Date(Date.UTC(currentYear - 5, 11, 31, 23, 59, 59, 999)),
      },
      status: "Completed",
    });

    const allServices = Array.from(
      new Set(
        appointments
          .flatMap((a) => a.medicalDepartment)
          .concat(prevAppointments.flatMap((a) => a.medicalDepartment)),
      ),
    );

    const counts: number[] = [];
    const currentRevenue: number[] = [];
    const prevRevenue: number[] = [];

    for (const service of allServices) {
      const currentAppts = appointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );
      const previousAppts = prevAppointments.filter((a) =>
        a.medicalDepartment.includes(service),
      );

      counts.push(currentAppts.length);
      currentRevenue.push(
        (await Promise.all(currentAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
      prevRevenue.push(
        (await Promise.all(previousAppts.map(getAppointmentRevenue))).reduce(
          (sum, r) => sum + r,
          0,
        ),
      );
    }

    res.status(200).json({
      status: "Success",
      labels: allServices,
      counts,
      totalCurrent: currentRevenue.reduce((a, b) => a + b, 0),
      totalPrevious: prevRevenue.reduce((a, b) => a + b, 0),
    });
  },
);

export const getTopAvailedServices = catchAsync(async (req, res) => {
  const top = await Appointment.aggregate([
    { $match: { status: "Completed" } },
    { $unwind: "$medicalDepartment" },
    {
      $group: {
        _id: "$medicalDepartment",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "services",
        localField: "_id",
        foreignField: "name",
        as: "serviceInfo",
      },
    },
    {
      $unwind: {
        path: "$serviceInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id",
        count: 1,
        price: "$serviceInfo.price",
        status: "$serviceInfo.status",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: top,
  });
});
