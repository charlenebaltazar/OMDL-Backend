import express from "express";
import * as appointmentController from "../controllers/appointment.controller";

const router = express.Router();

router
  .route("/today/approved")
  .get(appointmentController.getTodayApprovedAppointments);
router.route("/cancelled").get(appointmentController.getCancelledAppointments);
router.route("/pending").get(appointmentController.getAllPendingAppointments);
router.route("/all").get(appointmentController.getAllAppointments);
router
  .route("/:id/:action")
  .patch(appointmentController.updateAppointmentStatus);
router.route("/create").post(appointmentController.createAppointment);
router.route("/:id").delete(appointmentController.deleteAppointment);
router.route("/").get(appointmentController.getAppointments);

export default router;
