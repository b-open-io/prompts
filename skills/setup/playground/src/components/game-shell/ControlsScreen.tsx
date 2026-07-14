"use client";

import type { RefObject } from "react";
import { Kbd } from "@/components/ui/kbd";
import { GAME_INPUT_BINDINGS } from "@/lib/game-input";
import styles from "./game-shell.module.css";

function CornerAccents() {
  return (
    <>
      <span className={`${styles.corner} ${styles.cornerTopLeft}`} />
      <span className={`${styles.corner} ${styles.cornerTopRight}`} />
      <span className={`${styles.corner} ${styles.cornerBottomLeft}`} />
      <span className={`${styles.corner} ${styles.cornerBottomRight}`} />
    </>
  );
}

function KeyboardColumn() {
  return (
    <section className={styles.controlColumn} aria-labelledby="keyboard-title">
      <CornerAccents />
      <h2 id="keyboard-title" className={styles.columnTitle}>
        Keyboard
      </h2>
      <div className={styles.bindingList}>
        {GAME_INPUT_BINDINGS.map((binding) => (
          <div className={styles.bindingRow} key={binding.id}>
            <span className={styles.bindingLabel}>{binding.label}</span>
            <span className={styles.bindingValue}>
              {binding.behavior === "hold" && (
                <span className={styles.qualifier}>Hold</span>
              )}
              {binding.keyboard.map((key) => (
                <Kbd className={styles.keycap} key={key.code}>
                  {key.label}
                </Kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GamepadColumn() {
  return (
    <section className={styles.controlColumn} aria-labelledby="gamepad-title">
      <CornerAccents />
      <h2 id="gamepad-title" className={styles.columnTitle}>
        Gamepad
      </h2>
      <div className={styles.bindingList}>
        {GAME_INPUT_BINDINGS.map((binding) => (
          <div className={styles.bindingRow} key={binding.id}>
            <span className={styles.bindingLabel}>{binding.label}</span>
            <span className={styles.bindingValue}>
              {binding.behavior === "hold" && (
                <span className={styles.qualifier}>Hold</span>
              )}
              {binding.gamepad.map((button) => (
                <span className={styles.gamepadBinding} key={button.button}>
                  <span className={styles.gamepadGlyph} aria-hidden>
                    {button.glyph}
                  </span>
                  <span>{button.label}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export type GameScreenProps = {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  inputMode: "keyboard" | "gamepad";
  onClose: () => void;
};

export function ControlsScreen({
  closeButtonRef,
  inputMode,
  onClose,
}: GameScreenProps) {
  return (
    <div className={styles.screenContent}>
      <header className={styles.screenHeader}>
        <div>
          <p className={styles.eyebrow}>SYSTEM / INPUT REFERENCE</p>
          <h1 id="game-shell-title" className={styles.screenTitle}>
            CONTROLS
          </h1>
        </div>
        <div className={styles.modeReadout} aria-live="polite">
          <span className={styles.statusLight} />
          {inputMode === "gamepad" ? "GAMEPAD ACTIVE" : "KEYBOARD ACTIVE"}
        </div>
      </header>

      <div className={styles.controlGrid}>
        <KeyboardColumn />
        <GamepadColumn />
      </div>

      <footer className={styles.screenFooter}>
        <p>Hold ` anywhere to open this screen.</p>
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          <span aria-hidden>{inputMode === "gamepad" ? "Ⓑ" : "ESC"}</span>
          Close
        </button>
      </footer>
    </div>
  );
}
