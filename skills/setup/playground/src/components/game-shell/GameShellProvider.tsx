"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSound } from "@/components/SoundProvider";
import {
  GameInputProvider,
  useGameInput,
  useHoldAction,
} from "@/lib/game-input";
import styles from "./game-shell.module.css";
import { PatternLayer } from "./PatternLayer";
import { GAME_SCREEN_REGISTRY, type GameScreenId } from "./screen-registry";
import { type ShellPhase, TransitionCanvas } from "./TransitionCanvas";

const SOLIDIFY_MS = 120;
const GROW_MS = 360;
const CLOSE_MS = 400;
const REDUCED_FADE_MS = 160;
const CANCEL_SCATTER_MS = 280;

// Imperative open channel: UI elements (menus, buttons) can open a screen
// without the hold gesture. A window event keeps this decoupled from React
// context — the portal is a sibling of consumers, not an ancestor.
const OPEN_EVENT = "game-shell:open-screen";

export function openGameScreen(id: GameScreenId) {
  window.dispatchEvent(
    new CustomEvent<GameScreenId>(OPEN_EVENT, { detail: id }),
  );
}

const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function GameShellPortal() {
  const { actions, mode } = useGameInput();
  const openControls = useHoldAction("open-controls");
  const { play } = useSound();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<ShellPhase>("idle");
  const [phaseStartedAt, setPhaseStartedAt] = useState(0);
  const [activeScreen, setActiveScreen] = useState<GameScreenId | null>(null);
  const previousOpenCountRef = useRef(openControls.triggerCount);
  const previousCloseCountRef = useRef(actions["close-screen"].triggerCount);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const timerRefs = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timerRefs.current) window.clearTimeout(timer);
    timerRefs.current = [];
  }, []);

  const beginPhase = useCallback((nextPhase: ShellPhase) => {
    setPhaseStartedAt(performance.now());
    setPhase(nextPhase);
  }, []);

  const finishClose = useCallback(() => {
    setPhase("idle");
    setActiveScreen(null);
    previousFocusRef.current?.focus({ preventScroll: true });
    previousFocusRef.current = null;
  }, []);

  const requestClose = useCallback(() => {
    if (!activeScreen || phase === "close") return;
    clearTimers();
    play("DROPDOWN_CLOSE", 0.8);
    beginPhase("close");
    timerRefs.current.push(
      window.setTimeout(
        finishClose,
        reducedMotion ? REDUCED_FADE_MS : CLOSE_MS,
      ),
    );
  }, [
    activeScreen,
    beginPhase,
    clearTimers,
    finishClose,
    phase,
    play,
    reducedMotion,
  ]);

  useEffect(() => setMounted(true), []);

  const openScreen = useCallback(
    (id: GameScreenId) => {
      if (activeScreen) return;
      clearTimers();
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setActiveScreen(id);
      play("DROPDOWN_OPEN", 0.8);

      if (reducedMotion) {
        beginPhase("screen");
        return;
      }

      beginPhase("solidify");
      timerRefs.current.push(
        window.setTimeout(() => beginPhase("grow"), SOLIDIFY_MS),
        window.setTimeout(() => beginPhase("screen"), SOLIDIFY_MS + GROW_MS),
      );
    },
    [activeScreen, beginPhase, clearTimers, play, reducedMotion],
  );

  useEffect(() => {
    if (openControls.triggerCount === previousOpenCountRef.current) return;
    previousOpenCountRef.current = openControls.triggerCount;
    openScreen("controls");
  }, [openControls.triggerCount, openScreen]);

  useEffect(() => {
    const onOpenEvent = (event: Event) => {
      const id = (event as CustomEvent<GameScreenId>).detail;
      if (id in GAME_SCREEN_REGISTRY) openScreen(id);
    };
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => window.removeEventListener(OPEN_EVENT, onOpenEvent);
  }, [openScreen]);

  useEffect(() => {
    const closeCount = actions["close-screen"].triggerCount;
    if (closeCount === previousCloseCountRef.current) return;
    previousCloseCountRef.current = closeCount;
    requestClose();
  }, [actions, requestClose]);

  useEffect(() => {
    if (activeScreen || reducedMotion) return;
    if (openControls.pressed) {
      clearTimers();
      if (phase === "idle") beginPhase("charge");
      return;
    }
    if (phase !== "charge") return;

    timerRefs.current.push(
      window.setTimeout(() => {
        setPhase("idle");
      }, CANCEL_SCATTER_MS),
    );
  }, [
    activeScreen,
    beginPhase,
    clearTimers,
    openControls.pressed,
    phase,
    reducedMotion,
  ]);

  useEffect(() => {
    if (!activeScreen) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [activeScreen]);

  useEffect(() => {
    if (phase !== "screen") return;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (!activeScreen) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hidden);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus, true);
    return () => document.removeEventListener("keydown", trapFocus, true);
  }, [activeScreen]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!mounted) return null;

  const visible = phase !== "idle";
  const showScreen =
    Boolean(activeScreen) && (phase === "screen" || phase === "close");
  const ActiveScreen = activeScreen
    ? GAME_SCREEN_REGISTRY[activeScreen].component
    : null;

  return createPortal(
    <div
      className={styles.root}
      data-game-shell-root
      data-visible={visible}
      data-interactive={Boolean(activeScreen)}
      data-phase={phase}
      data-reduced-motion={reducedMotion}
    >
      <TransitionCanvas
        phase={phase}
        phaseStartedAt={phaseStartedAt}
        chargeProgress={openControls.progress}
        reducedMotion={reducedMotion}
      />
      {showScreen && ActiveScreen && activeScreen && (
        <div className={styles.screenStage}>
          <PatternLayer screenId={activeScreen} />
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-shell-title"
            data-game-shell-screen
            tabIndex={-1}
          >
            <ActiveScreen
              closeButtonRef={closeButtonRef}
              inputMode={mode}
              onClose={requestClose}
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

export function GameShellProvider({ children }: { children: React.ReactNode }) {
  return (
    <GameInputProvider>
      {children}
      <GameShellPortal />
    </GameInputProvider>
  );
}
