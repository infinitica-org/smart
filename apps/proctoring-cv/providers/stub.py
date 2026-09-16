"""No-op provider for CI and local default."""

from __future__ import annotations

from providers.analyze import AnalyzeResult


def analyze_object_key(_object_key: str) -> AnalyzeResult:
    return AnalyzeResult(violations=[], face_count=0)
