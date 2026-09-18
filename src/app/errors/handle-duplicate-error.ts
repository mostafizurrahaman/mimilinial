import httpStatus from "http-status";
import type { IErrorSources, ISendErrorResponse } from "@/app/interfaces";

export const handleValidationError = (
  err: { errors: Record<string, { path: string; message: string }> },
): ISendErrorResponse => {
  const errorSources: IErrorSources[] = Object.values(err.errors).map(
    (val: { path: string; message: string }) => {
      return {
        path: val.path,
        message: val.message,
      };
    },
  );

  const statusCode: number = httpStatus.BAD_REQUEST;

  return {
    statusCode,
    message: errorSources?.[0]?.message || "Validation Error",
    errorSources,
  };
};
