import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import { Types } from "mongoose";
import signToken from "../utils/signToken";
import User from "../models/user.model";
import PasswordResetCode from "../models/passwordResetModel";

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
      role
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
      role
    });

    createSendToken(res, newUser._id, 201);
  },
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const origin = req.headers.origin; 

    if (!email || !password)
      return next(new AppError("Invalid empty fields", 400));

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user?.comparePassword(password)))
      return next(new AppError("Incorrect user credentials", 400));

    if (origin === "https://sevencare-admin.vercel.app" && user.role !== "admin") {
      return next(new AppError("Only admin accounts can access this site", 403));
    }

    if (origin === "https://seven-care-user-frontend.vercel.app" && user.role !== "user") {
      return next(new AppError("Only user accounts can access this site", 403));
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

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    const codeHash = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");

    const resetCodeExpires = new Date(Date.now() + 5 * 60 * 1000);

    const passwordResetCode = await PasswordResetCode.create({
      userId: user._id,
      codeHash,
      expiresAt: resetCodeExpires,
    });

    res.status(200).json({ status: "Success" });
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return next(new AppError("Missing required fields", 400));
    }

    const user = await User.findOne({ email });
    if (!user) return next(new AppError("User not found", 404));

    const codeHash = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");

    const storedCode = await PasswordResetCode.findOne({
      userId: user._id,
      codeHash,
      expiresAt: { $gt: new Date() },
    });

    if (!storedCode) return next(new AppError("Invalid or expired code", 400));

    user.password = newPassword;
    await user.save();

    await PasswordResetCode.deleteMany({ userId: user._id }); // cleanup

    createSendToken(res, user._id, 200);
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
