#!/usr/bin/env python3
"""
UI Audio Theme Generator

Generates cohesive sets of UI sound effects using ElevenLabs API.

Usage:
    python generate_theme.py --vibe "crypto-modern" --output-dir "./audio"
    python generate_theme.py --vibe-custom "warm organic sounds" --output-dir "./audio"
    python generate_theme.py --regenerate "button-click-primary" --vibe "minimal-focus"
    python generate_theme.py --list-vibes
"""

import os
import sys
import json
import time
import argparse
import requests
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

# Sound category definitions with duration and prompt modifiers
SOUND_CATEGORIES = {
    "buttons": {
        "button-click-primary": {"duration": 0.5, "modifier": "main action tap click"},
        "button-click-secondary": {"duration": 0.5, "modifier": "light secondary tap"},
        "button-click-destructive": {"duration": 0.5, "modifier": "warning action tap"},
    },
    "navigation": {
        "nav-tab-switch": {"duration": 0.5, "modifier": "tab switch transition"},
        "nav-back": {"duration": 0.5, "modifier": "back navigation swipe"},
        "nav-forward": {"duration": 0.5, "modifier": "forward navigation"},
        "nav-menu-open": {"duration": 0.5, "modifier": "menu drawer slide open"},
        "nav-menu-close": {"duration": 0.5, "modifier": "menu dismiss"},
    },
    "feedback": {
        "notification-success": {"duration": 0.5, "modifier": "positive confirmation chime"},
        "notification-error": {"duration": 0.5, "modifier": "error alert tone"},
        "notification-warning": {"duration": 0.5, "modifier": "warning attention"},
        "notification-info": {"duration": 0.5, "modifier": "information notice"},
        "notification-badge": {"duration": 0.5, "modifier": "badge counter update"},
    },
    "states": {
        "toggle-on": {"duration": 0.5, "modifier": "switch enable click"},
        "toggle-off": {"duration": 0.5, "modifier": "switch disable click"},
        "checkbox-check": {"duration": 0.5, "modifier": "checkbox select tick"},
        "checkbox-uncheck": {"duration": 0.5, "modifier": "checkbox deselect"},
        "loading-start": {"duration": 0.5, "modifier": "loading initiate"},
        "loading-complete": {"duration": 0.5, "modifier": "loading finish success"},
    },
    "modals": {
        "modal-open": {"duration": 0.5, "modifier": "modal appear"},
        "modal-close": {"duration": 0.5, "modifier": "modal dismiss"},
        "tooltip-show": {"duration": 0.5, "modifier": "tooltip reveal"},
        "dropdown-open": {"duration": 0.5, "modifier": "dropdown expand"},
        "dropdown-close": {"duration": 0.5, "modifier": "dropdown collapse"},
    },
    "transactions": {
        "tx-sent": {"duration": 0.5, "modifier": "transaction sent whoosh"},
        "tx-received": {"duration": 0.5, "modifier": "payment received positive"},
        "tx-pending": {"duration": 0.5, "modifier": "transaction waiting"},
        "tx-confirmed": {"duration": 0.6, "modifier": "confirmation success celebration"},
    },
}

# Predefined vibe presets
VIBE_PRESETS = {
    "corporate-trust": "Warm professional interface sounds, soft banking app chimes, muted corporate clicks, trustworthy",
    "crypto-modern": "Clean digital minimal interface sounds, crisp modern app, subtle tech feedback, futuristic but understated",
    "playful-delight": "Bright friendly interface sounds, cheerful app feedback, bouncy micro-interactions, delightful",
    "minimal-focus": "Ultra-subtle interface sounds, near-silent productivity app, barely perceptible feedback, zen-like",
    "retro-digital": "8-bit inspired interface sounds, pixel art game UI, chip-tune bleeps, nostalgic digital",
    "premium-luxury": "Rich refined interface sounds, deep velvet tones, premium high-end app, sophisticated",
}


@dataclass
class GenerationResult:
    sound_name: str
    file_path: str
    duration_ms: int
    prompt: str
    success: bool
    error: Optional[str] = None


def get_api_key() -> str:
    """Get ElevenLabs API key from environment."""
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        print("Error: ELEVENLABS_API_KEY environment variable not set")
        print("Get your API key from https://elevenlabs.io (Profile -> API Keys)")
        sys.exit(1)
    return key


def generate_sound(
    api_key: str,
    prompt: str,
    duration_seconds: float,
    output_path: Path,
    prompt_influence: float = 0.5
) -> GenerationResult:
    """Generate a single sound effect using ElevenLabs API."""

    url = "https://api.elevenlabs.io/v1/sound-generation"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    # Ensure duration is within API limits (0.5 - 30 seconds)
    duration = max(0.5, min(duration_seconds, 30.0))

    payload = {
        "text": prompt,
        "duration_seconds": duration,
        "prompt_influence": prompt_influence
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)

        if response.status_code == 200:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)

            return GenerationResult(
                sound_name=output_path.stem,
                file_path=str(output_path),
                duration_ms=int(duration * 1000),
                prompt=prompt,
                success=True
            )
        else:
            error_msg = f"API error {response.status_code}: {response.text}"
            return GenerationResult(
                sound_name=output_path.stem,
                file_path="",
                duration_ms=0,
                prompt=prompt,
                success=False,
                error=error_msg
            )
    except Exception as e:
        return GenerationResult(
            sound_name=output_path.stem,
            file_path="",
            duration_ms=0,
            prompt=prompt,
            success=False,
            error=str(e)
        )


def build_prompt(vibe: str, modifier: str) -> str:
    """Build a complete prompt combining vibe and sound modifier."""
    return f"Subtle, {vibe}, {modifier}, short UI sound, minimal interface feedback"


def generate_typescript_constants(sounds: dict) -> str:
    """Generate TypeScript constants for the audio theme."""
    lines = ["// Auto-generated UI Audio Theme Constants", ""]
    lines.append("export const UI_SOUNDS = {")

    for name, config in sounds.items():
        const_name = name.upper().replace("-", "_")
        lines.append(f'  {const_name}: "./{config["file"]}",')

    lines.append("} as const;")
    lines.append("")
    lines.append("export type UISoundKey = keyof typeof UI_SOUNDS;")

    return "\n".join(lines)


def generate_theme(
    vibe: str,
    output_dir: Path,
    format: str = "mp3",
    categories: Optional[list] = None,
    regenerate_only: Optional[list] = None,
    prompt_influence: float = 0.5
) -> dict:
    """Generate a complete audio theme."""

    api_key = get_api_key()
    results = []
    manifest = {
        "name": "custom" if len(vibe) > 50 else vibe.replace(" ", "-"),
        "version": "1.0.0",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "vibe": vibe,
        "sounds": {}
    }

    # Filter categories if specified
    cats_to_generate = categories or list(SOUND_CATEGORIES.keys())

    # Count total sounds to generate
    total_sounds = 0
    for cat, sounds in SOUND_CATEGORIES.items():
        if cat not in cats_to_generate:
            continue
        for sound_name in sounds:
            if regenerate_only and sound_name not in regenerate_only:
                continue
            total_sounds += 1

    if total_sounds == 0:
        print("No sounds to generate. Check category/regenerate filters.")
        return manifest

    current = 0

    for category, sounds in SOUND_CATEGORIES.items():
        if category not in cats_to_generate:
            continue

        category_dir = output_dir / category

        for sound_name, config in sounds.items():
            # Skip if regenerate_only specified and this sound not in list
            if regenerate_only and sound_name not in regenerate_only:
                continue

            current += 1
            print(f"[{current}/{total_sounds}] Generating {sound_name}...")

            prompt = build_prompt(vibe, config["modifier"])
            output_path = category_dir / f"{sound_name}.{format}"

            result = generate_sound(
                api_key=api_key,
                prompt=prompt,
                duration_seconds=config["duration"],
                output_path=output_path,
                prompt_influence=prompt_influence
            )

            results.append(result)

            if result.success:
                print(f"    Generated: {result.file_path}")
                manifest["sounds"][sound_name] = {
                    "file": f"{category}/{sound_name}.{format}",
                    "duration_ms": result.duration_ms,
                    "prompt": prompt
                }
            else:
                print(f"    FAILED: {result.error}")

            # Rate limiting - small delay between requests
            time.sleep(0.5)

    # Generate TypeScript constants
    ts_constants = generate_typescript_constants(manifest["sounds"])
    manifest["typescript_constants"] = ts_constants

    # Write manifest
    manifest_path = output_dir / "theme.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nTheme manifest written to {manifest_path}")

    # Write TypeScript file
    ts_path = output_dir / "constants.ts"
    with open(ts_path, "w") as f:
        f.write(ts_constants)
    print(f"TypeScript constants written to {ts_path}")

    # Summary
    successful = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)
    print(f"\n=== Generation Complete ===")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")

    return manifest


def main():
    parser = argparse.ArgumentParser(
        description="Generate UI audio themes using ElevenLabs API"
    )
    parser.add_argument(
        "--vibe",
        type=str,
        help="Preset vibe name (corporate-trust, crypto-modern, etc.)"
    )
    parser.add_argument(
        "--vibe-custom",
        type=str,
        help="Custom vibe description"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./audio-theme",
        help="Output directory for generated sounds"
    )
    parser.add_argument(
        "--format",
        type=str,
        default="mp3",
        choices=["mp3", "wav"],
        help="Output audio format"
    )
    parser.add_argument(
        "--categories",
        type=str,
        nargs="+",
        choices=list(SOUND_CATEGORIES.keys()),
        help="Specific categories to generate (buttons, navigation, etc.)"
    )
    parser.add_argument(
        "--regenerate",
        type=str,
        help="Comma-separated list of specific sounds to regenerate"
    )
    parser.add_argument(
        "--prompt-influence",
        type=float,
        default=0.5,
        help="Prompt influence (0-1, higher = stricter adherence)"
    )
    parser.add_argument(
        "--list-vibes",
        action="store_true",
        help="List available vibe presets"
    )
    parser.add_argument(
        "--list-sounds",
        action="store_true",
        help="List all available sound names"
    )

    args = parser.parse_args()

    if args.list_vibes:
        print("Available Vibe Presets:")
        print("-" * 50)
        for name, desc in VIBE_PRESETS.items():
            print(f"\n{name}:")
            print(f"  {desc}")
        sys.exit(0)

    if args.list_sounds:
        print("Available Sounds by Category:")
        print("-" * 50)
        for category, sounds in SOUND_CATEGORIES.items():
            print(f"\n{category}/")
            for name in sounds:
                print(f"  - {name}")
        sys.exit(0)

    # Determine vibe
    if args.vibe_custom:
        vibe = args.vibe_custom
    elif args.vibe:
        if args.vibe not in VIBE_PRESETS:
            print(f"Error: Unknown vibe preset '{args.vibe}'")
            print(f"Available presets: {', '.join(VIBE_PRESETS.keys())}")
            sys.exit(1)
        vibe = VIBE_PRESETS[args.vibe]
    else:
        print("Error: Must specify --vibe or --vibe-custom")
        print("Use --list-vibes to see available presets")
        sys.exit(1)

    # Parse regenerate list
    regenerate_only = None
    if args.regenerate:
        regenerate_only = [s.strip() for s in args.regenerate.split(",")]

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"=== UI Audio Theme Generator ===")
    print(f"Vibe: {vibe[:60]}{'...' if len(vibe) > 60 else ''}")
    print(f"Output: {output_dir}")
    print(f"Format: {args.format}")
    if args.categories:
        print(f"Categories: {', '.join(args.categories)}")
    if regenerate_only:
        print(f"Regenerating: {', '.join(regenerate_only)}")
    print()

    generate_theme(
        vibe=vibe,
        output_dir=output_dir,
        format=args.format,
        categories=args.categories,
        regenerate_only=regenerate_only,
        prompt_influence=args.prompt_influence
    )


if __name__ == "__main__":
    main()
