import { SetMetadata } from '@nestjs/common';

import { RequestUser } from '../types/request-user.type';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RequestUser['role'][]) =>
  SetMetadata(ROLES_KEY, roles);
