#!/usr/bin/env python3
"""
Drama data pipeline — scrape Discord → generate analytics → deploy.
Run this script to refresh drama data. Intended for cron automation.

Requires: ~/.discord_token, empire-rising-scraper/scrape.py,
          empire-rising-scraper/generate_analytics.py

Usage: python3 scripts/pipeline_drama.py
"""
import subprocess, sys, time, json, os
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
SCRAPER = ROOT / "empire-rising-scraper" / "scrape.py"
DATA_DIR = ROOT / "empire-rising-scraper" / "data"
OUT_DIR = ROOT / "data"
TOKEN_PATH = Path.home() / ".discord_token"

# Key drama channels (CMG Empire Rising guild: 1281214047550701620)
CHANNELS = {
    "ground-zero": "1281214047550701623",
    "in-game-roleplay": "1404244072604106889",
    "combat-balancing": "1512909027372171274",
    "economy-balancing": "1516807734564229210",
    "global-news": "1283426967307157526",
    "off-topic-general": "1415710967832248320",
}

def run(cmd, timeout=600):
    """Run a command and return success."""
    print(f"  $ {' '.join(cmd[:3])}...", flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr[:200]}", flush=True)
        return False
    # Print last line of output
    lines = result.stdout.strip().split('\n')
    if lines:
        print(f"  {lines[-1][:120]}", flush=True)
    return True

def main():
    print("=" * 50, flush=True)
    print("DRAMA PIPELINE —", datetime.now(timezone.utc).isoformat(), flush=True)
    print("=" * 50, flush=True)
    
    # 1. Check token
    if not TOKEN_PATH.exists():
        print("ERROR: ~/.discord_token not found", flush=True)
        return 1
    token = TOKEN_PATH.read_text().strip()
    if not token:
        print("ERROR: ~/.discord_token is empty", flush=True)
        return 1
    
    # 2. Delta-scrape each channel
    print("\n[1/3] Scraping channels...", flush=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    scraped = 0
    new_msgs = 0
    
    for ch_name, ch_id in CHANNELS.items():
        out_file = DATA_DIR / f"{ch_name}_{ch_id}.jsonl"
        cmd = [
            sys.executable,
            str(SCRAPER),
            "--channels", ch_id,
            "--output", str(out_file),
            "--max-pages", "10",  # ~1000 recent messages per channel
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            # Count lines in output file
            if out_file.exists():
                count = sum(1 for _ in open(out_file))
                print(f"  {ch_name}: {count} messages", flush=True)
                scraped += 1
                new_msgs += count
        except Exception as e:
            print(f"  {ch_name}: FAILED ({e})", flush=True)
    
    print(f"  Scraped {scraped}/{len(CHANNELS)} channels, {new_msgs} total messages", flush=True)
    
    if new_msgs < 100:
        print("  WARNING: Very few messages — token may be expired or channels restricted", flush=True)
    
    # 3. Generate analytics
    print("\n[2/3] Generating analytics...", flush=True)
    gen_script = DATA_DIR.parent / "generate_analytics.py"
    if gen_script.exists():
        cmd = [sys.executable, str(gen_script)]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=str(ROOT))
            print(f"  {result.stdout.strip()[-200:]}", flush=True)
        except Exception as e:
            print(f"  Analytics generation failed: {e}", flush=True)
            return 1
    else:
        print("  WARNING: generate_analytics.py not found — skipping analytics regeneration", flush=True)
    
    # 4. Verify output
    print("\n[3/3] Verifying output...", flush=True)
    for fname in ['drama_analytics.json', 'player_details.json']:
        fpath = OUT_DIR / fname
        if fpath.exists():
            size_mb = fpath.stat().st_size / (1024*1024)
            with open(fpath) as f:
                data = json.load(f)
            keys = len(data) if isinstance(data, dict) else 'array'
            print(f"  {fname}: {size_mb:.1f}MB, {keys} top-level keys", flush=True)
        else:
            print(f"  {fname}: MISSING!", flush=True)
    
    print("\nPipeline complete.", flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
