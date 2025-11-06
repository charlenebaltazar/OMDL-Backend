import express from "express";
import * as doctorController from "../controllers/doctor.controller";

const router = express.Router();

router.route("/add").post(doctorController.createDoctor);
router
  .route("/:id")
  .patch(doctorController.updateDoctor)
  .delete(doctorController.deleteDoctor)
  .get(doctorController.getDoctor);
router.route("/").get(doctorController.getDoctors);

export default router;
