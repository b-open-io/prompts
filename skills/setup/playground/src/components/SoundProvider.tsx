"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  HOVER_VOLUME_SCALE,
  resolveChangeSound,
  resolveClickSound,
  resolveHoverTarget,
  SOUND_STORAGE_KEY,
  UI_SOUND_VOLUME,
  UI_SOUNDS,
  type UISoundKey,
} from "@/lib/ui-sounds";

type SoundContextValue = {
  enabled: boolean;
  toggle: () => void;
  play: (key: UISoundKey, volumeScale?: number) => void;
};

const SoundContext = createContext<SoundContextValue>({
  enabled: false,
  toggle: () => {},
  play: () => {},
});

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // Server renders and first client paint use `false`; the stored/derived
  // preference lands in an effect to avoid a hydration mismatch.
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const cacheRef = useRef<Map<UISoundKey, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (stored === "on" || stored === "off") {
      setEnabled(stored === "on");
      return;
    }
    // No stored preference: on by default, but visitors asking the OS to
    // reduce sensory feedback start muted.
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setEnabled(!reducedMotion);
  }, []);

  const play = useCallback((key: UISoundKey, volumeScale = 1) => {
    if (!enabledRef.current) return;
    let audio = cacheRef.current.get(key);
    if (!audio) {
      audio = new Audio(UI_SOUNDS[key]);
      cacheRef.current.set(key, audio);
    }
    audio.volume = UI_SOUND_VOLUME * volumeScale;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay policy or decode failure — sounds are decorative, stay silent.
    });
  }, []);

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
      if (next) {
        // Audible confirmation that sound is back on (play() gates on the ref,
        // which still holds the previous value during this render).
        const audio = new Audio(UI_SOUNDS.TOGGLE_ON);
        audio.volume = UI_SOUND_VOLUME;
        audio.play().catch(() => {});
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const key = resolveClickSound(target);
      if (key) play(key);
    };
    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const key = resolveChangeSound(target as HTMLInputElement);
      if (key) play(key);
    };
    const onSubmit = () => play("NOTIFICATION_INFO");
    const onCopy = () => play("NOTIFICATION_BADGE");
    const onToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) return;
      play(target.open ? "DROPDOWN_OPEN" : "DROPDOWN_CLOSE");
    };
    let lastHovered: unknown = null;
    let lastHoverAt = 0;
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const hoverable = resolveHoverTarget(target);
      if (!hoverable || hoverable === lastHovered) return;
      lastHovered = hoverable;
      // Throttle so sweeping the cursor across a menu doesn't machine-gun.
      const now = performance.now();
      if (now - lastHoverAt < 90) return;
      lastHoverAt = now;
      play("TOOLTIP_SHOW", HOVER_VOLUME_SCALE);
    };
    const preload = () => {
      for (const key of Object.keys(UI_SOUNDS) as UISoundKey[]) {
        if (cacheRef.current.has(key)) continue;
        const audio = new Audio(UI_SOUNDS[key]);
        audio.volume = UI_SOUND_VOLUME;
        audio.preload = "auto";
        cacheRef.current.set(key, audio);
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("copy", onCopy, true);
    // The details `toggle` event doesn't bubble; capture still visits it.
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("pointerdown", preload, {
      capture: true,
      once: true,
    });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("pointerdown", preload, true);
    };
  }, [play]);

  return (
    <SoundContext.Provider value={{ enabled, toggle, play }}>
      {children}
    </SoundContext.Provider>
  );
}
