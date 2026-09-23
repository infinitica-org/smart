import { resolvePortalOriginsFromEnv } from '@smart/api-client';
import { NotFoundWall } from '@smart/ui';

const PORTAL_ORIGINS = resolvePortalOriginsFromEnv();

export default function NotFound() {
  return <NotFoundWall homeHref="/status" portalOrigins={PORTAL_ORIGINS} />;
}
