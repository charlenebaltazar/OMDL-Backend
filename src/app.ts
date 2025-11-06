import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import protect from "./middlewares/protect";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import appointmentRoutes from "./routes/appointment.routes";
import doctorRoutes from "./routes/doctor.routes";
import serviceRoutes from "./routes/service.routes";
import globalErrorHandler from "./controllers/globalErrorHandler";
import AppError from "./utils/appError";

const app = express();

app.set("trust proxy", 1);
app.use(
  cors({
    origin: [
      "https://seven-care-user-frontend.vercel.app",
      "https://sevencare-admin.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", protect, userRoutes);
app.use("/api/v1/appointments", protect, appointmentRoutes);
app.use("/api/v1/doctors", protect, doctorRoutes);
app.use("/api/v1/services", protect, serviceRoutes);
// app.use("/api/v1/transactions");
app.use("/{*splat}", (req: Request, res: Response, next: NextFunction) =>
  next(new AppError(`Can't find ${req.originalUrl} from the server.`, 404)),
);
app.use(globalErrorHandler);

export default app;
