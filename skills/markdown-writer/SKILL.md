---
name: markdown-writer
version: 1.0.0
description: This skill should be used when the user asks to write, edit, review, or improve Markdown content (README, docs, changelog, guides), or needs Markdown formatting, syntax help, or advanced patterns (tables, callouts, task lists, mermaid, details/summary, footnotes).
---

# Markdown Writer

Write clean, portable Markdown and apply advanced Markdown patterns when appropriate.

## Workflow
1. **Identify the target renderer** (GitHub/GitLab/MDX/Docusaurus/Fumadocs/etc.). If unknown, assume GitHub Flavored Markdown and note compatibility when using advanced features.
2. Keep structure scannable with headings, short paragraphs, and lists.
3. Prefer native Markdown; use HTML only when required and supported by the target renderer.
4. Load [references/REFERENCE.md](references/REFERENCE.md) for advanced patterns, cross-renderer mappings, and MDX component conventions.
5. **When converting between renderers**: Map syntax 1:1 using the cross-renderer table in the reference. Do not leave source-format syntax intact — convert callouts, collapsibles, links, and component patterns to the target format.
6. **MDX files**: Imports go after frontmatter. JSX components replace HTML blocks. Ensure fenced code blocks inside JSX are not broken by curly braces.
7. **Relative links in monorepos**: Resolve paths from the file's actual directory. Use `../` traversal, not absolute paths. Update `.md` extensions to `.mdx` when the target is an MDX site.
8. Validate that syntax is consistent and examples are copy-pasteable.
