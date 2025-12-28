---
name: txex
version: 1.0.0
description: Extract, cache, and transform media from Bitcoin blockchain transactions. Use when extracting files from outpoints, downloading NFT collections, or transforming blockchain media (images, video, audio).
---

# txex - Blockchain Media Extractor

Extract files from BSV transactions with optional transforms. Supports B://, BCAT, 1Sat Ordinals, and ORDFS Streams.

## Installation

```bash
bun add -g txex
```

Requires [ffmpeg](https://ffmpeg.org/download.html) for video/audio transforms.

## Core Commands

### Extract Media

```bash
# Basic extraction (auto-detects filename/extension)
txex <outpoint>

# Specify output
txex <outpoint> -o output.mp4

# Parallel chunks for large files
txex <outpoint> -c 10
```

### Download Collections

```bash
# Auto-detect and download entire collection
txex <collection_outpoint>

# Limit items
txex <collection_outpoint> --limit 50

# Custom output directory
txex <collection_outpoint> -o ./my-collection
```

### Image Transforms

```bash
# Resize and convert
txex <outpoint> -w 800 -f webp -o thumb.webp

# Blurred placeholder
txex <outpoint> -w 50 --blur 10 -f webp -q 50

# Social card (1200x630 cover)
txex <outpoint> -w 1200 -h 630 --fit cover -f webp
```

| Option | Description |
|--------|-------------|
| `-w`, `--width` | Resize width |
| `-h`, `--height` | Resize height |
| `-f`, `--format` | Output: `webp`, `avif`, `png`, `jpg` |
| `--fit` | `cover`, `contain`, `fill`, `inside` |
| `-q`, `--quality` | 1-100 (default: 80) |
| `--blur` | Blur radius 0.3-1000 |
| `--grayscale` | Convert to grayscale |
| `--rotate` | Rotate degrees |

### Video Transforms

```bash
# Extract thumbnail at 5 seconds
txex <outpoint> --thumbnail 5 -w 320 -o thumb.jpg

# Convert to WebM, trim to 10 seconds
txex <outpoint> -w 720 -f webm --duration 10

# GIF preview (3 seconds, 10fps)
txex <outpoint> -w 480 -f gif --duration 3 --fps 10
```

| Option | Description |
|--------|-------------|
| `--thumbnail <time>` | Extract frame at timestamp |
| `--start <time>` | Trim start |
| `--duration <time>` | Trim duration |
| `--fps` | Output framerate |
| `--no-audio` | Strip audio track |
| `-f` | Output: `mp4`, `webm`, `gif`, `mov` |

### Audio Transforms

```bash
# Convert format
txex <outpoint> -f ogg -o track.ogg

# High quality MP3
txex <outpoint> -f mp3 --bitrate 320k

# Trim and normalize
txex <outpoint> --start 10 --duration 30 --normalize -f mp3
```

| Option | Description |
|--------|-------------|
| `-f` | Output: `mp3`, `wav`, `ogg`, `flac`, `aac` |
| `--bitrate` | e.g., `128k`, `320k` |
| `--sample-rate` | e.g., `44100`, `48000` |
| `--channels` | `1` (mono), `2` (stereo) |
| `--normalize` | Normalize volume |

### Metadata & Colors

```bash
# Show metadata without extracting
txex info <outpoint>
txex info <outpoint> --json

# Extract colors and BlurHash
txex color <outpoint>
txex color <outpoint> -n 8 --json
```

### Cache Management

```bash
txex cache --stats   # Show statistics
txex cache --clear   # Clear all cached data
```

## Library Usage

```typescript
import { extract, extractData, transformImage } from "txex";

const file = await extract("abc123_0");
// file.protocol, file.mediaType, file.data, file.chunks

const data = await extractData("abc123_0");

const transformed = await transformImage(data, {
  width: 800,
  format: "webp",
  quality: 85,
});
```

## Caching

Two-tier cache in `~/.txex/cache/`:
- `tx/` - Raw transaction data
- `transformed/` - Processed outputs

First run fetches from network (~2.5s), subsequent runs use cache (~0.05s).
