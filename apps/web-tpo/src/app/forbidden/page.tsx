import { ForbiddenWall } from '@smart/ui';

const AUTH_URL = process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002';

export default function ForbiddenPage() {
  return <ForbiddenWall loginHref={`${AUTH_URL}/login`} />;
}
