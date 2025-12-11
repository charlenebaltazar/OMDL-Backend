import { Types, Document } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstname: string;
  surname: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  address: string;
  email: string;
  phoneNumber: string;
  role: string;
  password: string;
  resetCode: string;
  createdAt: Date;
  comparePassword: (password: string) => Promise<Boolean>;
}

export interface ITransactions {
  _id: Types.ObjectId;
  appointmentId: Types.ObjectId;
  amount: number;
  modeOfPayment: string;
  status: string;
  createdAt: Date;
  isDeleted: boolean;
}

export interface IServices {
  _id: Types.ObjectId;
  name: string;
  price: number;
  status: string;
  createdAt: Date;
}

export interface IDoctors {
  _id: Types.ObjectId;
  name: string;
  specialization: string;
  schedule: Date;
  createdAt: Date;
}
export interface ISchedule {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  start: Date;
  end: Date;
  createdAt: Date;
}

export interface IMedicalRecord extends Document {
  _id: Types.ObjectId;
  appointmentId: Types.ObjectId;
  filename: string;
  driveId: string;
  originalName: string;
  fileUrl: string;
  uploadedAt: Date;
}
