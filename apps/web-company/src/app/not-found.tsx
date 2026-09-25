import { resolvePortalOriginsFromEnv } from '@smart/api-client';
import { NotFoundWall } from '@smart/ui';

const PORTAL_ORIGINS = resolvePortalOriginsFromEnv();

export default function NotFound() {
  return <NotFoundWall homeHref="/" portalOrigins={PORTAL_ORIGINS} />;
}
