# Lexical JSON Format Reference

Complete reference for Payload CMS Lexical editor node types.

## Root Structure

Every Lexical document has this structure:

```json
{
  "root": {
    "type": "root",
    "format": "",
    "indent": 0,
    "version": 1,
    "children": [ /* nodes */ ],
    "direction": "ltr"
  }
}
```

## Text Formatting

Text format is a bitmask integer:

| Value | Format |
|-------|--------|
| 0 | Normal |
| 1 | Bold |
| 2 | Italic |
| 3 | Bold + Italic |
| 4 | Strikethrough |
| 8 | Underline |
| 16 | Code |
| 32 | Subscript |
| 64 | Superscript |

Combine values: Bold + Italic = 1 + 2 = 3

## Node Types

### Text Node

```json
{
  "type": "text",
  "text": "Content here",
  "format": 0,
  "style": "",
  "detail": 0,
  "mode": "normal",
  "version": 1
}
```

### Paragraph Node

```json
{
  "type": "paragraph",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    { "type": "text", "text": "...", "format": 0, "version": 1 }
  ],
  "direction": "ltr",
  "textFormat": 0
}
```

### Heading Node

```json
{
  "type": "heading",
  "tag": "h2",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    { "type": "text", "text": "Heading Text", "format": 0, "version": 1 }
  ],
  "direction": "ltr"
}
```

Valid tags: h1, h2, h3, h4, h5, h6

### Link Node

```json
{
  "type": "link",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    { "type": "text", "text": "Link Text", "format": 0, "version": 1 }
  ],
  "direction": "ltr",
  "fields": {
    "url": "https://example.com",
    "newTab": false,
    "linkType": "custom"
  }
}
```

### List Node

```json
{
  "type": "list",
  "listType": "bullet",
  "format": "",
  "indent": 0,
  "version": 1,
  "start": 1,
  "tag": "ul",
  "children": [
    {
      "type": "listitem",
      "format": "",
      "indent": 0,
      "version": 1,
      "value": 1,
      "children": [
        { "type": "text", "text": "Item text", "format": 0, "version": 1 }
      ],
      "direction": "ltr"
    }
  ],
  "direction": "ltr"
}
```

List types:
- `"bullet"` with tag `"ul"` for unordered
- `"number"` with tag `"ol"` for ordered
- `"check"` for checkbox lists

### Quote Node

```json
{
  "type": "quote",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    { "type": "text", "text": "Quoted text", "format": 0, "version": 1 }
  ],
  "direction": "ltr"
}
```

### Horizontal Rule

```json
{
  "type": "horizontalrule",
  "version": 1
}
```

### Code Block (Payload Block)

Payload uses block nodes for code:

```json
{
  "type": "block",
  "format": "",
  "indent": 0,
  "version": 2,
  "fields": {
    "id": "",
    "blockName": "",
    "blockType": "code",
    "code": "const x = 1;\nconsole.log(x);",
    "language": "typescript"
  }
}
```

Common languages: javascript, typescript, python, bash, json, html, css, go, rust

### Media Block

```json
{
  "type": "block",
  "format": "",
  "indent": 0,
  "version": 2,
  "fields": {
    "id": "",
    "blockName": "",
    "blockType": "mediaBlock",
    "media": "media-id-here",
    "position": "default"
  }
}
```

### Banner Block

```json
{
  "type": "block",
  "format": "",
  "indent": 0,
  "version": 2,
  "fields": {
    "id": "",
    "blockName": "",
    "blockType": "banner",
    "style": "info",
    "content": {
      "root": {
        "type": "root",
        "children": [
          {
            "type": "paragraph",
            "children": [
              { "type": "text", "text": "Banner content" }
            ]
          }
        ]
      }
    }
  }
}
```

## Direction Values

- `"ltr"` - Left to right (default)
- `"rtl"` - Right to left

## Complete Example

A document with heading, paragraph, and code:

```json
{
  "root": {
    "type": "root",
    "format": "",
    "indent": 0,
    "version": 1,
    "children": [
      {
        "type": "heading",
        "tag": "h1",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [
          { "type": "text", "text": "Getting Started", "format": 0, "version": 1 }
        ],
        "direction": "ltr"
      },
      {
        "type": "paragraph",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [
          { "type": "text", "text": "This is an introduction.", "format": 0, "version": 1 }
        ],
        "direction": "ltr",
        "textFormat": 0
      },
      {
        "type": "block",
        "format": "",
        "indent": 0,
        "version": 2,
        "fields": {
          "id": "",
          "blockName": "",
          "blockType": "code",
          "code": "npm install payload",
          "language": "bash"
        }
      }
    ],
    "direction": "ltr"
  }
}
```

## Validation

When sending to Payload API:
1. Ensure all nodes have `version` field
2. Root must have `type: "root"` and `children` array
3. Block nodes need `fields.blockType` matching collection config
4. Text nodes inside containers (paragraph, heading, list item, etc.)
