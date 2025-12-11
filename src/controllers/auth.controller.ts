import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import { Types } from "mongoose";
import signToken from "../utils/signToken";
import User from "../models/user.model";
import sendPasswordResetCode from "../utils/sendResetCodeEmail";

const createSendToken = (
  res: Response,
  userId: Types.ObjectId,
  statusCode: number,
) => {
  const token = signToken({ userId });

  const cookieOption = {
    maxAge: Number(process.env.COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none" as "none",
    path: "/",
  };

  res.cookie("authToken", token, cookieOption);
  res.status(statusCode).json({ status: "Success" });
};

export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstname,
      surname,
      maritalStatus,
      gender,
      birthDate,
      address,
      email,
      phoneNumber,
      password,
      role,
    } = req.body;

    if (
      !firstname ||
      !surname ||
      !maritalStatus ||
      !gender ||
      !birthDate ||
      !address ||
      !email ||
      !phoneNumber ||
      !password ||
      !role
    )
      return next(new AppError("Invalid empty fields", 400));

    const existingUser = await User.findOne({ email });

    if (existingUser) return next(new AppError("Email already exists", 400));

    const newUser = await User.create({
      firstname,
      surname,
      birthDate,
      maritalStatus,
      gender,
      address,
      email,
      phoneNumber,
      password,
      role,
    });

    createSendToken(res, newUser._id, 201);
  },
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, role } = req.body;
    const origin = req.headers.origin;

    if (!email || !password)
      return next(new AppError("Invalid empty fields", 400));

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user?.comparePassword(password)))
      return next(new AppError("Incorrect user credentials", 400));

    if (role !== user.role) {
      return next(
        new AppError("You are not authorized to access this site", 403),
      );
    }

    createSendToken(res, user._id, 200);
  },
);

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) return next(new AppError("Invalid empty email", 400));

    const user = await User.findOne({ email });

    if (!user)
      return next(new AppError("User belonging to this email not found", 404));

    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetCode = resetCode;
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetCode(user, resetCode);

    res.status(200).json({ status: "Success" });
  },
);

export const resetCode = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return next(new AppError("Missing required field", 400));
    }

    const user = await User.findOne({ email }).select("+resetCode");
    if (!user) return next(new AppError("User not found", 404));

    if (String(user.resetCode) !== String(resetCode).trim())
      return next(new AppError("Invalid reset code", 400));

    res.status(200).json({ status: "Success" });
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password)
      return next(new AppError("Missing required field", 400));

    const user = await User.findOne({ email }).select("+resetCode +password");
    if (!user) return next(new AppError("User not found", 404));

    user.password = password;
    user.resetCode = "";

    await user.save();

    res
      .status(200)
      .json({ status: "success", message: "Password reset successfully" });
  },
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    res.status(200).json({ status: "Success" });
  },
);
