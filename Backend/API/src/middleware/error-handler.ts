import { Request, Response, NextFunction } from "express";
import { logger } from "@/config/logger";
import { ApiResponse } from "@/types";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
  });

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    response.error = "Internal Server Error";
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(response);
};
