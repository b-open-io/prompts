#!/usr/bin/env bun
/**
 * Voice Clone CLI — ElevenLabs Instant Voice Cloning pipeline
 *
 * Commands:
 *   source   — Download/collect reference audio
 *   prepare  — Trim, normalize, clean audio samples
 *   clone    — Upload to ElevenLabs IVC
 *   test     — Generate test speech with cloned voice
 *   tune     — Adjust voice settings and regenerate
 *   pipeline — Run source→prepare→clone→test in sequence
 *   list     — List all cloned voices
 *   delete   — Delete a cloned voice
 *   info     — Get voice details
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, extname, join, resolve } from "path";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const SUPPORTED_FORMATS = new Set([".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"]);

function getApiKey(): string {
	const key = process.env.ELEVENLABS_API_KEY;
	if (!key) {
		console.error("Error: ELEVENLABS_API_KEY environment variable is not set.");
		console.error("Get your key at https://elevenlabs.io → Profile → API Keys");
		process.exit(1);
	}
	return key;
}

function ensureDir(dir: string): void {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getAudioFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => SUPPORTED_FORMATS.has(extname(f).toLowerCase()))
		.map((f) => join(dir, f))
		.sort();
}

async function checkFfmpeg(): Promise<boolean> {
	try {
		const proc = Bun.spawn(["ffmpeg", "-version"], { stdout: "pipe", stderr: "pipe" });
		await proc.exited;
		return proc.exitCode === 0;
	} catch {
		return false;
	}
}

async function apiRequest(
	path: string,
	options: RequestInit & { rawResponse?: boolean } = {},
): Promise<unknown> {
	const apiKey = getApiKey();
	const url = `${ELEVENLABS_BASE}${path}`;
	const headers: Record<string, string> = {
		"xi-api-key": apiKey,
		...(options.headers as Record<string, string>),
	};

	const res = await fetch(url, { ...options, headers });

	if (!res.ok) {
		const text = await res.text();
		console.error(`API error ${res.status}: ${text}`);
		process.exit(1);
	}

	if (options.rawResponse) return res;

	const contentType = res.headers.get("content-type") || "";
	if (contentType.includes("application/json")) return res.json();
	return res;
}

// ─── Commands ───

async function cmdSource(args: Args): Promise<void> {
	const outputDir = resolve(args["output-dir"] || "./voice-samples");
	ensureDir(outputDir);

	if (args.url) {
		const urls = (args.url as string).split(",");
		for (const url of urls) {
			const filename = basename(new URL(url.trim()).pathname) || `sample-${Date.now()}.mp3`;
			const outPath = join(outputDir, filename);
			console.log(`Downloading ${url.trim()} → ${outPath}`);
			const res = await fetch(url.trim());
			if (!res.ok) {
				console.error(`Failed to download ${url}: ${res.status}`);
				continue;
			}
			const buffer = await res.arrayBuffer();
			writeFileSync(outPath, Buffer.from(buffer));
			console.log(`  Saved (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
		}
	}

	if (args.files) {
		const files = (args.files as string).split(",");
		for (const file of files) {
			const src = resolve(file.trim());
			if (!existsSync(src)) {
				console.error(`File not found: ${src}`);
				continue;
			}
			const dest = join(outputDir, basename(src));
			const data = readFileSync(src);
			writeFileSync(dest, data);
			console.log(`Copied ${src} → ${dest}`);
		}
	}

	const collected = getAudioFiles(outputDir);
	console.log(`\n${collected.length} audio file(s) in ${outputDir}`);
}

async function cmdPrepare(args: Args): Promise<void> {
	const hasFfmpeg = await checkFfmpeg();
	if (!hasFfmpeg) {
		console.error("Error: ffmpeg is required for audio preparation.");
		console.error("Install: brew install ffmpeg");
		process.exit(1);
	}

	const inputDir = resolve(args["input-dir"] || "./voice-samples");
	const outputDir = resolve(args["output-dir"] || "./voice-prepared");
	ensureDir(outputDir);

	const files = getAudioFiles(inputDir);
	if (files.length === 0) {
		console.error(`No audio files found in ${inputDir}`);
		process.exit(1);
	}

	console.log(`Preparing ${files.length} file(s)...`);

	for (const file of files) {
		const outName = basename(file, extname(file)) + ".mp3";
		const outPath = join(outputDir, outName);

		const filters: string[] = [];

		if (args["trim-silence"]) {
			filters.push(
				"silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB",
				"areverse",
				"silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB",
				"areverse",
			);
		}

		if (args.normalize) {
			filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
		}

		const ffmpegArgs = ["ffmpeg", "-y", "-i", file];

		if (filters.length > 0) {
			ffmpegArgs.push("-af", filters.join(","));
		}

		const maxDuration = args["max-duration"];
		if (maxDuration) {
			ffmpegArgs.push("-t", String(maxDuration));
		}

		ffmpegArgs.push("-ar", "44100", "-ac", "1", "-b:a", "128k", outPath);

		console.log(`  Processing ${basename(file)} → ${outName}`);
		const proc = Bun.spawn(ffmpegArgs, { stdout: "pipe", stderr: "pipe" });
		await proc.exited;

		if (proc.exitCode !== 0) {
			const stderr = await new Response(proc.stderr).text();
			console.error(`  Error processing ${basename(file)}: ${stderr.slice(-200)}`);
		}
	}

	const prepared = getAudioFiles(outputDir);
	console.log(`\n${prepared.length} prepared file(s) in ${outputDir}`);
}

async function cmdClone(args: Args): Promise<string> {
	const inputDir = resolve(args["input-dir"] || "./voice-prepared");
	const files = getAudioFiles(inputDir);

	if (files.length === 0) {
		console.error(`No audio files found in ${inputDir}`);
		process.exit(1);
	}

	const name = args.name || `Clone-${Date.now()}`;
	const description = args.description || "";
	const removeNoise = Boolean(args["remove-background-noise"]);

	console.log(`Cloning voice "${name}" with ${files.length} sample(s)...`);
	if (removeNoise) console.log("  Background noise removal: enabled");

	const formData = new FormData();
	formData.append("name", name);
	if (description) formData.append("description", description);
	formData.append("remove_background_noise", String(removeNoise));

	if (args.labels) {
		try {
			const labels = JSON.parse(args.labels as string);
			formData.append("labels", JSON.stringify(labels));
		} catch {
			console.error("Invalid JSON for --labels");
			process.exit(1);
		}
	}

	for (const file of files) {
		const data = readFileSync(file);
		const blob = new Blob([data], { type: "audio/mpeg" });
		formData.append("files", blob, basename(file));
	}

	const apiKey = getApiKey();
	const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
		method: "POST",
		headers: { "xi-api-key": apiKey },
		body: formData,
	});

	if (!res.ok) {
		const text = await res.text();
		console.error(`Clone failed (${res.status}): ${text}`);
		process.exit(1);
	}

	const result = (await res.json()) as { voice_id: string };
	console.log(`\nVoice cloned successfully!`);
	console.log(`  voice_id: ${result.voice_id}`);
	console.log(`  name: ${name}`);
	return result.voice_id;
}

async function cmdTest(args: Args): Promise<void> {
	const voiceId = args["voice-id"];
	if (!voiceId) {
		console.error("Error: --voice-id is required");
		process.exit(1);
	}

	const outputDir = resolve(args["output-dir"] || "./voice-tests");
	ensureDir(outputDir);

	const modelId = (args.model as string) || "eleven_multilingual_v2";

	const testPhrases = args.text
		? [args.text as string]
		: [
				"In a world where nothing is as it seems, one hero must rise above the chaos.",
				"The quick brown fox jumps over the lazy dog. Testing one, two, three.",
				"Ladies and gentlemen, welcome to an experience unlike anything you have ever seen before.",
			];

	console.log(`Testing voice ${voiceId} with ${testPhrases.length} phrase(s)...`);
	console.log(`  Model: ${modelId}`);

	for (let i = 0; i < testPhrases.length; i++) {
		const phrase = testPhrases[i];
		const outPath = join(outputDir, `test-${i + 1}.mp3`);

		console.log(`\n  [${i + 1}/${testPhrases.length}] "${phrase.slice(0, 60)}..."`);

		const apiKey = getApiKey();
		const res = await fetch(
			`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
			{
				method: "POST",
				headers: {
					"xi-api-key": apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: phrase,
					model_id: modelId,
					output_format: "mp3_44100_128",
				}),
			},
		);

		if (!res.ok) {
			const text = await res.text();
			console.error(`  TTS failed (${res.status}): ${text}`);
			continue;
		}

		const buffer = await res.arrayBuffer();
		writeFileSync(outPath, Buffer.from(buffer));
		console.log(`  Saved: ${outPath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
	}

	console.log(`\nTest audio saved to ${outputDir}`);
	console.log("Listen to the files and compare with reference audio.");
}

async function cmdTune(args: Args): Promise<void> {
	const voiceId = args["voice-id"];
	if (!voiceId) {
		console.error("Error: --voice-id is required");
		process.exit(1);
	}

	const outputDir = resolve(args["output-dir"] || "./voice-tests");
	ensureDir(outputDir);

	const stability = Number.parseFloat((args.stability as string) || "0.5");
	const similarityBoost = Number.parseFloat((args["similarity-boost"] as string) || "0.75");
	const style = Number.parseFloat((args.style as string) || "0.0");
	const modelId = (args.model as string) || "eleven_multilingual_v2";

	const text =
		(args.text as string) ||
		"In a world where heroes are forgotten, one voice will remind them all.";

	console.log(`Tuning voice ${voiceId}...`);
	console.log(`  stability: ${stability}`);
	console.log(`  similarity_boost: ${similarityBoost}`);
	console.log(`  style: ${style}`);
	console.log(`  model: ${modelId}`);

	const suffix = `s${(stability * 100).toFixed(0)}-sim${(similarityBoost * 100).toFixed(0)}-st${(style * 100).toFixed(0)}`;
	const outPath = join(outputDir, `tuned-${suffix}.mp3`);

	const apiKey = getApiKey();
	const res = await fetch(
		`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
		{
			method: "POST",
			headers: {
				"xi-api-key": apiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text,
				model_id: modelId,
				output_format: "mp3_44100_128",
				voice_settings: {
					stability,
					similarity_boost: similarityBoost,
					style,
					use_speaker_boost: true,
				},
			}),
		},
	);

	if (!res.ok) {
		const errText = await res.text();
		console.error(`TTS failed (${res.status}): ${errText}`);
		process.exit(1);
	}

	const buffer = await res.arrayBuffer();
	writeFileSync(outPath, Buffer.from(buffer));
	console.log(`\nSaved: ${outPath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
	console.log("Listen and compare. Adjust settings and re-run if needed.");
}

async function cmdPipeline(args: Args): Promise<void> {
	const outputDir = resolve(args["output-dir"] || "./voice-clone-output");
	ensureDir(outputDir);

	const samplesDir = join(outputDir, "samples");
	const preparedDir = join(outputDir, "prepared");
	const testsDir = join(outputDir, "tests");

	// Step 1: Source
	if (args.files || args.url || args["input-dir"]) {
		console.log("\n=== Step 1: Source Audio ===\n");

		if (args["input-dir"]) {
			// Copy from input-dir to samplesDir
			const inputDir = resolve(args["input-dir"] as string);
			ensureDir(samplesDir);
			const files = getAudioFiles(inputDir);
			for (const f of files) {
				const dest = join(samplesDir, basename(f));
				writeFileSync(dest, readFileSync(f));
			}
			console.log(`Copied ${files.length} file(s) from ${inputDir}`);
		} else {
			await cmdSource({ ...args, "output-dir": samplesDir });
		}
	} else {
		console.error(
			"Error: Provide --files, --url, or --input-dir for source audio",
		);
		process.exit(1);
	}

	// Step 2: Prepare
	console.log("\n=== Step 2: Prepare Samples ===\n");
	await cmdPrepare({
		...args,
		"input-dir": samplesDir,
		"output-dir": preparedDir,
		"trim-silence": args["trim-silence"] ?? true,
		normalize: args.normalize ?? true,
	});

	// Step 3: Clone
	console.log("\n=== Step 3: Clone via IVC ===\n");
	const voiceId = await cmdClone({
		...args,
		"input-dir": preparedDir,
	});

	// Step 4: Test
	console.log("\n=== Step 4: Test Clone ===\n");
	await cmdTest({
		"voice-id": voiceId,
		"output-dir": testsDir,
		text: args["test-text"],
		model: args.model,
	});

	// Summary
	console.log("\n=== Pipeline Complete ===\n");
	console.log(`  Voice ID:    ${voiceId}`);
	console.log(`  Name:        ${args.name || "Clone"}`);
	console.log(`  Samples:     ${samplesDir}`);
	console.log(`  Prepared:    ${preparedDir}`);
	console.log(`  Test Audio:  ${testsDir}`);
	console.log(`\nNext: Listen to test audio. If it needs adjustment, run:`);
	console.log(
		`  bun run scripts/voice-clone.ts tune --voice-id "${voiceId}" --stability 0.3 --similarity-boost 0.85 --style 0.5`,
	);
}

async function cmdList(): Promise<void> {
	const data = (await apiRequest("/voices")) as {
		voices: Array<{
			voice_id: string;
			name: string;
			category: string;
			labels: Record<string, string>;
			description: string;
		}>;
	};

	const cloned = data.voices.filter(
		(v) => v.category === "cloned" || v.category === "generated",
	);

	if (cloned.length === 0) {
		console.log("No cloned voices found.");
		return;
	}

	console.log(`${cloned.length} cloned voice(s):\n`);
	for (const v of cloned) {
		const labels = Object.entries(v.labels || {})
			.map(([k, val]) => `${k}=${val}`)
			.join(", ");
		console.log(`  ${v.voice_id}  ${v.name}`);
		if (v.description) console.log(`    Description: ${v.description}`);
		if (labels) console.log(`    Labels: ${labels}`);
		console.log();
	}
}

async function cmdDelete(args: Args): Promise<void> {
	const voiceId = args["voice-id"];
	if (!voiceId) {
		console.error("Error: --voice-id is required");
		process.exit(1);
	}

	await apiRequest(`/voices/${voiceId}`, { method: "DELETE" });
	console.log(`Voice ${voiceId} deleted.`);
}

async function cmdInfo(args: Args): Promise<void> {
	const voiceId = args["voice-id"];
	if (!voiceId) {
		console.error("Error: --voice-id is required");
		process.exit(1);
	}

	const voice = (await apiRequest(`/voices/${voiceId}`)) as Record<string, unknown>;
	console.log(JSON.stringify(voice, null, 2));
}

// ─── CLI ───

type Args = Record<string, string | boolean | undefined>;

function parseArgs(argv: string[]): { command: string; args: Args } {
	const command = argv[0] || "help";
	const args: Args = {};

	for (let i = 1; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			const next = argv[i + 1];
			if (next && !next.startsWith("--")) {
				args[key] = next;
				i++;
			} else {
				args[key] = true;
			}
		}
	}

	return { command, args };
}

function printHelp(): void {
	console.log(`
voice-clone — ElevenLabs Instant Voice Cloning pipeline

Commands:
  source    Download/collect reference audio
  prepare   Trim, normalize, clean audio samples
  clone     Upload samples to ElevenLabs IVC
  test      Generate test speech with cloned voice
  tune      Adjust voice settings and regenerate
  pipeline  Run full source→prepare→clone→test pipeline
  list      List all cloned voices
  delete    Delete a cloned voice
  info      Get voice details

Run with --help after any command for options.
`);
}

const cliArgs = process.argv.slice(2);
const { command, args } = parseArgs(cliArgs);

switch (command) {
	case "source":
		await cmdSource(args);
		break;
	case "prepare":
		await cmdPrepare(args);
		break;
	case "clone":
		await cmdClone(args);
		break;
	case "test":
		await cmdTest(args);
		break;
	case "tune":
		await cmdTune(args);
		break;
	case "pipeline":
		await cmdPipeline(args);
		break;
	case "list":
		await cmdList();
		break;
	case "delete":
		await cmdDelete(args);
		break;
	case "info":
		await cmdInfo(args);
		break;
	default:
		printHelp();
		break;
}
