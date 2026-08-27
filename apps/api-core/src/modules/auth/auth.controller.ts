import { Body, Controller, Inject, Post } from '@nestjs/common';
import { API_PREFIX, PasswordLoginRequestSchema } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { AuthService } from './auth.service.js';

@Controller(`${API_PREFIX}/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: unknown) {
    const parsed = PasswordLoginRequestSchema.parse(body);
    return this.auth.login(parsed.email, parsed.password);
  }
}
