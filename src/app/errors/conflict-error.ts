import { AppError } from "./app-error";
import httpStatus from "http-status";

export class ConflictError extends AppError {
  constructor(message: string, stack = "") {
    super(httpStatus.CONFLICT, message, stack);
  }
}
