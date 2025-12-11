import { NextFunction, Request, Response } from "express";
import Appointment from "../models/appointment.model";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import Doctor from "../models/doctor.model";
import Schedule from "../models/schedule.model";

export const createAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { medicalDepartment, schedule } = req.body;

    if (!medicalDepartment || !schedule)
      return next(new AppError("Invalid empty fields", 400));

    if (isNaN(new Date(schedule).getTime()))
      return next(new AppError("Invalid date or time format", 400));

    const newAppointment = await Appointment.create({
      email: req.user.email,
      patientId: req.user._id,
      medicalDepartment,
      schedule,
    });

    res.status(201).json({
      status: "Success",
      data: normalizeAppointments([newAppointment])[0],
    });
  },
);

export const getAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, date, service, doctorName } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const filter: any = {
      patientId: req.user._id,
      isArchived: false,
    };

    // Status filter
    if (status) filter.status = status;

    // Date filter (same UTC+8 logic)
    if (date) {
      const selectedDate = new Date(date as string);
      const utc8Offset = 8 * 60 * 60 * 1000;
      const localDate = new Date(selectedDate.getTime() - utc8Offset);

      const start = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      filter.schedule = { $gte: start, $lt: end };
    }

    // Service filter
    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    // Fetch raw appointments
    let appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "firstname surname")
      .populate("doctorId", "name")
      .populate("medicalRecord", "fileUrl filename");

    let total = await Appointment.countDocuments(filter);

    if (doctorName) {
      const regex = new RegExp(doctorName as string, "i");
      appointments = appointments.filter((appt) => {
        const doctor = appt.doctorId as any;
        return doctor && regex.test(doctor.name);
      });
      total = appointments.length;
    }

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizeAppointments(appointments),
    });
  },
);

export const deleteAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const apptId = req.params.id;

    if (!apptId) return next(new AppError("Appointment not found", 404));

    const result = await Appointment.deleteOne({ _id: apptId });

    if (result.deletedCount === 0)
      return next(new AppError("Appointment not found", 404));

    res
      .status(200)
      .json({ status: "Success", msg: "Appointment successfully deleted" });
  },
);

export const getAllPendingAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { status, date, service } = req.query;

    const filter: any = { isDeleted: false, status: "Pending" };

    if (date) {
      const selectedDate = new Date(date as string);
      const utc8Offset = 8 * 60 * 60 * 1000;
      const localNow = new Date(selectedDate.getTime() + utc8Offset);

      const start = new Date(
        Date.UTC(
          localNow.getUTCFullYear(),
          localNow.getUTCMonth(),
          localNow.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          localNow.getUTCFullYear(),
          localNow.getUTCMonth(),
          localNow.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      filter.schedule = { $gte: start, $lt: end };
    }

    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    const total = await Appointment.countDocuments(filter);

    const appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "firstname surname");

    res.status(200).json({
      status: "Success",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

export const getTodayApprovedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + utc8Offset);

    const startOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const { status, service, patientName, doctorName, search } = req.query;

    const filter: any = {
      isArchived: false,
      status: { $in: ["Completed", "Approved", "Cancelled"] },
      schedule: { $gte: startOfDayLocal, $lte: endOfDayLocal },
    };

    if (status) filter.status = status;

    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    // Fetch appointments with patient and doctor populated
    let appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "_id firstname surname")
      .populate("doctorId", "name")
      .populate("medicalRecord", "_id fileUrl filename");

    let total = await Appointment.countDocuments(filter);

    if (search) {
      const regex = new RegExp(search as string, "i");

      appointments = appointments.filter((appt) => {
        const p = appt.patientId as any;
        if (!p) return false;

        const fullname = `${p.firstname} ${p.surname}`;
        return (
          regex.test(p.firstname) ||
          regex.test(p.surname) ||
          regex.test(fullname)
        );
      });

      total = appointments.length;
    }

    // Apply patientName filter
    if (patientName) {
      const regex = new RegExp(patientName as string, "i");
      appointments = appointments.filter((appt) => {
        const patient = appt.patientId as any;
        const fullName = `${patient.firstname} ${patient.surname}`;
        return regex.test(fullName);
      });
      total = appointments.length;
    }

    // Apply doctorName filter
    if (doctorName) {
      const regex = new RegExp(doctorName as string, "i");
      appointments = appointments.filter((appt) => {
        const doctor = appt.doctorId as any;
        return doctor && regex.test(doctor.name);
      });
      total = appointments.length;
    }

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizeAppointments(appointments),
    });
  },
);

export const getAllAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, date, service, patientName, doctorName, search } =
      req.query;

    await Appointment.updateMany(
      { isArchived: { $exists: false } }, // only documents without the field
      { $set: { isArchived: false } },
    );

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const filter: any = { isArchived: false };

    if (status) filter.status = status;

    if (date) {
      const selectedDate = new Date(date as string);
      const utc8Offset = 8 * 60 * 60 * 1000;
      const localDate = new Date(selectedDate.getTime() - utc8Offset);

      const start = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      filter.schedule = { $gte: start, $lt: end };
    }

    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    // Fetch appointments with patient populated
    let appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "_id firstname surname")
      .populate("doctorId", "name")
      .populate("medicalRecord", "_id fileUrl filename");

    let total = await Appointment.countDocuments(filter);

    if (search) {
      const regex = new RegExp(search as string, "i");

      appointments = appointments.filter((appt) => {
        const p = appt.patientId as any;
        if (!p) return false;

        const fullname = `${p.firstname} ${p.surname}`;
        return (
          regex.test(p.firstname) ||
          regex.test(p.surname) ||
          regex.test(fullname)
        );
      });

      total = appointments.length;
    }

    // Apply patientName filter if present
    if (patientName) {
      const regex = new RegExp(patientName as string, "i");
      appointments = appointments.filter((appt) => {
        const patient = appt.patientId as unknown as {
          firstname: string;
          surname: string;
        };
        const fullName = `${patient.firstname} ${patient.surname}`;
        return regex.test(fullName);
      });
      total = appointments.length; // update total for filtered results
    }

    if (doctorName) {
      const regex = new RegExp(doctorName as string, "i");
      appointments = appointments.filter((appt) => {
        const d = appt.doctorId as any;
        return d && regex.test(d.name);
      });
      total = appointments.length;
    }

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizeAppointments(appointments),
    });
  },
);

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id, action } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (action === "approve") {
      appointment.status = "Approved";
    } else if (action === "decline") {
      appointment.status = "Declined";
    } else if (action === "completed") {
      appointment.status = "Completed";
    } else if (action === "noshow") {
      appointment.status = "No Show";
    } else if (action === "cancelled") {
      appointment.status = "Cancelled";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await appointment.save();
    res.status(200).json({
      message: "Appointment updated",
      appointment: normalizeAppointments([appointment])[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getCancelledAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const appointments = await Appointment.find({
      isDeleted: false,
      status: { $in: ["Cancelled", "No Show"] },
    }).sort({ schedule: 1 });

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

function normalizeAppointments(appts: any[]) {
  return appts.map((appt) => {
    const obj = appt.toObject ? appt.toObject() : appt;
    const date = new Date(obj.schedule);

    date.setHours(date.getHours() - 8);
    obj.schedule = date.toISOString();

    if (obj.patientId) {
      obj.patientName = `${obj.patientId.firstname} ${obj.patientId.surname}`;
    }

    return obj;
  });
}

export const updateAppointmentDoctor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { doctorId } = req.body;

    if (!doctorId) return next(new AppError("doctorId is required", 400));

    const doctorExists = await Doctor.findById(doctorId);
    if (!doctorExists) {
      return next(new AppError("Doctor not found", 404));
    }

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { doctorId },
      { new: true },
    )
      .populate("patientId", "firstname surname email")
      .populate("doctorId", "name specialization schedule");

    if (!updated) {
      return next(new AppError("Appointment not found", 404));
    }

    res.status(200).json({
      status: "Success",
      message: "Doctor updated for appointment",
      data: updated,
    });
  },
);

export const editAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { medicalDepartment, schedule } = req.body;

    if (!medicalDepartment || !schedule) {
      return next(
        new AppError("medicalDepartment and schedule are required", 400),
      );
    }

    // Validate schedule
    const newDate = new Date(schedule);
    if (isNaN(newDate.getTime())) {
      return next(new AppError("Invalid schedule format", 400));
    }

    const updated = await Appointment.findByIdAndUpdate(
      id,
      {
        medicalDepartment,
        schedule: newDate,
      },
      { new: true },
    )
      .populate("patientId", "firstname surname")
      .populate("doctorId", "name");

    if (!updated) {
      return next(new AppError("Appointment not found", 404));
    }

    res.status(200).json({
      status: "Success",
      message: "Appointment updated successfully",
      data: normalizeAppointments([updated])[0],
    });
  },
);

export const toggleArchiveAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { archive } = req.body;

    if (archive === undefined)
      return next(new AppError("Archive value must be provided", 400));

    const appointment = await Appointment.findById(id)
      .populate("patientId", "firstname surname email")
      .populate("doctorId", "name specialization schedule");

    if (!appointment) return next(new AppError("Appointment not found", 404));

    appointment.isArchived = !!archive;
    await appointment.save();

    res.status(200).json({
      status: "Success",
      message: archive
        ? "Appointment archived successfully"
        : "Appointment unarchived successfully",
      data: normalizeAppointments([appointment])[0],
    });
  },
);

export const getArchivedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;
    const { status, date, service, patientName, doctorName, search } =
      req.query;

    const filter: any = { isArchived: true };

    if (status) filter.status = status;

    if (date) {
      const selectedDate = new Date(date as string);
      const utc8Offset = 8 * 60 * 60 * 1000;
      const localDate = new Date(selectedDate.getTime() - utc8Offset);

      const start = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      filter.schedule = { $gte: start, $lt: end };
    }

    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    // Fetch appointments with patient and doctor populated
    let appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "_id firstname surname")
      .populate("doctorId", "name")
      .populate("medicalRecord", "_id fileUrl filename");

    let total = await Appointment.countDocuments(filter);

    if (search) {
      const regex = new RegExp(search as string, "i");

      appointments = appointments.filter((appt) => {
        const p = appt.patientId as any;
        if (!p) return false;

        const fullname = `${p.firstname} ${p.surname}`;
        return (
          regex.test(p.firstname) ||
          regex.test(p.surname) ||
          regex.test(fullname)
        );
      });

      total = appointments.length;
    }

    // Apply patientName filter
    if (patientName) {
      const regex = new RegExp(patientName as string, "i");
      appointments = appointments.filter((appt) => {
        const patient = appt.patientId as any;
        const fullName = `${patient.firstname} ${patient.surname}`;
        return regex.test(fullName);
      });
      total = appointments.length;
    }

    // Apply doctorName filter
    if (doctorName) {
      const regex = new RegExp(doctorName as string, "i");
      appointments = appointments.filter((appt) => {
        const doctor = appt.doctorId as any;
        return doctor && regex.test(doctor.name);
      });
      total = appointments.length;
    }

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizeAppointments(appointments),
    });
  },
);

export const getTodayUserAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + utc8Offset);

    const startOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const { status, service, patientName, doctorName } = req.query;

    const filter: any = {
      patientId: req.user.id,
      schedule: { $gte: startOfDayLocal, $lte: endOfDayLocal },
    };

    if (status) filter.status = status;

    if (service) {
      const serviceArray = Array.isArray(service) ? service : [service];
      filter.medicalDepartment = { $in: serviceArray };
    }

    // Fetch appointments with patient and doctor populated
    let appointments = await Appointment.find(filter)
      .sort({ schedule: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patientId", "firstname surname")
      .populate("doctorId", "name");

    let total = await Appointment.countDocuments(filter);

    // Apply patientName filter
    if (patientName) {
      const regex = new RegExp(patientName as string, "i");
      appointments = appointments.filter((appt) => {
        const patient = appt.patientId as any;
        const fullName = `${patient.firstname} ${patient.surname}`;
        return regex.test(fullName);
      });
      total = appointments.length;
    }

    // Apply doctorName filter
    if (doctorName) {
      const regex = new RegExp(doctorName as string, "i");
      appointments = appointments.filter((appt) => {
        const doctor = appt.doctorId as any;
        return doctor && regex.test(doctor.name);
      });
      total = appointments.length;
    }

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizeAppointments(appointments),
    });
  },
);

export const getTodayAppointmentSummary = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + utc8Offset);

    const startOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const endOfDayLocal = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const filter = {
      schedule: { $gte: startOfDayLocal, $lte: endOfDayLocal },
      status: { $in: ["Completed", "Approved", "Cancelled"] },
    };

    const counts = await Appointment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      completedCount: 0,
      ongoingCount: 0,
      cancelledCount: 0,
    };

    counts.forEach((c) => {
      if (c._id === "Completed") summary.completedCount = c.count;
      if (c._id === "Approved") summary.ongoingCount = c.count;
      if (c._id === "Cancelled") summary.cancelledCount = c.count;
    });

    res.status(200).json({
      status: "Success",
      ...summary,
      total:
        summary.completedCount + summary.ongoingCount + summary.cancelledCount,
    });
  },
);

export const getWeeklyAppointmentCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const utc8Offset = 8 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + utc8Offset);

    // Start of the week (Sunday)
    const day = localNow.getUTCDay(); // 0=Sun, 6=Sat
    const sunday = new Date(localNow);
    sunday.setUTCDate(localNow.getUTCDate() - day);
    sunday.setUTCHours(0, 0, 0, 0);

    // End of the week (Saturday)
    const saturday = new Date(sunday);
    saturday.setUTCDate(sunday.getUTCDate() + 6);
    saturday.setUTCHours(23, 59, 59, 999);

    const completedCounts = Array(7).fill(0);
    const cancelledCounts = Array(7).fill(0);

    // Only get appointments within this week
    const appointments = await Appointment.find({
      status: { $in: ["Completed", "Cancelled", "No Show"] },
      schedule: { $gte: sunday, $lte: saturday },
    });

    appointments.forEach((appt) => {
      // Original appointment date in UTC
      const date = new Date(appt.schedule);

      // Subtract 8 hours to get UTC-8
      const correctedDate = new Date(date.getTime());

      // Get weekday 0=Sunday ... 6=Saturday
      const weekday = correctedDate.getUTCDay();

      if (appt.status === "Completed") {
        completedCounts[weekday]++;
      } else if (appt.status === "Cancelled" || appt.status === "No Show") {
        cancelledCounts[weekday]++;
      }
    });

    res.status(200).json({
      status: "Success",
      labels: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      completed: completedCounts,
      cancelled: cancelledCounts,
    });
  },
);

export const getMonthlyAppointmentCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const year = now.getUTCFullYear();

    const utc8Offset = 8 * 60 * 60 * 1000;
    const completedCounts = Array(12).fill(0);
    const cancelledCounts = Array(12).fill(0);

    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const appointments = await Appointment.find({
      schedule: { $gte: startOfYear, $lte: endOfYear },
      status: { $in: ["Completed", "Cancelled", "No Show"] },
    });

    appointments.forEach((appt) => {
      const date = new Date(appt.schedule);
      const month = new Date(date.getTime()).getUTCMonth();

      if (appt.status === "Completed") {
        completedCounts[month]++;
      } else if (appt.status === "Cancelled" || appt.status === "No Show") {
        cancelledCounts[month]++;
      }
    });

    res.status(200).json({
      status: "Success",
      labels: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      completed: completedCounts,
      cancelled: cancelledCounts,
    });
  },
);

export const getYearlyAppointmentCounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000;
    const currentYear = now.getUTCFullYear();

    const years: number[] = [];
    for (let i = 4; i >= 0; i--) {
      years.push(currentYear - i);
    }

    const completedCounts = Array(5).fill(0);
    const cancelledCounts = Array(5).fill(0);

    const earliestYear = currentYear - 4;

    const start = new Date(Date.UTC(earliestYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const appointments = await Appointment.find({
      schedule: { $gte: start, $lte: end },
      status: { $in: ["Completed", "Cancelled", "No Show"] },
    });

    appointments.forEach((appt) => {
      const date = new Date(appt.schedule);
      const local = new Date(date.getTime());
      const year = local.getUTCFullYear();

      const index = years.indexOf(year);
      if (index === -1) return;

      if (appt.status === "Completed") {
        completedCounts[index]++;
      } else if (appt.status === "Cancelled" || appt.status === "No Show") {
        cancelledCounts[index]++;
      }
    });

    res.status(200).json({
      status: "Success",
      labels: years,
      completed: completedCounts,
      cancelled: cancelledCounts,
    });
  },
);

function computePercentage(current: number, previous: number) {
  if (previous === 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const getWeeklyCompletedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const day = now.getUTCDay();
    const startCurrent = new Date(now);
    startCurrent.setUTCDate(now.getUTCDate() - day);
    startCurrent.setUTCHours(0, 0, 0, 0);

    const endCurrent = new Date(startCurrent);
    endCurrent.setUTCDate(startCurrent.getUTCDate() + 6);
    endCurrent.setUTCHours(23, 59, 59, 999);

    const startPrevious = new Date(startCurrent);
    startPrevious.setUTCDate(startCurrent.getUTCDate() - 7);

    const endPrevious = new Date(startPrevious);
    endPrevious.setUTCDate(startPrevious.getUTCDate() + 6);
    endPrevious.setUTCHours(23, 59, 59, 999);

    const totalCurrent = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startPrevious, $lte: endPrevious },
    });

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage: computePercentage(totalCurrent, totalPrevious),
      period: "week",
    });
  },
);

export const getMonthlyCompletedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const startCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const endCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const startPrevious = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const endPrevious = new Date(
      Date.UTC(
        startPrevious.getUTCFullYear(),
        startPrevious.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );

    const totalCurrent = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startPrevious, $lte: endPrevious },
    });

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage: computePercentage(totalCurrent, totalPrevious),
      period: "month",
    });
  },
);

export const getYearlyCompletedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const startCurrent = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const endCurrent = new Date(
      Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
    );

    const startPrevious = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const endPrevious = new Date(
      Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999),
    );

    const totalCurrent = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startCurrent, $lte: endCurrent },
    });

    const totalPrevious = await Appointment.countDocuments({
      status: "Completed",
      schedule: { $gte: startPrevious, $lte: endPrevious },
    });

    res.status(200).json({
      status: "Success",
      totalCurrent,
      totalPrevious,
      percentage: computePercentage(totalCurrent, totalPrevious),
      period: "year",
    });
  },
);

export const getDoctorsForAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res
        .status(400)
        .json({ status: "Fail", message: "appointmentId is required" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ status: "Fail", message: "Appointment not found" });
    }

    const appointmentTime = appointment.schedule;

    const schedules = await Schedule.find({
      start: { $lte: appointmentTime },
      end: { $gte: appointmentTime },
    }).populate("doctorId", "name specialization");

    const doctorsMap = new Map<string, any>();
    for (const sched of schedules) {
      if (sched.doctorId) {
        doctorsMap.set(sched.doctorId._id.toString(), sched.doctorId);
      }
    }

    const doctors = Array.from(doctorsMap.values());

    res.status(200).json({
      status: "Success",
      results: doctors.length,
      data: doctors,
    });
  },
);
