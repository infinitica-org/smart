import { NextResponse } from 'next/server';

/** Raw HTML so Sign out iframes clear this origin before React boots. */
export function GET() {
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>
try {
  sessionStorage.removeItem('smart.accessToken');
  localStorage.removeItem('smart.accessToken');
} catch (e) {}
</script></body></html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}
