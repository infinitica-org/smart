import { NotFoundWall } from '@smart/ui';

const PORTAL_ORIGINS = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
};

export default function NotFound() {
  return <NotFoundWall homeHref="/admin" portalOrigins={PORTAL_ORIGINS} />;
}
