import mongoose, { Schema } from "mongoose";
import { ISchedule } from "../@types/interfaces";

const ScheduleSchema = new mongoose.Schema<ISchedule>({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: "doctor",
    required: true,
  },
  start: {
    type: Date,
    required: [true, "Date can't be empty"],
  },
  end: {
    type: Date,
    required: [true, "Date can't be empty"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Schedule = mongoose.model("schedule", ScheduleSchema);

export default Schedule;
