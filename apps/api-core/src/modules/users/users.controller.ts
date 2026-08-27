import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { UsersService } from './users.service.js';

@Controller(`${API_PREFIX}/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

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
