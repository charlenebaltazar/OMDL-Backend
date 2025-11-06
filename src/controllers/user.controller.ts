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
    const admins = await User.find({ role: "admin" });

    res.status(200).json({ status: "success", data: admins });
  },
);

export const getPatients = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const patients = await User.find({ role: "user" });

    res.status(200).json({ status: "success", data: patients });
  },
);

export const getAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) return next(new AppError("ID not found", 404));

    const admin = await User.findById(id);

    if (!admin) return next(new AppError("Admin not found", 404));

    res.status(200).json({ status: "success", data: admin });
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
