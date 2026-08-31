import { ForbiddenWall } from '@smart/ui';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export default function ForbiddenPage() {
  return <ForbiddenWall loginHref={`${AUTH_URL}/login`} homeHref="/" />;
}
