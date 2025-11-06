import express from "express";
import * as serviceController from "../controllers/service.controller";

const router = express.Router();

router.route("/add").post(serviceController.createService);
router
  .route("/:id")
  .patch(serviceController.updateService)
  .delete(serviceController.deleteService)
  .get(serviceController.getService);
router.route("/").get(serviceController.getServices);

export default router;
