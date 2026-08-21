import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  readonly owner = 'Vishal V';
  readonly purpose = 'Current user profile and track enrolment.';
}
