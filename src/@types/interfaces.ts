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
}

export interface IDoctors {
  _id: Types.ObjectId;
  name: string;
  specialization: string;
  schedule: Date;
}
