"""CV sidecar stub. Real InsightFace/MediaPipe providers are swapped via env later."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        return

    def _send(self, code: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send(200, {"status": "ok", "provider": "stub"})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/analyze":
            self._send(404, {"error": "not_found"})
            return
        length = int(self.headers.get("content-length", "0"))
        _ = self.rfile.read(length) if length else b"{}"
        # Stub never flags — CI and local default. Real providers return violation kinds.
        self._send(200, {"violations": []})


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8091), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
