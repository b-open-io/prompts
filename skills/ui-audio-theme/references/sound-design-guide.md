# UI Sound Design Guide

Comprehensive reference for creating subtle, effective UI audio themes.

## Sound Psychology

### Emotional Mapping

| UI Action | Emotional Goal | Sound Qualities |
|-----------|----------------|-----------------|
| Success | Satisfaction, confidence | Rising pitch, major keys, warm |
| Error | Attention, concern | Discordant, sharp, attention-grabbing |
| Warning | Caution, awareness | Mid-urgency, distinct but not alarming |
| Navigation | Spatial awareness | Movement, direction, whoosh |
| Interaction | Confirmation, feedback | Click, tap, tactile |
| Loading | Progress, patience | Subtle rhythm, continuation |

### Frequency Guidelines

The more frequently a sound plays, the more subtle it must be:

| Frequency | Sound Character | Duration | Volume |
|-----------|----------------|----------|--------|
| Constant (every click) | Near-imperceptible | ~500ms | 10-20% |
| Frequent (every action) | Subtle | ~500ms | 20-30% |
| Occasional (confirmations) | Noticeable | ~500ms | 30-40% |
| Rare (transactions) | Prominent | 500-600ms | 40-50% |

## Prompt Engineering

### Core Modifiers

Always include these for UI sounds:
- **Subtlety**: "subtle", "soft", "gentle", "understated", "minimal"
- **Duration**: "short", "brief", "quick", "snappy"
- **Quality**: "clean", "crisp", "clear", "polished"
- **Context**: "UI", "interface", "app", "digital"

### Material Descriptors

Sound materials create distinct aesthetics:

| Material | Character | Best For |
|----------|-----------|----------|
| Digital | Clean, synthetic | Tech apps, dashboards |
| Glass | Bright, crystalline | Premium, elegant |
| Wood | Warm, organic | Natural, eco brands |
| Metal | Sharp, industrial | Tools, professional |
| Plastic | Soft, toy-like | Playful, consumer |
| Water | Fluid, organic | Calm, wellness |

### Example Prompts by Category

**Button Clicks:**
```
Subtle digital tap, clean UI click, minimal interface feedback, very short
Soft glass button click, premium app tap, understated interface
Warm wooden button click, organic UI feedback, natural app sound
```

**Success Notifications:**
```
Gentle positive chime, success confirmation, subtle rising tone, app notification
Soft celebration tone, task complete, satisfied feeling, minimal fanfare
Clean success ping, digital confirmation, bright but subtle
```

**Error Alerts:**
```
Soft error tone, attention needed, subtle warning sound, not alarming
Gentle negative feedback, something wrong indication, concern without panic
Muted alert sound, problem notification, noticeable but not jarring
```

**Navigation:**
```
Subtle whoosh transition, tab switch, spatial movement, quick
Soft page turn, navigation sound, directional feedback, minimal
Clean swipe sound, menu transition, light movement
```

## Platform Considerations

### Mobile vs Desktop

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| Duration | ~500ms (API min) | ~500ms (API min) |
| Frequency | Less frequent | More frequent OK |
| Speaker quality | Variable | Generally better |
| Context | Public spaces | Private/headphones |

### Mobile Optimization
- Test on built-in speakers (often tinny)
- Assume background noise
- Provide haptic fallback (vibration)

### Desktop Optimization
- Can use fuller frequency range
- Assume focused attention
- Consider headphone users

## Accessibility

### Audio Accessibility Requirements

1. **Never rely solely on audio** for critical information
2. **Provide visual alternatives** for all audio feedback
3. **Allow users to disable** all sounds easily
4. **Offer volume control** separate from system volume
5. **Test with screen readers** to avoid conflicts

### Implementation Pattern

```typescript
// Accessible audio feedback
function playFeedback(sound: string, visualAlt: () => void) {
  if (userPrefersSoundEnabled()) {
    playSound(sound);
  }
  // Always show visual feedback
  visualAlt();
}

// Usage
playFeedback(UI_SOUNDS.NOTIFICATION_SUCCESS, () => {
  showSuccessToast("Transaction sent!");
});
```

## Technical Implementation

### Audio Formats

| Format | Quality | File Size | Browser Support |
|--------|---------|-----------|-----------------|
| MP3 | Good | Small | Universal |
| WAV | Excellent | Large | Universal |
| OGG | Good | Small | No Safari |
| WebM | Good | Small | No Safari |

**Recommendation**: MP3 at 128kbps for universal support with good quality.

### Preloading Strategy

```typescript
// Preload critical sounds on app init
const criticalSounds = [
  UI_SOUNDS.BUTTON_CLICK_PRIMARY,
  UI_SOUNDS.NOTIFICATION_SUCCESS,
  UI_SOUNDS.NOTIFICATION_ERROR,
];

function preloadSounds(sounds: string[]) {
  sounds.forEach(src => {
    const audio = new Audio(src);
    audio.preload = 'auto';
  });
}
```

### Howler.js Integration

```typescript
import { Howl } from 'howler';

// Create a sound pool
const soundPool = {
  buttonClick: new Howl({
    src: [UI_SOUNDS.BUTTON_CLICK_PRIMARY],
    volume: 0.3,
    preload: true,
  }),
  success: new Howl({
    src: [UI_SOUNDS.NOTIFICATION_SUCCESS],
    volume: 0.4,
    preload: true,
  }),
};

// Play with pooling (prevents overlapping)
export function playSound(key: keyof typeof soundPool) {
  soundPool[key].play();
}
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

    return () => {
      audioRef.current = null;
    };
  }, [soundUrl, volume]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked - user hasn't interacted yet
      });
    }
  }, []);

  return play;
}

// Usage
function SendButton() {
  const playClick = useUISound(UI_SOUNDS.BUTTON_CLICK_PRIMARY);

  return (
    <button onClick={() => { playClick(); sendTransaction(); }}>
      Send
    </button>
  );
}
```

## Quality Checklist

Before finalizing an audio theme:

- [ ] All sounds play correctly in target browsers
- [ ] Sounds are distinct enough to differentiate
- [ ] Frequent sounds are subtle
- [ ] Success/error sounds have clear emotional distinction
- [ ] Volume levels are balanced across all sounds
- [ ] Sounds work well with and without background music
- [ ] Visual alternatives exist for all audio feedback
- [ ] User can disable sounds in settings
- [ ] Sounds tested on mobile speakers
- [ ] Sounds tested with headphones
- [ ] No sounds conflict with screen readers

## Resources

### Sound Inspiration
- Material Design Sound Guidelines: https://m2.material.io/design/sound/
- Apple Human Interface Guidelines (Sound)
- Microsoft Fluent Design Sound Principles

### Tools
- ElevenLabs Sound Effects: https://elevenlabs.io
- Freesound.org (reference/inspiration)
- AudioJungle (commercial reference)

### Further Reading
- "Designing with Sound" by Amber Case
- "The Sonic Boom" by Joel Beckerman
