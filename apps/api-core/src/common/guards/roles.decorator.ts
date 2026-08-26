import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@smart/contracts';

export const ROLES_KEY = 'roles';

/** Declares which roles may call an endpoint. Requires JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
