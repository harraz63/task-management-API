import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type HttpExceptionBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

type ErrorResponseBody = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const body = this.toResponseBody(exception, request);

    response.status(body.statusCode).json(body);
  }

  private toResponseBody(
    exception: unknown,
    request: Request,
  ): ErrorResponseBody {
    const timestamp = new Date().toISOString();
    const path = request.originalUrl ?? request.url;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode,
          message: exceptionResponse,
          error: exception.name,
          timestamp,
          path,
        };
      }

      const responseBody = exceptionResponse as HttpExceptionBody;

      return {
        statusCode,
        message: responseBody.message ?? exception.message,
        error: responseBody.error ?? exception.name,
        timestamp,
        path,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint failed',
          error: 'Conflict',
          timestamp,
          path,
        };
      }

      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
          timestamp,
          path,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path,
    };
  }
}
