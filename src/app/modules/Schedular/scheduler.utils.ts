import schedule from "node-schedule";
import { mediaServices } from "../Media";
import { examAttemptServices } from "../ExamAttempt";

// 1. Scheduler Removal schedular:
const removeMediaSchedular = () => {
  return schedule.scheduleJob(
    {
      hour: 14,
      minute: 0,
      tz: "Asia/Dhaka",
    },
    mediaServices.removeOrphanedImages,
  );
};

// 2. Exam Attempt Expiration Worker (Runs every minute to auto-grade zombie in_progress attempts)
const autoGradeExpiredAttemptsSchedular = () => {
  return schedule.scheduleJob("*/1 * * * *", async () => {
    try {
      await examAttemptServices.autoGradeAllExpiredAttempts();
    } catch (err) {
      console.error("Error in autoGradeExpiredAttempts scheduler:", err);
    }
  });
};

// 3. All Schedular:
const startSchedules = () => {
  // Image removal schedular:
  removeMediaSchedular();
  // Auto-grade expired attempts schedular:
  autoGradeExpiredAttemptsSchedular();
};

export const schedularUtils = {
  startSchedules,
};
