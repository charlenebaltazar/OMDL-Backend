import { NextFunction, Response, Request } from "express";
import catchAsync from "../utils/catchAsync";
import User from "../models/user.model";
import AppError from "../utils/appError";

export const createAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstname,
      surname,
      gender,
      birthDate,
      address,
      email,
      phoneNumber,
      password,
    } = req.body;

    if (
      !firstname ||
      !surname ||
      !gender ||
      !birthDate ||
      !address ||
      !email ||
      !phoneNumber ||
      !password
    )
      return next(new AppError("Invalid empty fields", 400));

    await User.create({
      firstname,
      surname,
      gender,
      maritalStatus: "N/A",
      birthDate,
      address,
      email,
      phoneNumber,
      role: "admin",
      password,
    });

    res
      .status(201)
      .json({ status: "success", message: "Admin created successfully" });
  },
);

export const getAdmins = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { gender, search } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const filter: any = { role: "admin" };

    if (gender) filter.gender = gender;
    if (search) {
      const regex = new RegExp(search as string, "i");

      filter.$or = [
        { firstname: { $regex: regex } },
        { surname: { $regex: regex } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstname", " ", "$surname"] },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }

    const total = await User.countDocuments(filter);

    const patients = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      total,
      results: patients.length,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: patients,
    });
  },
);

export const getPatients = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { gender, maritalStatus, search } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const filter: any = { role: "user" };

    if (gender) filter.gender = gender;
    if (maritalStatus) filter.maritalStatus = maritalStatus;
    if (search) {
      const regex = new RegExp(search as string, "i");

      filter.$or = [
        { firstname: { $regex: regex } },
        { surname: { $regex: regex } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstname", " ", "$surname"] },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }

    const total = await User.countDocuments(filter);

    const patients = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      total,
      results: patients.length,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: patients,
    });
  },
);

export const getAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const account = await User.findById(id);

    if (!account) return next(new AppError("Account not found", 404));

    res.status(200).json({ status: "success", data: account });
  },
);

export const updateAdmin = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  if (!id) return next(new AppError("ID not found", 404));

  const admin = await User.findById(id);
  if (!admin) return next(new AppError("Admin not found", 404));

  Object.assign(admin, req.body);
  await admin.save();

  res.status(200).json({ status: "success", data: admin });
});

export const deleteAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const admin = await User.findByIdAndDelete(id);

    if (!admin) return next(new AppError("Admin not found", 404));

    res
      .status(200)
      .json({ status: "success", message: "Account deleted successfully" });
  },
);

export const myAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({ status: "Success", data: req.user });
  },
);

export const updateAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const allowedFields = [
      "firstname",
      "surname",
      "birthDate",
      "address",
      "email",
      "phoneNumber",
      "gender",
      "maritalStatus",
      "password",
    ];

    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError("User not found", 404));

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (user as any)[field] = req.body[field];
      }
    }

    await user.save();

    res.status(200).json({
      status: "Success",
      msg: "Account updated successfully",
      data: user,
    });
  },
);

export const getWeeklyPatientCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    // Start of the week (Sunday)
    const day = now.getUTCDay(); // 0=Sun, 6=Sat
    const startCurrent = new Date(now);
    startCurrent.setUTCDate(now.getUTCDate() - day);
    startCurrent.setUTCHours(0, 0, 0, 0);

    const endCurrent = new Date(startCurrent);
    endCurrent.setUTCDate(startCurrent.getUTCDate() + 6);
    endCurrent.setUTCHours(23, 59, 59, 999);

    // Previous week
    const startPrevious = new Date(startCurrent);
    startPrevious.setUTCDate(startCurrent.getUTCDate() - 7);
    const endPrevious = new Date(startPrevious);
    endPrevious.setUTCDate(startPrevious.getUTCDate() + 6);
    endPrevious.setUTCHours(23, 59, 59, 999);

    const totalCurrent = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startPrevious, $lte: endPrevious },
    });

    const percentage =
      totalPrevious === 0
        ? 100
        : Number(
            (((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1),
          );

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage,
      period: "week",
    });
  },
);

export const getMonthlyPatientCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const startCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const endCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const startPrevious = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const endPrevious = new Date(
      Date.UTC(
        startPrevious.getUTCFullYear(),
        startPrevious.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );

    const totalCurrent = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startPrevious, $lte: endPrevious },
    });

    const percentage =
      totalPrevious === 0
        ? 100
        : Number(
            (((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1),
          );

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage,
      period: "month",
    });
  },
);

export const getYearlyPatientCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const startCurrent = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const endCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
    );

    const startPrevious = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const endPrevious = new Date(
      Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999),
    );

    const totalCurrent = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startPrevious, $lte: endPrevious },
    });

    const percentage =
      totalPrevious === 0
        ? 100
        : Number(
            (((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1),
          );

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage,
      period: "year",
    });
  },
);
