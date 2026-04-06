import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { RequestUser } from '../types/request-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user;
  },
);
