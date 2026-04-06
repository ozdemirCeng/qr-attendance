import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionPayload = exception.getResponse();
      const message =
        typeof exceptionPayload === 'string'
          ? exceptionPayload
          : ((exceptionPayload as Record<string, unknown>).message ??
            exception.message);

      response.status(statusCode).json({
        success: false,
        code: 'HTTP_EXCEPTION',
        message,
        statusCode,
        path: request.url,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Beklenmeyen bir hata olustu.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
