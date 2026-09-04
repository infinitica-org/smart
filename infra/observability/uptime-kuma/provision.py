#!/usr/bin/env python3
"""Idempotently apply monitors.json to an Uptime Kuma instance.

On a fresh (never-configured) Kuma instance, also creates the initial admin
account from KUMA_ADMIN_USERNAME / KUMA_ADMIN_PASSWORD — Kuma refuses `setup`
once an account already exists, so this is safe to run against an already
set-up instance too (it just logs in instead).

Usage:
    pip install -r infra/observability/uptime-kuma/requirements.txt
    python infra/observability/uptime-kuma/provision.py

Reads from the environment (see .env): KUMA_URL, KUMA_ADMIN_USERNAME,
KUMA_ADMIN_PASSWORD, plus whatever monitors.json's ${VAR} placeholders need
(currently POSTGRES_PASSWORD).
"""
import json
import os
import re
import sys
from pathlib import Path

from uptime_kuma_api import MonitorType, UptimeKumaApi

HERE = Path(__file__).parent
MONITORS_FILE = HERE / "monitors.json"

KUMA_URL = os.environ.get("KUMA_URL", "http://localhost:3102")
KUMA_ADMIN_USERNAME = os.environ.get("KUMA_ADMIN_USERNAME")
KUMA_ADMIN_PASSWORD = os.environ.get("KUMA_ADMIN_PASSWORD")

ENV_VAR_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)\}")


def substitute_env(value):
    """Replace ${VAR} in strings (recursively through dicts/lists) from os.environ."""
    if isinstance(value, str):
        def replace(match):
            name = match.group(1)
            if name not in os.environ:
                sys.exit(f"monitors.json references ${{{name}}}, but it is not set in the environment.")
            return os.environ[name]
        return ENV_VAR_PATTERN.sub(replace, value)
    if isinstance(value, dict):
        return {k: (v if k.startswith("_") else substitute_env(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [substitute_env(v) for v in value]
    return value


def upsert_monitor(api, existing_by_name, monitor):
    monitor = dict(monitor)
    monitor["type"] = MonitorType(monitor["type"])
    name = monitor["name"]

    if name in existing_by_name:
        monitor_id = existing_by_name[name]["id"]
        api.edit_monitor(monitor_id, **monitor)
        print(f"  updated: {name}")
    else:
        result = api.add_monitor(**monitor)
        monitor_id = result["monitorID"]
        existing_by_name[name] = {"id": monitor_id}
        print(f"  created: {name}")

    return monitor_id


def main():
    if not KUMA_ADMIN_USERNAME or not KUMA_ADMIN_PASSWORD:
        sys.exit("Set KUMA_ADMIN_USERNAME and KUMA_ADMIN_PASSWORD in the environment (see .env).")

    spec = substitute_env(json.loads(MONITORS_FILE.read_text(encoding="utf-8")))

    with UptimeKumaApi(KUMA_URL) as api:
        if api.need_setup():
            print(f"Fresh Kuma instance — creating admin account '{KUMA_ADMIN_USERNAME}'.")
            api.setup(KUMA_ADMIN_USERNAME, KUMA_ADMIN_PASSWORD)
        # `setup()` alone doesn't establish an authenticated session (no
        # initial `monitorList` push) — an explicit login is required either way.
        api.login(KUMA_ADMIN_USERNAME, KUMA_ADMIN_PASSWORD)

        existing_by_name = {m["name"]: m for m in api.get_monitors()}

        group_id = None
        group_name = spec.get("group", {}).get("name")
        if group_name:
            group_id = upsert_monitor(api, existing_by_name, {"type": "group", "name": group_name})

        print(f"Applying {len(spec['monitors'])} monitor(s) from {MONITORS_FILE.name}:")
        for monitor in spec["monitors"]:
            if group_id is not None:
                monitor = {**monitor, "parent": group_id}
            upsert_monitor(api, existing_by_name, monitor)

    print("Done.")


if __name__ == "__main__":
    main()
