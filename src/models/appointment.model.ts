import mongoose, { Schema } from "mongoose";
import validator from "validator";

const AppointmentSchema = new mongoose.Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  medicalDepartment: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        return v.length > 0 && v.length <= 3;
      },
      message: "You must select between 1 and 3 departments",
    },
  },
  schedule: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Email field is required"],
    validate: [validator.isEmail, ""],
  },
  phoneNumber: {
    type: String,
    required: [true, "PhoneNumber field is required"],
  },
  status: {
    type: String,
    default: "Pending",
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const Appointment = mongoose.model("Appointment", AppointmentSchema);

export default Appointment;
