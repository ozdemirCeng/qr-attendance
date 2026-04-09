import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { captureUnhandledException } from '../monitoring/sentry';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionPayload = exception.getResponse();
      const exceptionObject =
        typeof exceptionPayload === 'object' && exceptionPayload !== null
          ? (exceptionPayload as Record<string, unknown>)
          : null;

      const message = this.resolveMessage(
        exceptionPayload,
        exceptionObject,
        exception.message,
      );
      const code = this.resolveCode(statusCode, exceptionObject?.code);

      if (statusCode === 429 && !response.getHeader('Retry-After')) {
        response.setHeader(
          'Retry-After',
          this.resolveRetryAfterHeader(exceptionObject),
        );
      }

      if (statusCode >= 500) {
        captureUnhandledException(exception, {
          path: request.url,
          method: request.method,
        });
      }

      response.status(statusCode).json({
        success: false,
        code,
        message,
        statusCode,
        path: request.url,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    captureUnhandledException(exception, {
      path: request.url,
      method: request.method,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Beklenmeyen bir hata olustu.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveMessage(
    payload: string | object,
    payloadObject: Record<string, unknown> | null,
    defaultMessage: string,
  ) {
    if (typeof payload === 'string') {
      return payload;
    }

    const messageCandidate = payloadObject?.message;

    if (Array.isArray(messageCandidate)) {
      return messageCandidate
        .filter((item) => typeof item === 'string')
        .join('; ');
    }

    if (typeof messageCandidate === 'string') {
      return messageCandidate;
    }

    return defaultMessage;
  }

  private resolveCode(statusCode: number, payloadCode: unknown) {
    if (typeof payloadCode === 'string') {
      return payloadCode;
    }

    const fallbackMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return fallbackMap[statusCode] ?? 'HTTP_EXCEPTION';
  }

  private resolveRetryAfterHeader(
    payloadObject: Record<string, unknown> | null,
  ) {
    const retryAfter = payloadObject?.retryAfter;
    if (
      typeof retryAfter === 'number' &&
      Number.isFinite(retryAfter) &&
      retryAfter > 0
    ) {
      return String(Math.ceil(retryAfter));
    }

    const ttl = payloadObject?.ttl;
    if (typeof ttl === 'number' && Number.isFinite(ttl) && ttl > 0) {
      return String(ttl > 1000 ? Math.ceil(ttl / 1000) : Math.ceil(ttl));
    }

    return '60';
  }
}
