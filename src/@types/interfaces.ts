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
