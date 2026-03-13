# UI Audio Theme Skill

Generate cohesive sets of subtle UI sound effects for web applications using the ElevenLabs text-to-sound-effects API.

## What It Does

Creates "audio themes" — coordinated sets of short sounds that share a common aesthetic and map to standard UI interaction constants (button clicks, notifications, navigation, modals, toggles, and wallet transactions). Output is a ready-to-use directory with MP3 files and a TypeScript constants file.

## Prerequisites

### ElevenLabs API Key

This skill requires an ElevenLabs API key with access to the sound effects API.

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to Profile → API Keys and generate a key
3. Export it in your shell profile:

```bash
export ELEVENLABS_API_KEY="your-key-here"
```

The sound effects API is available on the Starter plan and above. Check [elevenlabs.io/pricing](https://elevenlabs.io/pricing) for current tier details.

## Design Philosophy

### Subtlety Principle

The more frequently a sound occurs, the subtler it should be. Button clicks should be nearly imperceptible; transaction confirmations can be more noticeable.

### Volume Recommendations

Mix UI sounds at 20–40% volume to remain unobtrusive. In code:

```typescript
audio.volume = 0.3; // 30% — suitable for most UI sounds
```

### Accessibility

- Never rely solely on audio for critical information
- Provide visual alternatives for all audio feedback
- Allow users to disable sounds in app settings

## Integration Examples

### TypeScript / Vanilla

The generated `constants.ts` exports ready-to-use constants:

```typescript
import { UI_SOUNDS } from './audio-theme/constants';

const audio = new Audio(UI_SOUNDS.BUTTON_CLICK_PRIMARY);
audio.volume = 0.3;
audio.play();
```

### React Hook

```typescript
import { useCallback, useEffect, useRef } from 'react';

export function useUISound(soundUrl: string, volume = 0.3) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = volume;
    audioRef.current.preload = 'auto';
    return () => { audioRef.current = null; };
  }, [soundUrl, volume]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  return play;
}

// Usage
function SendButton() {
  const playClick = useUISound(UI_SOUNDS.BUTTON_CLICK_PRIMARY);
  return <button onClick={() => { playClick(); sendTransaction(); }}>Send</button>;
}
```

### Howler.js

```typescript
import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: [UI_SOUNDS.BUTTON_CLICK_PRIMARY], volume: 0.3 }),
  success: new Howl({ src: [UI_SOUNDS.NOTIFICATION_SUCCESS], volume: 0.4 }),
};

sounds.click.play();
```

## Audio-Specialist Integration

For custom sound generation beyond standard categories (music, voice, non-standard effects), use the `audio-specialist` agent, which has full ElevenLabs API integration for sound effects, music, and voice generation.

## Resources

- `scripts/generate_theme.py` — CLI tool for generating themes
- `references/sound-design-guide.md` — Detailed sound design best practices
- `assets/vibe-presets.json` — Predefined vibe configurations
- `assets/theme-template.json` — Example output manifest
