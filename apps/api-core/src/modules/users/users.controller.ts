import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { UsersService } from './users.service.js';

@Controller(`${API_PREFIX}/users`)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'users',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
