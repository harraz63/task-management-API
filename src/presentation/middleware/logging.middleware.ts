import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const method = request.method;
      const url = request.originalUrl ?? request.url;
      const { statusCode } = response;

      this.logger.log(`${method} ${url} ${statusCode} - ${durationMs}ms`);
    });

    next();
  }
}
