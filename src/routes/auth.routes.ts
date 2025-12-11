import express from "express";
import * as authController from "../controllers/auth.controller";

const router = express.Router();

router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);
router.route("/forgot-password").post(authController.forgotPassword);
router.route("/reset-code").post(authController.resetCode);
router.route("/reset-password").post(authController.resetPassword);
router.route("/logout").post(authController.logout);

export default router;
