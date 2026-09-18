import httpStatus from "http-status";
import type { IErrorSources, ISendErrorResponse } from "@/app/interfaces";

export const handleCastError = (
  err: { path: string; message: string },
): ISendErrorResponse => {
  const errorSources: IErrorSources[] = [
    {
      path: err.path,
      message: err.message,
    },
  ];
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Invalid ID",
    errorSources,
  };
};
