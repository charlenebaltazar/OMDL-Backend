import express from "express";
import * as userController from "../controllers/user.controller";

const router = express.Router();

router.get("/counts/week", userController.getWeeklyPatientCounts);
router.get("/counts/month", userController.getMonthlyPatientCounts);
router.get("/counts/year", userController.getYearlyPatientCounts);

router.route("/admins/create").post(userController.createAdmin);
router.route("/admins").get(userController.getAdmins);
router.route("/patients").get(userController.getPatients);
router.route("/my-account").get(userController.myAccount);
router.route("/update").patch(userController.updateAccount);
router
  .route("/:id")
  .get(userController.getAccount)
  .patch(userController.updateAdmin)
  .delete(userController.deleteAdmin);

export default router;
