import { Injectable } from '@nestjs/common';

import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  login(payload: LoginDto) {
    return {
      success: true,
      user: {
        id: 'admin-1',
        email: payload.email,
        role: 'admin',
      },
    };
  }

  logout() {
    return { success: true };
  }

  getMe() {
    return {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    };
  }
}
