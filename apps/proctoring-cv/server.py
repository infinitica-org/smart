"""Proctoring CV sidecar — periodic snapshot analysis."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from providers.analyze import get_analyzer
from storage import fetch_object_bytes

PROVIDER = os.environ.get("PROCTORING_CV_PROVIDER", "stub")


def analyze_object_key(object_key: str) -> dict[str, object]:
    if PROVIDER == "stub" or object_key.startswith("stub:"):
        return {"violations": [], "faceCount": 0}
    payload = fetch_object_bytes(object_key)
    if not payload:
        return {"violations": [], "faceCount": 0}
    result = get_analyzer().analyze_bytes(payload)
    return {
        "violations": result.violations,
        "yaw": result.yaw,
        "pitch": result.pitch,
        "faceCount": result.face_count,
    }


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
            self._send(
                200,
                {"status": "ok", "provider": PROVIDER, "models": PROVIDER == "real"},
            )
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/analyze":
            self._send(404, {"error": "not_found"})
            return
        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
            object_key = str(body.get("objectKey", ""))
        except json.JSONDecodeError:
            self._send(400, {"error": "invalid_json"})
            return
        self._send(200, analyze_object_key(object_key))


def main() -> None:
    if PROVIDER == "real":
        get_analyzer()
    port = int(os.environ.get("PROCTORING_CV_PORT", "8091"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
