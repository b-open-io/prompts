# Markdown Writer Reference

## Renderer notes
- Advanced features are renderer-specific. If the target is unknown, default to GitHub Flavored Markdown (GFM) and flag any non-standard features.
- Prefer Markdown over HTML; use HTML only for features Markdown cannot express.

## Advanced patterns and snippets

### Callouts (GitHub)
```md
> [!NOTE]
> This is a callout.
```

### Collapsible sections (HTML, widely supported)
```md
<details>
  <summary>Show details</summary>

  Hidden content goes here.
</details>
```

### Task lists (GFM)
```md
- [ ] Write the draft
- [x] Review edits
```

### Tables with alignment
```md
| Column | Left | Center | Right |
|:------|:-----|:------:|------:|
| Row 1 | a    | b      | c     |
```

### Mermaid diagrams (GFM)
````md
```mermaid
graph LR
  A --> B
```
````

### Footnotes (GFM)
```md
Here is a footnote.[^1]

[^1]: Footnote text.
```

### Anchored links to headings
```md
[Jump to usage](#usage)
```

### Diff fences for change examples
````md
```diff
- old line
+ new line
```
````

### Images with sizing (HTML)
```md
<img src="/path/to/image.png" alt="Alt text" width="480" />
```

### Inline HTML helpers
```md
Press <kbd>Cmd</kbd> + <kbd>K</kbd> to open the palette.
Water is H<sub>2</sub>O and 2<sup>3</sup> = 8.
```

### Reference-style links
```md
[Link text][ref]

[ref]: https://example.com
```

### Escaping backticks in inline code
```md
Use `` `code` `` to show backticks in inline code.
```

---

## GitHub Callout Types

All five types supported on GitHub:

```md
> [!NOTE]
> Information users should consider.

> [!TIP]
> Optional success information.

> [!IMPORTANT]
> Crucial information necessary.

> [!WARNING]
> Critical content demanding attention.

> [!CAUTION]
> Negative potential consequences.
```

## Nested Collapsibles

Blank lines are **required** around HTML tags when mixing with markdown content. Without them, GitHub will not render the inner markdown.

```md
<details>
<summary>Outer section</summary>

<details>
<summary>Inner section</summary>

Inner content with `code` and **bold**.

</details>

</details>
```

## Image Alignment and Layout

**Center an image:**
```md
<p align="center">
  <img width="460" height="300" src="screenshot.png">
</p>
```

**Left/right float:**
```md
<img align="right" width="100" height="100" src="logo.png">
```

**Light/dark mode images (GitHub):**
```md
![Logo](./dark.png#gh-dark-mode-only)
![Logo](./light.png#gh-light-mode-only)
```

## Centered Text and Badges

```md
<div align="center">
  <h1>Project Name</h1>
  <p>Short description of the project</p>

  [![CI](https://img.shields.io/badge/build-passing-green)](url)
  [![License](https://img.shields.io/badge/license-MIT-blue)](url)
</div>
```

## Tiny / Superscript Text

```md
<sup><sub>Tiny footnote text</sub></sup>
```

## Keep a Changelog Format

```md
## [1.2.0] - 2026-01-15

### Added
- New feature description

### Changed
- Breaking change with migration path

### Deprecated
- Old API that will be removed

### Fixed
- Bug fix with [#123](https://github.com/org/repo/issues/123) link

[1.2.0]: https://github.com/org/repo/compare/v1.1.0...v1.2.0
```

## Monorepo Relative Links

When linking between packages in a monorepo, resolve from the file's directory:

```
packages/cli/README.md → packages/core/README.md     = ../core/README.md
packages/cli/README.md → docs/getting-started.md      = ../../docs/getting-started.md
packages/cli/README.md → docs/api/cli.md              = ../../docs/api/cli.md
```

Never use absolute paths from repo root.
