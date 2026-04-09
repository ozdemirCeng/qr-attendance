import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import {
  AUDIT_METADATA_KEY,
  AuditOptions,
} from '../decorators/audit.decorator';
import { RequestUser } from '../types/request-user.type';
import { AuditService } from '../../modules/audit/services/audit.service';

type HttpRequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  user?: RequestUser;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<AuditOptions>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequestLike>();

    return next.handle().pipe(
      tap((responsePayload) => {
        const entityId = this.resolveEntityId(
          options,
          request,
          responsePayload,
        );

        this.auditService.log({
          adminId: request.user?.id ?? null,
          action: options.action,
          entityType: options.entityType,
          entityId,
          metadataJson: {
            method: request.method ?? null,
            path: request.originalUrl ?? request.url ?? null,
            params: request.params ?? {},
            query: request.query ?? {},
            body: this.sanitizeBody(request.body ?? {}),
            response: this.extractResponseMeta(responsePayload),
          },
        });
      }),
    );
  }

  private resolveEntityId(
    options: AuditOptions,
    request: HttpRequestLike,
    responsePayload: unknown,
  ) {
    if (options.entityIdParam) {
      const value = request.params?.[options.entityIdParam];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    if (options.entityIdBody) {
      const value = request.body?.[options.entityIdBody];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    if (options.entityIdResponsePath) {
      const value = this.getByPath(
        responsePayload,
        options.entityIdResponsePath,
      );
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private getByPath(source: unknown, path: string): unknown {
    if (!path.trim()) {
      return undefined;
    }

    const segments = path.split('.');
    let current: unknown = source;

    for (const segment of segments) {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  private sanitizeBody(body: Record<string, unknown>) {
    const clone = { ...body };

    if (typeof clone.password === 'string') {
      clone.password = '[REDACTED]';
    }

    return clone;
  }

  private extractResponseMeta(payload: unknown) {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const payloadObject = payload as Record<string, unknown>;
    const success = payloadObject.success;
    const dataId = this.getByPath(payloadObject, 'data.id');
    const exportId = this.getByPath(payloadObject, 'data.exportId');

    return {
      success: typeof success === 'boolean' ? success : null,
      dataId: typeof dataId === 'string' ? dataId : null,
      exportId: typeof exportId === 'string' ? exportId : null,
    };
  }
}
