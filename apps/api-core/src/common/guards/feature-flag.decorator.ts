import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FLAG_KEY = 'requireFlag';

/** Declares the plan feature-flag key an endpoint requires. Requires JwtAuthGuard + FeatureFlagGuard. */
export const RequireFlag = (key: string) => SetMetadata(REQUIRE_FLAG_KEY, key);
