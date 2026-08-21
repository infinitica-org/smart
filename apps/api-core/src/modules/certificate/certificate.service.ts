import { Injectable } from '@nestjs/common';

@Injectable()
export class CertificateService {
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Issuance, visibility, public verification.';
}
