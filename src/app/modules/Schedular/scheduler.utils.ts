import schedule from "node-schedule";
import { mediaServices } from "../Media";

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

// 2. All Schedular:
const startSchedules = () => {
  // Image removal schdular:
  removeMediaSchedular();
};

export const schedularUtils = {
  startSchedules,
};
