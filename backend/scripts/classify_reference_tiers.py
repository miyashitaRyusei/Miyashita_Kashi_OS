"""Preview the initial reference-tier classification; write only with --apply."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request


CORE_ARTISTS = {"TOMOO", "NOMELON NOLEMON"}


def request_json(url: str, *, method: str = "GET", token: str | None = None, body=None):
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if token:
        headers["X-Research-Admin-Token"] = token
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method)) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply the displayed changes via the protected API")
    args = parser.parse_args()
    api_url = os.environ.get("KASHI_OS_API_URL", "").rstrip("/")
    token = os.environ.get("RESEARCH_ADMIN_TOKEN")
    if not api_url:
        parser.error("Set KASHI_OS_API_URL. No default Production URL is embedded.")
    if args.apply and not token:
        parser.error("Set RESEARCH_ADMIN_TOKEN when using --apply.")

    songs = request_json(f"{api_url}/api/songs")["songs"]
    plan = []
    for song in songs:
        target = "core" if song["artist"] in CORE_ARTISTS else "archive"
        plan.append((song, target))
        print(f'{song["id"]} | {song["artist"]} / {song["title"]} | {song.get("reference_tier")} -> {target}')

    expected = {"core": sum(target == "core" for _, target in plan), "selected": 0, "archive": sum(target == "archive" for _, target in plan)}
    print(f'DRY-RUN SUMMARY: Core={expected["core"]}, Selected=0, Archive={expected["archive"]}, Total={len(plan)}')
    if not args.apply:
        print("No writes performed. Re-run with --apply only after explicit approval.")
        return 0

    for song, target in plan:
        request_json(f'{api_url}/api/songs/{song["id"]}/reference-tier', method="PATCH", token=token, body={"reference_tier": target})
    verified = request_json(f"{api_url}/api/songs")["songs"]
    counts = {tier: sum(song.get("reference_tier") == tier for song in verified) for tier in ("core", "selected", "archive")}
    print(f'VERIFIED: Core={counts["core"]}, Selected={counts["selected"]}, Archive={counts["archive"]}, Total={len(verified)}')
    return 0 if counts == expected else 1


if __name__ == "__main__":
    raise SystemExit(main())
