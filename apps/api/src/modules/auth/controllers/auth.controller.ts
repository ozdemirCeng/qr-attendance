import { Body, Controller, Get, Post } from '@nestjs/common';

import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Get('me')
  me() {
    return this.authService.getMe();
  }
}
