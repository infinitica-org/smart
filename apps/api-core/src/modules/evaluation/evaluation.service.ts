import { Injectable } from '@nestjs/common';

@Injectable()
export class EvaluationService {
  readonly owner = 'Ramansh';
  readonly purpose = 'BARS grading and L4 defense. Produces raw scores.';
}
