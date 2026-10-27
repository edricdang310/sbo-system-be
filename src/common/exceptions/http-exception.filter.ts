import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * sbo-fe reads the error body as plain text and shows it to the user,
 * so every error is returned as { statusCode, message } with a human-readable message.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      const raw = typeof body === 'string' ? body : body?.message ?? exception.message;
      const message = Array.isArray(raw) ? raw.join('; ') : raw;
      return response.status(status).json({ statusCode: status, message });
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' });
  }
}
