import mongoose from "mongoose";
import { IServices } from "../@types/interfaces";

const ServiceSchema = new mongoose.Schema<IServices>({
  name: {
    type: String,
    required: [true, "Name can't be empty"],
    unique: true,
  },
  price: {
    type: Number,
    required: [true, "Price can't be empty"],
  },
  status: {
    type: String,
    required: [true, "Status can't be empty"],
  },
});

const Service = mongoose.model("services", ServiceSchema);

export default Service;
