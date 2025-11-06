import mongoose from "mongoose";
import { IDoctors } from "../@types/interfaces";

const DoctorSchema = new mongoose.Schema<IDoctors>({
  name: {
    type: String,
    required: [true, "Name can't be empty"],
    unique: true,
  },
  specialization: {
    type: String,
    required: [true, "Specialization can't be empty"],
  },
  schedule: {
    type: Date,
    required: [true, "Date can't be empty"],
  },
});

const Doctor = mongoose.model("doctors", DoctorSchema);

export default Doctor;
