import { Injectable } from '@nestjs/common';

@Injectable()
export class SandboxService {
  readonly owner = 'Vishal V';
  readonly purpose = 'Isolated L2 code/SQL execution.';
}
