import express from "express";
import * as serviceController from "../controllers/service.controller";

const router = express.Router();

router.get("/reports/top", serviceController.getTopAvailedServices);
router.get("/counts/week", serviceController.getWeeklyServicesAvailed);
router.get("/counts/month", serviceController.getMonthlyServicesAvailed);
router.get("/counts/year", serviceController.getYearlyServicesAvailed);
router.route("/add").post(serviceController.createService);
router
  .route("/:id")
  .patch(serviceController.updateService)
  .delete(serviceController.deleteService)
  .get(serviceController.getService);
router.route("/").get(serviceController.getServices);

export default router;
