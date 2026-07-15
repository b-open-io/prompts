#!/usr/bin/env python3
"""
Interactive sound picker for UI audio themes.

Serves a local audition page: every sound slot gets a play button, an editable
generation prompt (pre-filled from the vibe), a "Generate next" button that
produces a fresh candidate via ElevenLabs, and per-candidate "Accept" buttons
that write the winner into the theme directory.

Runs entirely on localhost — no CSP limits, works the same whether the agent
runtime is Claude Code or Codex.

Usage:
    python sound_picker.py --vibe pixel-minimal --output-dir ./audio-theme
    python sound_picker.py --vibe-custom "soft wooden tones" --output-dir ./audio-theme --port 7777
"""

import argparse
import json
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from generate_theme import (
    SOUND_CATEGORIES,
    VIBE_PRESETS,
    build_prompt,
    generate_sound,
    generate_typescript_constants,
    get_api_key,
    require_ffmpeg,
)

PAGE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UI Sound Picker</title>
<style>
  :root { --bg:#190a05; --panel:#241008; --panel-raised:#30160c; --fg:#f4eadf;
          --muted:#8ca9b8; --accent:#f0a238; --blue:#93bfd2; --line:#5b3826;
          --line-bright:#795037; --danger:#ef715b; --shadow:#08030199; }
  * { box-sizing:border-box; }
  body { background:
           radial-gradient(circle at 88% -10%,#6d311622 0,transparent 33rem),
           linear-gradient(90deg,#ffffff05 1px,transparent 1px) 0 0/48px 48px,
           var(--bg);
         color:var(--fg); font-family:"SFMono-Regular","Cascadia Code",Menlo,monospace;
         margin:0; padding:clamp(1rem,2.5vw,2.5rem); font-size:13px; }
  main { width:min(1760px,100%); margin:auto; }
  .masthead { display:grid; grid-template-columns:minmax(260px,.7fr) minmax(420px,1.3fr);
              gap:1.5rem; align-items:end; margin-bottom:1rem; }
  .eyebrow { color:var(--blue); font-size:.7rem; letter-spacing:.18em; text-transform:uppercase; }
  h1 { color:var(--accent); font-size:clamp(1.35rem,2vw,2rem); letter-spacing:.02em;
       margin:.35rem 0 0; }
  h2 { display:flex; align-items:center; gap:.75rem; color:var(--blue); font-size:.72rem;
       letter-spacing:.14em; margin:2rem 0 .65rem; text-transform:uppercase; }
  h2::after { content:""; height:1px; flex:1; background:linear-gradient(90deg,var(--line),transparent); }
  .masthead-copy { color:var(--muted); line-height:1.55; }
  .slot { display:grid; grid-template-columns:minmax(210px,260px) minmax(0,1fr); gap:1rem;
          border:1px solid var(--line); border-radius:8px; padding:.8rem; margin-bottom:.7rem;
          background:linear-gradient(135deg,#2a1209cc,#1d0c06dd); box-shadow:0 10px 24px var(--shadow); }
  .slot-rail { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:.7rem;
               padding:.25rem .25rem .25rem .15rem; min-width:0; }
  .slot-title-row { display:flex; align-items:center; gap:.55rem; width:100%; }
  .slot-name { color:var(--fg); min-width:0; font-weight:700; overflow-wrap:anywhere; }
  .slot-count { margin-left:auto; color:var(--muted); font-size:.68rem; white-space:nowrap; }
  .slot-actions,.candidate-actions,.card-meta { display:flex; align-items:center; gap:.38rem; }
  .slot-actions { flex-wrap:wrap; }
  button,select,summary,input { font:inherit; }
  button,summary { background:#1b0b06; border:1px solid var(--line-bright); color:var(--blue);
                   border-radius:4px; padding:.38rem .62rem; cursor:pointer; }
  button:hover,summary:hover { border-color:var(--accent); color:var(--accent); background:#35170b; }
  button:focus-visible,summary:focus-visible,select:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  button:disabled { opacity:.45; cursor:not-allowed; }
  button svg,summary svg,.status-icon svg { width:14px; height:14px; display:block; stroke:currentColor;
                                           fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .button-with-label { display:inline-flex; align-items:center; gap:.42rem; }
  .icon-button { display:grid; place-items:center; width:30px; height:30px; padding:0; }
  button.accept { border-color:var(--accent); color:var(--accent); }
  button.danger { border-color:var(--danger); color:var(--danger); }
  textarea { width:100%; margin-top:.6rem; background:var(--panel); color:var(--fg);
             border:1px solid var(--line); font:inherit; padding:.5rem; min-height:3.2em; }
  select,input { background:var(--panel); color:var(--fg); border:1px solid var(--line);
                 border-radius:4px; padding:.38rem; }
  select { min-width:0; max-width:150px; }
  .sound-deck { display:grid; grid-template-columns:repeat(auto-fill,minmax(238px,1fr));
                align-items:start; gap:.55rem; min-width:0; }
  .sound-card { position:relative; min-width:0; padding:.58rem; border:1px solid var(--line);
                border-radius:6px; background:#1a0a05; transition:border-color .16s,transform .16s,background .16s; }
  .sound-card:hover { border-color:var(--line-bright); background:#211008; transform:translateY(-1px); }
  .sound-card.selected { border-color:var(--accent); background:linear-gradient(145deg,#32160b,#1b0b06); }
  .card-head { display:flex; align-items:center; justify-content:space-between; gap:.5rem;
               min-height:20px; margin-bottom:.38rem; }
  .candidate-kind { color:var(--muted); font-size:.65rem; letter-spacing:.11em; text-transform:uppercase; }
  .status-icon { display:inline-flex; align-items:center; gap:.3rem; color:var(--muted); font-size:.67rem; }
  .status-icon.selected { color:var(--accent); }
  .status-icon.cross-live { color:var(--blue); }
  .mini-wave-button { position:relative; display:block; width:100%; height:70px; padding:0;
                      overflow:hidden; border-color:var(--line); background:#120704; cursor:pointer; }
  .mini-wave-button:hover { background:#180a05; }
  .mini-wave { display:block; width:100%; height:100%; }
  .edit-cue { position:absolute; right:6px; bottom:5px; display:grid; place-items:center;
              width:22px; height:22px; border:1px solid #ffffff24; border-radius:50%;
              background:#120704cc; color:var(--blue); opacity:0; transform:translateY(3px);
              transition:opacity .16s,transform .16s; pointer-events:none; }
  .edit-cue svg { width:12px; height:12px; }
  .mini-wave-button:hover .edit-cue,.mini-wave-button:focus-visible .edit-cue { opacity:1; transform:none; }
  .candidate-actions { justify-content:space-between; margin-top:.45rem; min-width:0; }
  .assign-controls { position:relative; margin-left:auto; }
  .assign-controls > summary { display:grid; place-items:center; width:30px; height:30px; padding:0;
                               list-style:none; }
  .assign-controls > summary::-webkit-details-marker { display:none; }
  .assign-controls[open] > summary { border-color:var(--accent); color:var(--accent); }
  .assign-popover { position:absolute; z-index:5; right:0; bottom:calc(100% + .4rem); display:flex;
                    gap:.35rem; width:270px; padding:.45rem; border:1px solid var(--line-bright);
                    border-radius:5px; background:#160905; box-shadow:0 16px 34px #000c; }
  .assign-popover select { flex:1; max-width:none; }
  .empty-take { display:grid; place-items:center; min-height:116px; color:var(--muted);
                border:1px dashed var(--line); border-radius:6px; font-size:.72rem; }
  .prompt { position:relative; width:100%; }
  .prompt > summary { display:inline-flex; align-items:center; gap:.38rem; padding:.32rem .5rem;
                      color:var(--muted); list-style:none; }
  .prompt > summary::-webkit-details-marker { display:none; }
  .prompt[open] { position:absolute; z-index:4; width:min(560px,calc(100vw - 3rem));
                  padding:.55rem; border:1px solid var(--line-bright); border-radius:6px;
                  background:#160905; box-shadow:0 18px 40px #000b; }
  .prompt[open] > summary { color:var(--accent); }
  .hint { color:var(--blue); opacity:.75; line-height:1.5; }
  .attention { position:sticky; top:.5rem; z-index:2; display:flex; gap:.45rem; flex-wrap:wrap;
               margin:1rem 0; padding:.55rem .7rem; border:1px solid var(--accent); border-radius:5px;
               background:#190a05ee; box-shadow:0 8px 24px #0008; backdrop-filter:blur(8px); }
  .attention a { color:var(--accent); }
  .attention svg { width:14px; height:14px; flex:0 0 auto; stroke:var(--accent); fill:none;
                   stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
             clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  .audio-editor { width:min(920px,calc(100vw - 2rem)); max-height:calc(100dvh - 2rem);
                  overflow:auto; padding:0; border:1px solid var(--accent); color:var(--fg);
                  background:#140804; box-shadow:0 20px 80px #000b; }
  .audio-editor::backdrop { background:#080301d9; backdrop-filter:blur(3px); }
  .editor-head,.editor-foot,.transport,.timeline { display:flex; align-items:center; gap:.65rem;
                                                   flex-wrap:wrap; }
  .editor-head { justify-content:space-between; padding:1rem 1.1rem; border-bottom:1px solid var(--line); }
  .editor-title { margin:0; color:var(--accent); font-size:1rem; }
  .editor-source { color:var(--blue); font-size:.75rem; }
  .editor-body { padding:1.1rem; }
  .wave-stage { position:relative; height:220px; overflow:hidden; border:1px solid var(--line);
                background:linear-gradient(#160a06,#241008); touch-action:none; cursor:crosshair; }
  #wave-canvas { display:block; width:100%; height:100%; }
  .trim-handle { position:absolute; z-index:3; top:0; bottom:0; width:18px; padding:0; border:0;
                 border-left:3px solid var(--accent); transform:translateX(-1px); cursor:ew-resize; }
  .trim-handle::before { content:""; position:absolute; top:0; left:-3px; width:13px; height:16px;
                         background:var(--accent); clip-path:polygon(0 0,100% 0,0 100%); }
  .trim-handle.end { transform:translateX(-15px); border-left:0; border-right:3px solid var(--accent); }
  .trim-handle.end::before { left:auto; right:-3px; clip-path:polygon(0 0,100% 0,100% 100%); }
  .trim-handle:focus-visible { outline:2px solid var(--fg); outline-offset:-5px; }
  .playhead { position:absolute; z-index:2; top:0; bottom:0; width:1px; background:var(--fg);
              pointer-events:none; opacity:.8; }
  .timeline { justify-content:space-between; margin-top:.45rem; color:var(--blue); font-size:.74rem; }
  .transport { margin:1rem 0; }
  .transport .readout { margin-left:auto; color:var(--accent); font-variant-numeric:tabular-nums; }
  .effect-grid { display:grid; grid-template-columns:repeat(2,minmax(240px,1fr)); gap:.8rem 1.4rem;
                 padding:1rem; border:1px solid var(--line); background:var(--panel); }
  .effect { display:grid; grid-template-columns:minmax(95px,auto) 1fr 64px; align-items:center; gap:.65rem; }
  .effect label { color:var(--blue); }
  .effect output { color:var(--fg); text-align:right; font-variant-numeric:tabular-nums; }
  input[type="range"] { width:100%; padding:0; accent-color:var(--accent); cursor:pointer; }
  .editor-note { margin:.8rem 0 0; color:var(--blue); font-size:.72rem; opacity:.8; }
  .editor-foot { justify-content:flex-end; padding:1rem 1.1rem; border-top:1px solid var(--line); }
  .editor-foot .spacer { flex:1; }
  .loading-wave { display:grid; place-items:center; height:100%; color:var(--blue); }
  @media (max-width:700px) {
    body { padding:.75rem; }
    .masthead,.slot { grid-template-columns:1fr; }
    .masthead { gap:.65rem; }
    .slot-rail { flex-direction:row; flex-wrap:wrap; align-items:center; }
    .slot-title-row { width:auto; flex:1 1 180px; }
    .sound-deck { grid-template-columns:1fr; }
    .wave-stage { height:170px; }
    .effect-grid { grid-template-columns:1fr; }
  }
</style>
</head>
<body>
<main>
<header class="masthead">
  <div><div class="eyebrow">UI audio / theme workbench</div><h1>Sound map</h1></div>
  <div class="masthead-copy"><span id="vibe"></span><br>Waveforms open the editor · playback 30% · every edit is a reversible revision.</div>
</header>
<div id="attention" class="attention"></div>
<div id="slots"></div>
</main>
<dialog id="audio-editor" class="audio-editor" aria-labelledby="editor-title">
  <header class="editor-head">
    <div>
      <h2 id="editor-title" class="editor-title">WAVEFORM EDITOR</h2>
      <div id="editor-source" class="editor-source"></div>
    </div>
    <button type="button" onclick="closeEditor()" aria-label="Close waveform editor">close</button>
  </header>
  <div class="editor-body">
    <div id="wave-stage" class="wave-stage">
      <canvas id="wave-canvas" aria-label="Audio waveform"></canvas>
      <button id="trim-start-handle" class="trim-handle" type="button"
              aria-label="Trim start. Use left and right arrow keys to adjust."></button>
      <button id="trim-end-handle" class="trim-handle end" type="button"
              aria-label="Trim end. Use left and right arrow keys to adjust."></button>
      <div id="playhead" class="playhead"></div>
    </div>
    <div class="timeline">
      <span>drag orange handles to trim · click waveform to seek</span>
      <output id="trim-readout">0 ms — 0 ms</output>
    </div>
    <div class="transport">
      <button id="editor-play" type="button" onclick="toggleEditorPlayback()">▶ play selection</button>
      <button type="button" onclick="stopEditorPlayback()">■ stop</button>
      <span class="readout" id="time-readout">0.000 / 0.000 s</span>
    </div>
    <div class="effect-grid">
      <div class="effect"><label for="edit-attack">Fade in</label><input id="edit-attack" data-edit="attackMs" type="range" min="0" max="250" step="1" value="0"><output>0 ms</output></div>
      <div class="effect"><label for="edit-release">Fade out</label><input id="edit-release" data-edit="releaseMs" type="range" min="0" max="250" step="1" value="0"><output>0 ms</output></div>
      <div class="effect"><label for="edit-gain">Volume</label><input id="edit-gain" data-edit="gainDb" type="range" min="-18" max="6" step="0.5" value="0"><output>0 dB</output></div>
      <div class="effect"><label for="edit-reverb">Reverb</label><input id="edit-reverb" data-edit="reverbPercent" type="range" min="0" max="40" step="1" value="0"><output>0%</output></div>
      <div class="effect"><label for="edit-delay">Delay time</label><input id="edit-delay" data-edit="delayMs" type="range" min="20" max="500" step="5" value="120"><output>120 ms</output></div>
      <div class="effect"><label for="edit-delay-mix">Delay amount</label><input id="edit-delay-mix" data-edit="delayMixPercent" type="range" min="0" max="40" step="1" value="0"><output>0%</output></div>
    </div>
    <p class="editor-note">Effects are rendered into a new revision. The source and accepted theme file remain unchanged.</p>
  </div>
  <footer class="editor-foot">
    <button type="button" onclick="resetEditor()">reset edits</button>
    <span class="spacer"></span>
    <button type="button" onclick="closeEditor()">cancel</button>
    <button id="save-revision" class="accept" type="button" onclick="saveEditorRevision(this)">save as new revision</button>
  </footer>
</dialog>
<script>
const VOL = 0.3;
let targets = [];
let currentByName = {};
let candidateIndex = 0;
const editor = { sound:null, url:null, audio:null, buffer:null, durationMs:0,
  selectionStartMs:0, selectionEndMs:0, drag:null, animationFrame:0 };
const editDefaults = { attackMs:0, releaseMs:0, gainDb:0, reverbPercent:0,
  delayMs:120, delayMixPercent:0 };
const esc = (value) => String(value).replace(/[&<>\"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const icons = {
  play:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>`,
  spark:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9Z"/><path d="m19 15 .7 2.2L22 18l-2.3.8L19 21l-.7-2.2L16 18l2.3-.8Z"/></svg>`,
  sliders:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>`,
  check:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`,
  route:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3"/></svg>`,
  arrow:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`,
};
const waveformCache = new Map();
let miniWaveObserver = null;
function play(url, scale=1) {
  const audio = new Audio(url + "?t=" + Date.now());
  audio.volume = VOL * scale;
  audio.play().catch(() => {});
}
async function post(path, payload) {
  const res = await fetch(path, { method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
async function state() { return (await fetch("/api/state")).json(); }
function formatSeconds(ms) { return (ms / 1000).toFixed(3); }
async function waveformPeaks(url) {
  if (!waveformCache.has(url)) {
    waveformCache.set(url, (async () => {
      const response = await fetch(url + "?mini=" + Date.now());
      if (!response.ok) throw new Error(`Could not load waveform (${response.status})`);
      const encoded = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const buffer = await context.decodeAudioData(encoded);
      await context.close();
      const data = buffer.getChannelData(0);
      const bucketCount = 220;
      const peaks = new Float32Array(bucketCount);
      for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        const start = Math.floor(bucket * data.length / bucketCount);
        const end = Math.max(start + 1, Math.floor((bucket + 1) * data.length / bucketCount));
        let peak = 0;
        for (let index = start; index < end; index += 1) peak = Math.max(peak, Math.abs(data[index]));
        peaks[bucket] = peak;
      }
      return peaks;
    })());
  }
  return waveformCache.get(url);
}
function paintMiniWaveform(canvas, peaks) {
  if (!canvas.isConnected) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, rect.width, rect.height);
  const selected = canvas.closest(".sound-card")?.classList.contains("selected");
  const middle = rect.height / 2;
  context.strokeStyle = selected ? "#f0a238" : "#93bfd2";
  context.globalAlpha = selected ? .96 : .78;
  context.lineWidth = 1;
  const bars = Math.min(peaks.length, Math.floor(rect.width / 2));
  for (let bar = 0; bar < bars; bar += 1) {
    const peak = peaks[Math.floor(bar * peaks.length / bars)];
    const x = (bar + .5) * rect.width / bars;
    const height = Math.max(1.5, peak * rect.height * .78);
    context.beginPath();
    context.moveTo(x, middle - height / 2);
    context.lineTo(x, middle + height / 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}
async function loadMiniWaveform(canvas) {
  if (canvas.dataset.loaded === "true") return;
  canvas.dataset.loaded = "true";
  try { paintMiniWaveform(canvas, await waveformPeaks(canvas.dataset.url)); }
  catch { canvas.dataset.loaded = "error"; }
}
function observeMiniWaveforms() {
  miniWaveObserver?.disconnect();
  miniWaveObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      miniWaveObserver.unobserve(entry.target);
      loadMiniWaveform(entry.target);
    }
  }, { rootMargin:"400px 0px" });
  for (const canvas of document.querySelectorAll("canvas.mini-wave")) miniWaveObserver.observe(canvas);
}
function drawWaveform() {
  const canvas = document.getElementById("wave-canvas");
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, rect.width, rect.height);
  context.fillStyle = "#160a06";
  context.fillRect(0, 0, rect.width, rect.height);
  if (!editor.buffer) {
    context.fillStyle = "#8cb4cb";
    context.font = "13px ui-monospace, Menlo, monospace";
    context.fillText("decoding waveform…", 18, rect.height / 2);
    return;
  }
  const data = editor.buffer.getChannelData(0);
  const middle = rect.height / 2;
  const bucket = Math.max(1, Math.floor(data.length / rect.width));
  const startX = rect.width * editor.selectionStartMs / editor.durationMs;
  const endX = rect.width * editor.selectionEndMs / editor.durationMs;
  context.lineWidth = 1;
  for (let x = 0; x < rect.width; x += 1) {
    const offset = Math.floor(x * data.length / rect.width);
    let min = 1;
    let max = -1;
    for (let index = offset; index < Math.min(data.length, offset + bucket); index += 1) {
      min = Math.min(min, data[index]);
      max = Math.max(max, data[index]);
    }
    const active = x >= startX && x <= endX;
    const peak = Math.max(Math.abs(min), Math.abs(max));
    context.strokeStyle = active ? "#e38f1a" : "#5a3a28";
    context.beginPath();
    context.moveTo(x + .5, middle - peak * middle * .86);
    context.lineTo(x + .5, middle + peak * middle * .86);
    context.stroke();
  }
  context.strokeStyle = "#8cb4cb55";
  context.beginPath();
  context.moveTo(0, middle + .5);
  context.lineTo(rect.width, middle + .5);
  context.stroke();
}
function updateEditorUI() {
  if (!editor.durationMs) return;
  const startPercent = 100 * editor.selectionStartMs / editor.durationMs;
  const endPercent = 100 * editor.selectionEndMs / editor.durationMs;
  document.getElementById("trim-start-handle").style.left = `${startPercent}%`;
  document.getElementById("trim-end-handle").style.left = `${endPercent}%`;
  document.getElementById("trim-readout").textContent =
    `${formatSeconds(editor.selectionStartMs)} s — ${formatSeconds(editor.selectionEndMs)} s · ` +
    `${formatSeconds(editor.selectionEndMs - editor.selectionStartMs)} s selected`;
  const currentMs = editor.audio ? editor.audio.currentTime * 1000 : editor.selectionStartMs;
  document.getElementById("playhead").style.left = `${100 * currentMs / editor.durationMs}%`;
  document.getElementById("time-readout").textContent =
    `${formatSeconds(currentMs)} / ${formatSeconds(editor.durationMs)} s`;
  drawWaveform();
}
function setTrim(handle, absoluteMs) {
  if (handle === "start") {
    editor.selectionStartMs = Math.max(0, Math.min(absoluteMs, editor.selectionEndMs - 40));
  } else {
    editor.selectionEndMs = Math.min(editor.durationMs,
      Math.max(absoluteMs, editor.selectionStartMs + 40));
  }
  if (editor.audio) {
    editor.audio.pause();
    editor.audio.currentTime = editor.selectionStartMs / 1000;
  }
  document.getElementById("editor-play").textContent = "▶ play selection";
  const maxFade = Math.floor((editor.selectionEndMs - editor.selectionStartMs) * .45);
  document.getElementById("edit-attack").max = Math.min(1000, maxFade);
  document.getElementById("edit-release").max = Math.min(1000, maxFade);
  updateEditorUI();
}
function pointerTime(event) {
  const rect = document.getElementById("wave-stage").getBoundingClientRect();
  return Math.max(0, Math.min(editor.durationMs,
    (event.clientX - rect.left) / rect.width * editor.durationMs));
}
function beginTrimDrag(handle, event) {
  event.preventDefault();
  event.stopPropagation();
  editor.drag = handle;
  event.currentTarget.setPointerCapture(event.pointerId);
}
function moveTrimDrag(event) {
  if (editor.drag) setTrim(editor.drag, pointerTime(event));
}
function endTrimDrag(event) {
  if (!editor.drag) return;
  editor.drag = null;
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}
function adjustTrimWithKey(handle, event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" ? -1 : 1;
  const step = event.shiftKey ? 25 : 5;
  setTrim(handle, (handle === "start" ? editor.selectionStartMs : editor.selectionEndMs) + direction * step);
}
function seekEditor(event) {
  if (!editor.audio || editor.drag) return;
  const time = Math.max(editor.selectionStartMs,
    Math.min(editor.selectionEndMs, pointerTime(event)));
  editor.audio.currentTime = time / 1000;
  updateEditorUI();
}
function updateControlOutput(input) {
  const unit = input.dataset.edit === "gainDb" ? " dB"
    : input.dataset.edit === "reverbPercent" || input.dataset.edit === "delayMixPercent" ? "%"
    : " ms";
  input.nextElementSibling.textContent = `${input.value}${unit}`;
}
function resetEditor(redraw=true) {
  editor.selectionStartMs = 0;
  editor.selectionEndMs = editor.durationMs;
  for (const input of document.querySelectorAll("[data-edit]")) {
    input.value = editDefaults[input.dataset.edit];
    updateControlOutput(input);
  }
  if (editor.audio) editor.audio.currentTime = 0;
  if (redraw) updateEditorUI();
}
async function openEditor(sound, url, label) {
  stopEditorPlayback();
  editor.sound = sound;
  editor.url = url;
  editor.buffer = null;
  editor.durationMs = 0;
  document.getElementById("editor-source").textContent = `${sound} · ${label}`;
  const dialog = document.getElementById("audio-editor");
  if (!dialog.open) dialog.showModal();
  drawWaveform();
  try {
    const response = await fetch(url + "?wave=" + Date.now());
    if (!response.ok) throw new Error(`Could not load audio (${response.status})`);
    const encoded = await response.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    editor.buffer = await context.decodeAudioData(encoded);
    await context.close();
    editor.durationMs = Math.round(editor.buffer.duration * 1000);
    editor.audio = new Audio(url + "?edit=" + Date.now());
    editor.audio.volume = VOL;
    editor.audio.addEventListener("ended", stopEditorPlayback);
    resetEditor(false);
    setTrim("end", editor.durationMs);
  } catch (error) {
    alert(error.message);
    closeEditor();
  }
}
function closeEditor() {
  stopEditorPlayback();
  const dialog = document.getElementById("audio-editor");
  if (dialog.open) dialog.close();
}
function playbackFrame() {
  if (!editor.audio || editor.audio.paused) return;
  if (editor.audio.currentTime * 1000 >= editor.selectionEndMs) {
    stopEditorPlayback();
    return;
  }
  updateEditorUI();
  editor.animationFrame = requestAnimationFrame(playbackFrame);
}
async function toggleEditorPlayback() {
  if (!editor.audio) return;
  if (!editor.audio.paused) {
    editor.audio.pause();
    document.getElementById("editor-play").textContent = "▶ play selection";
    cancelAnimationFrame(editor.animationFrame);
    return;
  }
  const currentMs = editor.audio.currentTime * 1000;
  if (currentMs < editor.selectionStartMs || currentMs >= editor.selectionEndMs) {
    editor.audio.currentTime = editor.selectionStartMs / 1000;
  }
  try {
    await editor.audio.play();
    document.getElementById("editor-play").textContent = "Ⅱ pause";
    editor.animationFrame = requestAnimationFrame(playbackFrame);
  } catch {}
}
function stopEditorPlayback() {
  cancelAnimationFrame(editor.animationFrame);
  if (editor.audio) {
    editor.audio.pause();
    editor.audio.currentTime = editor.selectionStartMs / 1000;
  }
  const button = document.getElementById("editor-play");
  if (button) button.textContent = "▶ play selection";
  if (editor.durationMs) updateEditorUI();
}
function editorValues() {
  const values = { trimStartMs:Math.round(editor.selectionStartMs),
    trimEndMs:Math.round(editor.durationMs - editor.selectionEndMs) };
  for (const input of document.querySelectorAll("[data-edit]")) {
    values[input.dataset.edit] = Number(input.value);
  }
  return values;
}
async function saveEditorRevision(button) {
  button.disabled = true; button.textContent = "rendering revision…";
  try {
    const data = await post("/api/edit", { sound:editor.sound, url:editor.url, edits:editorValues() });
    closeEditor();
    await render();
    play(data.candidate.url);
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; button.textContent = "save as new revision"; }
}
async function render(preserveSlot=null) {
  const previousAnchor = preserveSlot ? document.getElementById(`slot-${preserveSlot}`) : null;
  const previousTop = previousAnchor?.getBoundingClientRect().top;
  const s = await state();
  candidateIndex = 0;
  targets = s.targets;
  currentByName = Object.fromEntries(s.slots.map((slot) => [slot.name, Boolean(slot.current)]));
  const missing = s.slots.filter((slot) => !slot.current);
  document.getElementById("attention").innerHTML = missing.length
    ? `${icons.route}<span>Unmapped:</span>${missing.map((slot) => `<a href="#slot-${slot.name}">${slot.name}</a>`).join(" · ")}`
    : `${icons.check}<span>Every event is mapped.</span>`;
  document.getElementById("vibe").textContent = s.vibe;
  const root = document.getElementById("slots");
  root.innerHTML = "";
  let lastCategory = "";
  for (const slot of s.slots) {
    if (slot.category !== lastCategory) {
      lastCategory = slot.category;
      const heading = document.createElement("h2");
      heading.textContent = slot.category;
      root.appendChild(heading);
    }
    const div = document.createElement("section");
    div.className = "slot";
    div.id = `slot-${slot.name}`;
    const candidateCount = slot.candidates.length;
    const currentKind = slot.current_origin?.kind || "legacy file";
    const currentLabel = ["current", "legacy file"].includes(currentKind) ? "existing" : currentKind;
    const selectedCandidate = slot.candidates.find((candidate) =>
      (candidate.accepted_in || []).includes(slot.name));
    const currentCard = slot.current && !selectedCandidate ? `<article class="sound-card selected">
      <header class="card-head"><span class="candidate-kind">${esc(currentLabel)}</span>
        <span class="status-icon selected" title="Selected for ${esc(slot.name)}">${icons.check}<span class="sr-only">Selected</span></span></header>
      <button class="mini-wave-button" onclick="openEditor('${slot.name}','${slot.current}','selected sound')" title="Edit selected waveform">
        <canvas class="mini-wave" data-url="${slot.current}" aria-hidden="true"></canvas>
        <span class="edit-cue">${icons.sliders}</span><span class="sr-only">Edit selected waveform</span></button>
      <div class="candidate-actions"><button class="icon-button" onclick="play('${slot.current}')" title="Preview selected sound" aria-label="Preview selected sound">${icons.play}</button></div>
    </article>` : "";
    div.innerHTML = `<aside class="slot-rail"><div class="slot-title-row">
        <span class="slot-name">${esc(slot.name)}</span><span id="count-${slot.name}" class="slot-count">${candidateCount} take${candidateCount === 1 ? "" : "s"}</span></div>
      <div class="slot-actions"><button id="gen-${slot.name}" class="button-with-label" onclick="generateCandidate('${slot.name}',this)">${icons.spark}<span>Generate</span></button>
      <details class="prompt"><summary title="Edit generation prompt">${icons.sliders}<span>Prompt</span></summary>
        <textarea id="prompt-${slot.name}" aria-label="Generation prompt for ${esc(slot.name)}">${esc(slot.prompt)}</textarea>
      </details></div></aside>
      <div class="sound-deck" id="candidates-${slot.name}">${currentCard}</div>`;
    root.appendChild(div);
    const orderedCandidates = [...slot.candidates].sort((left, right) =>
      Number((right.accepted_in || []).includes(slot.name)) - Number((left.accepted_in || []).includes(slot.name)));
    for (const candidate of orderedCandidates) addCandidate(slot.name, candidate);
    if (!slot.current && candidateCount === 0) {
      document.getElementById("candidates-" + slot.name).innerHTML =
        `<div class="empty-take">No takes yet · generate the first</div>`;
    }
  }
  observeMiniWaveforms();
  if (preserveSlot && Number.isFinite(previousTop)) {
    const nextAnchor = document.getElementById(`slot-${preserveSlot}`);
    if (nextAnchor) window.scrollBy(0, nextAnchor.getBoundingClientRect().top - previousTop);
  }
}
function targetOptions(source) {
  return `<option value="">assign to…</option>` + targets
    .filter((target) => target.name !== source)
    .map((target) => `<option value="${target.name}">${target.category} / ${target.name}</option>`).join("");
}
function addCandidate(source, candidate) {
  const id = `candidate-${++candidateIndex}`;
  const wrap = document.getElementById("candidates-" + source);
  const el = document.createElement("article");
  el.dataset.candidate = "true";
  el.dataset.url = candidate.url;
  const kind = ["revision", "history"].includes(candidate.kind) ? candidate.kind : "generated";
  const acceptedIn = candidate.accepted_in || [];
  const acceptedHere = acceptedIn.includes(source);
  const otherLive = acceptedIn.filter((name) => name !== source);
  const liveElsewhere = otherLive.length ? `<span class="status-icon cross-live" title="Also selected for ${otherLive.map(esc).join(", ")}">${icons.route}<span>${otherLive.length}</span></span>` : "";
  el.className = `sound-card${acceptedHere ? " selected" : ""}`;
  el.innerHTML = `<header class="card-head"><span class="candidate-kind">${kind}</span><div class="card-meta">
      ${liveElsewhere}${acceptedHere ? `<span class="status-icon selected" title="Selected for ${esc(source)}">${icons.check}<span class="sr-only">Selected</span></span>` : ""}</div></header>
    <button class="mini-wave-button" onclick="openEditor('${source}','${candidate.url}','${kind} take')" title="Edit ${kind} waveform">
      <canvas class="mini-wave" data-url="${candidate.url}" aria-hidden="true"></canvas>
      <span class="edit-cue">${icons.sliders}</span><span class="sr-only">Edit ${kind} waveform</span></button>
    <div class="candidate-actions">
      <button class="icon-button" onclick="play('${candidate.url}')" title="Preview" aria-label="Preview ${kind} take">${icons.play}</button>
      ${acceptedHere ? "" : `<button class="button-with-label accept" onclick="acceptCandidate('${source}','${candidate.url}',this)">${icons.check}<span>Use</span></button>`}
      <details class="assign-controls"><summary title="Assign to another event" aria-label="Assign to another event">${icons.route}</summary>
        <div class="assign-popover"><select id="${id}-target" aria-label="Assign take to another event">${targetOptions(source)}</select>
        <button class="icon-button" onclick="assignCandidate('${source}','${candidate.url}','${id}')" title="Assign to selected event" aria-label="Assign to selected event">${icons.arrow}</button></div></details>
      <button class="icon-button danger" onclick="deleteCandidate('${candidate.url}')" title="Delete take" aria-label="Delete ${kind} take">${icons.trash}</button></div>`;
  wrap.appendChild(el);
}
function updateTakeCount(source) {
  const wrap = document.getElementById("candidates-" + source);
  wrap.querySelector(".empty-take")?.remove();
  const count = wrap.querySelectorAll("[data-candidate='true']").length;
  document.getElementById("count-" + source).textContent = `${count} take${count === 1 ? "" : "s"}`;
}
async function generateCandidate(name, button) {
  button.disabled = true; button.textContent = "generating…";
  try {
    const prompt = document.getElementById("prompt-" + name).value;
    const data = await post("/api/generate", { sound:name, prompt });
    addCandidate(name, data.candidate);
    updateTakeCount(name);
    observeMiniWaveforms();
    play(data.candidate.url);
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; button.innerHTML = `${icons.spark}<span>Generate</span>`; }
}
async function acceptCandidate(name, url, button) {
  try {
    await post("/api/accept", { sound:name, url });
    await render(name);
  } catch (error) { alert(error.message); }
}
async function assignCandidate(source, url, id) {
  const target = document.getElementById(id + "-target").value;
  if (!target) return;
  if (currentByName[target] && !confirm(`Replace the accepted ${target} sound with this candidate?`)) return;
  try {
    await post("/api/accept", { sound:target, url });
    await render(source);
  } catch (error) { alert(error.message); }
}
async function deleteCandidate(url) {
  if (!confirm("Delete this candidate and any revisions derived from it? Accepted theme files are preserved.")) return;
  const card = document.querySelector(`[data-url="${CSS.escape(url)}"]`);
  const source = card?.closest(".slot")?.id.replace("slot-", "") || null;
  try { await post("/api/delete", { url, cascade:true }); await render(source); }
  catch (error) { alert(error.message); }
}
for (const input of document.querySelectorAll("[data-edit]")) {
  input.addEventListener("input", () => updateControlOutput(input));
}
for (const [id, handle] of [["trim-start-handle","start"],["trim-end-handle","end"]]) {
  const element = document.getElementById(id);
  element.addEventListener("pointerdown", (event) => beginTrimDrag(handle, event));
  element.addEventListener("pointermove", moveTrimDrag);
  element.addEventListener("pointerup", endTrimDrag);
  element.addEventListener("pointercancel", endTrimDrag);
  element.addEventListener("keydown", (event) => adjustTrimWithKey(handle, event));
}
document.getElementById("wave-stage").addEventListener("pointerdown", seekEditor);
document.getElementById("audio-editor").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeEditor();
});
new ResizeObserver(() => { if (editor.durationMs) updateEditorUI(); }).observe(
  document.getElementById("wave-stage"),
);
render();
</script>
</body>
</html>
"""

EDIT_LIMITS = {
    "trimStartMs": (0.0, 2_000.0),
    "trimEndMs": (0.0, 2_000.0),
    "attackMs": (0.0, 1_000.0),
    "releaseMs": (0.0, 1_000.0),
    "gainDb": (-18.0, 6.0),
    "reverbPercent": (0.0, 40.0),
    "delayMs": (0.0, 500.0),
    "delayMixPercent": (0.0, 40.0),
}


def _number(edits: dict, name: str) -> float:
    value = edits.get(name, 0)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    value = float(value)
    low, high = EDIT_LIMITS[name]
    if not low <= value <= high:
        raise ValueError(f"{name} must be between {low:g} and {high:g}")
    return value


def validate_edits(edits: dict, duration_ms: int) -> dict:
    """Parse bounded numeric edit values; never pass request text to ffmpeg."""
    if not isinstance(edits, dict):
        raise ValueError("edits must be an object")
    parsed = {name: _number(edits, name) for name in EDIT_LIMITS}
    remaining = duration_ms - parsed["trimStartMs"] - parsed["trimEndMs"]
    if remaining < 40:
        raise ValueError("trim must leave at least 40 ms of audio")
    if parsed["attackMs"] + parsed["releaseMs"] > remaining * 0.9:
        raise ValueError("attack plus release must fit within 90% of the trimmed clip")
    if parsed["delayMixPercent"] > 0 and parsed["delayMs"] < 20:
        raise ValueError("delay must be at least 20 ms when delay mix is enabled")
    return parsed


def probe_duration_ms(path: Path) -> int:
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if probe.returncode != 0:
        raise ValueError(f"could not read audio duration: {probe.stderr.strip()}")
    try:
        duration_ms = round(float(probe.stdout.strip()) * 1_000)
    except ValueError as error:
        raise ValueError("could not read audio duration") from error
    if not 20 <= duration_ms <= 30_000:
        raise ValueError("source audio must be between 20 ms and 30 seconds")
    return duration_ms


def build_audio_filter(edits: dict, duration_ms: int) -> tuple[str, dict]:
    """Build a deterministic short-UI-sound filter chain."""
    values = validate_edits(edits, duration_ms)
    start = values["trimStartMs"] / 1_000
    kept_ms = duration_ms - values["trimStartMs"] - values["trimEndMs"]
    kept = kept_ms / 1_000
    filters = [f"atrim=start={start:.4f}:duration={kept:.4f}", "asetpts=PTS-STARTPTS"]
    if values["gainDb"]:
        filters.append(f"volume={values['gainDb']:.2f}dB")
    if values["reverbPercent"]:
        wet = values["reverbPercent"] / 100
        filters.append(f"aecho=0.82:{wet:.3f}:35:{0.18 + wet * 0.7:.3f}")
    if values["delayMixPercent"]:
        wet = values["delayMixPercent"] / 100
        filters.append(
            f"aecho=0.85:{wet:.3f}:{values['delayMs']:.1f}:{0.20 + wet * 0.6:.3f}"
        )
    if values["attackMs"]:
        filters.append(f"afade=t=in:st=0:d={values['attackMs'] / 1_000:.4f}:curve=qsin")
    if values["releaseMs"]:
        release = values["releaseMs"] / 1_000
        filters.append(
            f"afade=t=out:st={max(0, kept - release):.4f}:d={release:.4f}:curve=qsin"
        )
    # Leave MP3 headroom and do not auto-level; intentional gain reductions
    # must survive the edit.
    filters.append("alimiter=limit=0.7943:attack=1:release=25:level=false")
    return ",".join(filters), values


def _metadata_path(path: Path) -> Path:
    return path.with_suffix(".json")


def _read_metadata(path: Path) -> dict:
    metadata_path = _metadata_path(path)
    if not metadata_path.exists():
        return {}
    try:
        value = json.loads(metadata_path.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_metadata(path: Path, metadata: dict) -> None:
    _metadata_path(path).write_text(json.dumps(metadata, indent=2))


class PickerState:
    def __init__(self, vibe: str, output_dir: Path, categories):
        self.vibe = vibe
        self.output_dir = output_dir
        self.categories = categories or list(SOUND_CATEGORIES.keys())
        self.candidate_dir = output_dir / ".picker"
        self.candidate_dir.mkdir(parents=True, exist_ok=True)
        self.prompts = {}
        self.counter = 0
        self.lock = threading.RLock()

    @property
    def manifest_path(self) -> Path:
        return self.output_dir / "theme.json"

    def manifest(self) -> dict:
        if not self.manifest_path.exists():
            return {
                "name": "custom",
                "version": "1.0.0",
                "vibe": self.vibe,
                "sounds": {},
            }
        manifest_text = ""
        try:
            manifest_text = self.manifest_path.read_text()
            value = json.loads(manifest_text)
            return value if isinstance(value, dict) else {"sounds": {}}
        except (OSError, json.JSONDecodeError):
            # A pre-atomic picker could leave a complete JSON object followed
            # by trailing bytes if two accepts landed together. Recover only
            # that complete prefix; subsequent atomic writes clean the file.
            try:
                value, _end = json.JSONDecoder().raw_decode(manifest_text)
                return value if isinstance(value, dict) else {"sounds": {}}
            except (NameError, json.JSONDecodeError):
                return {"sounds": {}}

    def targets(self) -> list[dict]:
        return [
            {"name": name, "category": category}
            for category, sounds in SOUND_CATEGORIES.items()
            for name in sounds
        ]

    def _url_for(self, path: Path) -> str:
        return f"/files/{path.relative_to(self.output_dir).as_posix()}"

    def _resolve_url(self, url: str) -> Path:
        if not isinstance(url, str) or not url.startswith("/files/"):
            raise ValueError("Invalid audio URL")
        path = (self.output_dir / url.removeprefix("/files/")).resolve()
        root = self.output_dir.resolve()
        if not path.is_file() or root not in path.parents or path.suffix.lower() != ".mp3":
            raise ValueError(f"Audio file not found: {url}")
        return path

    def _candidate_record(self, sound: str, path: Path, manifest: dict | None = None) -> dict:
        metadata = _read_metadata(path)
        url = self._url_for(path)
        manifest = manifest if manifest is not None else self.manifest()
        sounds = manifest.get("sounds", {}) if isinstance(manifest, dict) else {}
        accepted_in = [
            name
            for name, entry in sounds.items()
            if isinstance(entry, dict)
            and isinstance(entry.get("accepted_from"), dict)
            and entry["accepted_from"].get("url") == url
        ]
        return {
            "url": url,
            "kind": metadata.get("kind", "generated"),
            "source_slot": metadata.get("source_slot", sound),
            "prompt": metadata.get("prompt"),
            "parent_url": metadata.get("parent_url"),
            "edits": metadata.get("edits"),
            "accepted_in": accepted_in,
        }

    def _candidate_records(self, sound: str) -> list[dict]:
        directory = self.candidate_dir / sound
        if not directory.exists():
            return []
        manifest = self.manifest()
        records = []
        for path in sorted(directory.glob("*.mp3"), key=lambda item: item.stat().st_mtime):
            if _read_metadata(path).get("deleted"):
                continue
            records.append(self._candidate_record(sound, path, manifest))
        return records

    def slot_info(self, category: str, name: str, config: dict) -> dict:
        current = self.output_dir / category / f"{name}.mp3"
        entry = self.manifest().get("sounds", {}).get(name, {})
        return {
            "name": name,
            "category": category,
            "prompt": self.prompts.get(name)
            or entry.get("prompt")
            or build_prompt(self.vibe, config["modifier"]),
            "current": f"/files/{category}/{name}.mp3" if current.exists() else None,
            "current_origin": entry.get("accepted_from")
            if isinstance(entry.get("accepted_from"), dict)
            else None,
            "candidates": self._candidate_records(name),
        }

    def slots(self):
        out = []
        for category, sounds in SOUND_CATEGORIES.items():
            if category not in self.categories:
                continue
            for name, config in sounds.items():
                out.append(self.slot_info(category, name, config))
        return out

    def sound_config(self, sound: str):
        for category, sounds in SOUND_CATEGORIES.items():
            if sound in sounds:
                return category, sounds[sound]
        return None, None

    def generate_candidate(self, sound: str, prompt: str) -> dict:
        category, config = self.sound_config(sound)
        if config is None:
            return {"error": f"Unknown sound: {sound}"}
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4_000:
            return {"error": "Prompt must be between 1 and 4000 characters"}
        self.prompts[sound] = prompt
        self.counter += 1
        out = self.candidate_dir / sound / f"cand-{int(time.time())}-{self.counter}.mp3"
        result = generate_sound(
            api_key=get_api_key(),
            prompt=prompt,
            duration_seconds=config["duration"],
            output_path=out,
            normalize=True,
        )
        if not result.success:
            return {"error": result.error or "generation failed"}
        _write_metadata(
            out,
            {
                "kind": "generated",
                "source_slot": sound,
                "prompt": prompt,
                "parent_url": None,
                "edits": None,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )
        return {"candidate": self._candidate_record(sound, out)}

    def _source_metadata(self, source: Path, url: str, fallback_sound: str) -> dict:
        metadata = _read_metadata(source)
        if metadata:
            return metadata
        entry = self.manifest().get("sounds", {}).get(fallback_sound, {})
        return {
            "kind": "current",
            "source_slot": fallback_sound,
            "prompt": entry.get("prompt") or self.prompts.get(fallback_sound),
            "parent_url": url,
            "edits": entry.get("edits"),
        }

    def edit_candidate(self, sound: str, url: str, edits: dict) -> dict:
        _category, config = self.sound_config(sound)
        if config is None:
            return {"error": f"Unknown sound: {sound}"}
        try:
            source = self._resolve_url(url)
            duration_ms = probe_duration_ms(source)
            audio_filter, parsed = build_audio_filter(edits, duration_ms)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            return {"error": str(error)}
        self.counter += 1
        out = self.candidate_dir / sound / f"rev-{int(time.time())}-{self.counter}.mp3"
        out.parent.mkdir(parents=True, exist_ok=True)
        temp = out.with_suffix(".tmp.mp3")
        render = subprocess.run(
            [
                "ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-threads", "1",
                "-i", str(source), "-af", audio_filter,
                "-codec:a", "libmp3lame", "-q:a", "4", str(temp),
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if render.returncode != 0 or not temp.exists():
            temp.unlink(missing_ok=True)
            return {"error": render.stderr.strip() or "Audio edit failed"}
        temp.replace(out)
        source_metadata = self._source_metadata(source, url, sound)
        _write_metadata(
            out,
            {
                "kind": "revision",
                "source_slot": source_metadata.get("source_slot", sound),
                "prompt": source_metadata.get("prompt"),
                "parent_url": url,
                "edits": parsed,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )
        return {"candidate": self._candidate_record(sound, out)}

    def _snapshot_current(self, sound: str, current: Path, entry: dict) -> str:
        self.counter += 1
        snapshot = (
            self.candidate_dir / sound / f"history-{int(time.time())}-{self.counter}.mp3"
        )
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(current, snapshot)
        _write_metadata(
            snapshot,
            {
                "kind": "history",
                "source_slot": sound,
                "prompt": entry.get("prompt"),
                "parent_url": None,
                "edits": entry.get("edits"),
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )
        return self._url_for(snapshot)

    def accept(self, sound: str, url: str) -> dict:
        with self.lock:
            return self._accept_unlocked(sound, url)

    def _accept_unlocked(self, sound: str, url: str) -> dict:
        category, config = self.sound_config(sound)
        if config is None:
            return {"error": f"Unknown sound: {sound}"}
        try:
            src = self._resolve_url(url)
            duration_ms = probe_duration_ms(src)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            return {"error": str(error)}
        dest = self.output_dir / category / f"{sound}.mp3"
        dest.parent.mkdir(parents=True, exist_ok=True)
        manifest = self.manifest()
        sounds = manifest.setdefault("sounds", {})
        entry = sounds.get(sound, {}) if isinstance(sounds.get(sound, {}), dict) else {}
        history = entry.get("assignment_history", [])
        if not isinstance(history, list):
            history = []
        if dest.exists() and src.resolve() != dest.resolve():
            history.append(
                {
                    "url": self._snapshot_current(sound, dest, entry),
                    "replaced_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            )
        if src.resolve() != dest.resolve():
            shutil.copyfile(src, dest)
        metadata = self._source_metadata(src, url, sound)
        entry.update(
            {
                "file": f"{category}/{sound}.mp3",
                "duration_ms": duration_ms,
                "prompt": metadata.get("prompt")
                or self.prompts.get(sound)
                or entry.get("prompt")
                or build_prompt(self.vibe, config["modifier"]),
                "picked": True,
                "accepted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "accepted_from": {
                    "slot": metadata.get("source_slot", sound),
                    "url": url,
                    "kind": metadata.get("kind", "generated"),
                },
                "edits": metadata.get("edits"),
                "assignment_history": history,
            }
        )
        sounds[sound] = entry
        constants = generate_typescript_constants(sounds)
        manifest["typescript_constants"] = constants
        manifest_temp = self.manifest_path.with_suffix(".json.tmp")
        manifest_temp.write_text(json.dumps(manifest, indent=2))
        manifest_temp.replace(self.manifest_path)
        constants_path = self.output_dir / "constants.ts"
        constants_temp = constants_path.with_suffix(".ts.tmp")
        constants_temp.write_text(constants)
        constants_temp.replace(constants_path)
        return {"ok": True, "written": str(dest)}

    def delete_candidate(self, url: str, cascade: bool) -> dict:
        try:
            source = self._resolve_url(url)
        except ValueError as error:
            return {"error": str(error)}
        candidate_root = self.candidate_dir.resolve()
        if candidate_root not in source.parents:
            return {"error": "Accepted theme files cannot be deleted; replace them first"}
        pending = [url]
        found = []
        while pending:
            parent_url = pending.pop()
            try:
                path = self._resolve_url(parent_url)
            except ValueError:
                continue
            found.append(path)
            for metadata_path in self.candidate_dir.glob("**/*.json"):
                metadata = _read_metadata(metadata_path.with_suffix(".mp3"))
                if metadata.get("parent_url") == parent_url and not metadata.get("deleted"):
                    child = metadata_path.with_suffix(".mp3")
                    if child.exists():
                        pending.append(self._url_for(child))
        if len(found) > 1 and not cascade:
            return {"error": "Candidate has revisions; delete with cascade=true"}
        deleted_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        for path in found:
            metadata = _read_metadata(path)
            metadata.update({"deleted": True, "deleted_at": deleted_at})
            _write_metadata(path, metadata)
            path.unlink(missing_ok=True)
        return {"ok": True, "deleted": len(found)}


def make_handler(state: PickerState):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

        def _json(self, payload, status=200):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/":
                body = PAGE.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif path == "/api/state":
                self._json(
                    {
                        "vibe": state.vibe,
                        "slots": state.slots(),
                        "targets": state.targets(),
                    }
                )
            elif path.startswith("/files/"):
                rel = path.removeprefix("/files/")
                file_path = (state.output_dir / rel).resolve()
                if not file_path.is_file() or state.output_dir.resolve() not in file_path.parents:
                    self._json({"error": "not found"}, 404)
                    return
                data = file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self._json({"error": "not found"}, 404)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0"))
            if length > 65_536:
                self._json({"error": "request body is too large"}, 413)
                return
            try:
                payload = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json({"error": "invalid JSON"}, 400)
                return
            if self.path == "/api/generate":
                self._json(state.generate_candidate(payload.get("sound", ""), payload.get("prompt", "")))
            elif self.path == "/api/accept":
                self._json(state.accept(payload.get("sound", ""), payload.get("url", "")))
            elif self.path == "/api/edit":
                self._json(
                    state.edit_candidate(
                        payload.get("sound", ""),
                        payload.get("url", ""),
                        payload.get("edits", {}),
                    )
                )
            elif self.path == "/api/delete":
                self._json(
                    state.delete_candidate(
                        payload.get("url", ""),
                        payload.get("cascade") is True,
                    )
                )
            else:
                self._json({"error": "not found"}, 404)

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Interactive UI sound picker")
    parser.add_argument("--vibe", help="Preset vibe name")
    parser.add_argument("--vibe-custom", help="Custom vibe description")
    parser.add_argument("--output-dir", default="./audio-theme", help="Theme directory")
    parser.add_argument("--categories", nargs="+", help="Limit to specific categories")
    parser.add_argument("--port", type=int, default=7777)
    args = parser.parse_args()

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
        sys.exit(1)

    require_ffmpeg()
    state = PickerState(vibe, Path(args.output_dir).resolve(), args.categories)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(state))
    print(f"Sound picker running at http://127.0.0.1:{args.port}")
    print(f"Theme directory: {state.output_dir}")
    print("Ctrl-C to stop. Accepted sounds are written into the theme directory immediately.")
    server.serve_forever()


if __name__ == "__main__":
    main()
