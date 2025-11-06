import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import { IUser } from "../@types/interfaces";
import { NextFunction } from "express";

const UserSchema = new mongoose.Schema<IUser>({
  firstname: {
    type: String,
    required: [true, "Firstname field is required"],
  },
  surname: {
    type: String,
    required: [true, "Surname field is required"],
  },
  gender: {
    type: String,
    required: true,
  },
  maritalStatus: {
    type: String,
    required: true,
  },
  birthDate: {
    type: String,
    required: [true, "Birthdate field is required"],
  },
  address: {
    type: String,
    required: [true, "Address field is required"],
  },
  email: {
    type: String,
    required: [true, "Email field is required"],
    validate: [validator.isEmail, ""],
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "PhoneNumber field is required"],
    unique: true,
  },
  role: {
    type: String,
    required: [true, "User role is required"],
  },
  password: {
    type: String,
    required: [true, "Password field is required"],
    minlength: 8,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// @ts-expect-error
UserSchema.pre("save", async function (this: IUser, next: NextFunction) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("user", UserSchema);

export default User;
