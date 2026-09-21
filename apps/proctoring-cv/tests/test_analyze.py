"""Unit tests for snapshot analysis heuristics."""

from __future__ import annotations

import numpy as np
import cv2

from providers.analyze import SnapshotAnalyzer


def _blank_image(luma: int = 120) -> np.ndarray:
    gray = np.full((180, 320, 3), luma, dtype=np.uint8)
    return gray


def test_no_face_dark_frame_flags_obstructed() -> None:
    analyzer = SnapshotAnalyzer()
    _, buf = cv2.imencode(".jpg", _blank_image(10))
    result = analyzer.analyze_bytes(buf.tobytes())
    assert "NO_FACE" in result.violations or "CAMERA_OBSTRUCTED" in result.violations


def test_stub_key_not_required_for_analyzer() -> None:
    analyzer = SnapshotAnalyzer()
    result = analyzer.analyze_bytes(b"not-an-image")
    assert result.violations == []
    assert result.face_count == 0
