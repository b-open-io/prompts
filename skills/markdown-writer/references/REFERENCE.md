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

## Cross-Renderer Syntax Mapping

When converting between renderers, use this table to map features:

| Feature | GitHub (GFM) | Docusaurus | Fumadocs (MDX) |
|---|---|---|---|
| Info callout | `> [!NOTE]` | `:::note` | `<Callout type="info">` |
| Warning callout | `> [!WARNING]` | `:::warning` | `<Callout type="warn">` |
| Tip callout | `> [!TIP]` | `:::tip` | `<Callout type="info">` |
| Danger callout | `> [!CAUTION]` | `:::danger` | `<Callout type="error">` |
| Collapsible | `<details><summary>` | `<details><summary>` | `<Accordions><Accordion title="">` |
| Tabs | Not supported | `<Tabs><TabItem>` | `<Tabs><Tab>` |
| Code title | Not supported | `title="file.ts"` on fence | `title="file.ts"` on fence |

### MDX Component Patterns

**Imports go after frontmatter, before content:**
```mdx
---
title: My Page
---

import { Callout } from 'fumadocs-ui/components/callout';
import { Accordions, Accordion } from 'fumadocs-ui/components/accordion';

# My Page

<Callout type="warn">
  This is a warning.
</Callout>
```

**Nested collapsibles in MDX:**
```mdx
<Accordions>
  <Accordion title="Platform Notes">
    <Accordions>
      <Accordion title="macOS">
        Content here.
      </Accordion>
      <Accordion title="Linux">
        Content here.
      </Accordion>
    </Accordions>
  </Accordion>
</Accordions>
```

### Nested Collapsibles on GitHub

Blank lines are **required** around HTML tags when mixing with markdown content:

```md
<details>
<summary>Outer</summary>

<details>
<summary>Inner</summary>

Inner content with `code` and **bold**.

</details>

</details>
```

Without blank lines, GitHub will not render the inner markdown.

### Keep a Changelog Format

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

### Monorepo Relative Links

When linking between packages in a monorepo, resolve from the file's directory:

```
packages/cli/README.md → packages/core/README.md  = ../core/README.md
packages/cli/README.md → docs/pages/api/cli.mdx   = ../../docs/pages/api/cli.mdx
```

Never use absolute paths from repo root. Update `.md` to `.mdx` when targeting an MDX site.
