import express from "express";
import * as appointmentController from "../controllers/appointment.controller";

const router = express.Router();

router.get(
  "/completed/week",
  appointmentController.getWeeklyCompletedAppointments,
);
router.get(
  "/completed/month",
  appointmentController.getMonthlyCompletedAppointments,
);
router.get(
  "/completed/year",
  appointmentController.getYearlyCompletedAppointments,
);

router.get("/counts/today", appointmentController.getTodayAppointmentSummary);
router.get("/counts/week", appointmentController.getWeeklyAppointmentCounts);
router.get("/counts/month", appointmentController.getMonthlyAppointmentCounts);
router.get("/counts/year", appointmentController.getYearlyAppointmentCounts);

router
  .route("/today/approved")
  .get(appointmentController.getTodayApprovedAppointments);
router.route("/cancelled").get(appointmentController.getCancelledAppointments);
router.route("/pending").get(appointmentController.getAllPendingAppointments);
router.route("/archive").get(appointmentController.getArchivedAppointments);
router.route("/all").get(appointmentController.getAllAppointments);
router.route("/today").get(appointmentController.getTodayUserAppointments);
router
  .route("/:id/archive")
  .patch(appointmentController.toggleArchiveAppointment);
router
  .route("/:appointmentId/doctors-available")
  .get(appointmentController.getDoctorsForAppointment);
router
  .route("/:id/doctor")
  .patch(appointmentController.updateAppointmentDoctor);
router
  .route("/:id/:action")
  .patch(appointmentController.updateAppointmentStatus);
router.route("/create").post(appointmentController.createAppointment);
router
  .route("/:id")
  .patch(appointmentController.editAppointment)
  .delete(appointmentController.deleteAppointment);
router.route("/").get(appointmentController.getAppointments);

export default router;
