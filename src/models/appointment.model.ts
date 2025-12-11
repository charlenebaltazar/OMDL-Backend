import mongoose, { Schema } from "mongoose";
import validator from "validator";

const AppointmentSchema = new mongoose.Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: "doctor",
    required: false,
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
  medicalRecord: {
    type: Schema.Types.ObjectId,
    ref: "medicalrecord",
    default: null,
  },
  email: {
    type: String,
    required: true,
  },
  schedule: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
});

const Appointment = mongoose.model("appointment", AppointmentSchema);

export default Appointment;
