import type { Response } from "express";
import type { TResponse } from "@/app/interfaces";

export const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data.statusCode).json({
    success: true,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};

export const sendErrorResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data.statusCode).json({
    success: false,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};
