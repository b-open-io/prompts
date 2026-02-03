---
name: resend-integration
description: Complete API reference for Resend integration
---

# API Reference

## Contacts API

### Create Contact

```typescript
const { data, error } = await resend.contacts.create({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  unsubscribed: false,
  // Optional: Add to segments
  segments: [{ id: "seg_xxx" }],
  // Optional: Subscribe to topics
  topics: [{ id: "top_xxx", subscription: "opt_in" }],
  // Optional: Custom properties
  properties: {
    domain: "example.com",
    source: "newsletter",
    plan: "pro",
  },
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Contact email address |
| `firstName` | string | No | First name |
| `lastName` | string | No | Last name |
| `unsubscribed` | boolean | No | Subscription status |
| `segments` | array | No | Segment IDs to add |
| `topics` | array | No | Topics to subscribe |
| `properties` | object | No | Custom key-value pairs |

**Response:**
```typescript
{
  data: { id: "con_xxx", email: "user@example.com" },
  error: null
}
```

### Get Contact

```typescript
const { data, error } = await resend.contacts.get({
  email: "user@example.com",
});
```

**Response:**
```typescript
{
  data: {
    id: "con_xxx",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    created_at: "2024-01-10T12:00:00Z",
    properties: { ... },
  },
  error: null
}
```

### Update Contact

```typescript
const { data, error } = await resend.contacts.update({
  email: "user@example.com",
  firstName: "Jane", // Updated
  properties: {
    plan: "enterprise", // Updated
  },
});
```

### List Contacts

```typescript
const { data, error } = await resend.contacts.list({
  audienceId: "aud_xxx",
});
```

**Response:**
```typescript
{
  data: [
    { id: "con_1", email: "...", ... },
    { id: "con_2", email: "...", ... },
  ],
  error: null
}
```

### Delete Contact

```typescript
const { data, error } = await resend.contacts.delete({
  email: "user@example.com",
});
```

---

## Emails API

### Send Email

```typescript
const { data, error } = await resend.emails.send({
  from: "Company <noreply@company.com>",
  to: ["user@example.com"],
  subject: "Welcome!",
  html: "<p>Welcome message</p>",
  text: "Welcome message", // Plain text fallback
  replyTo: "support@company.com",
  cc: ["manager@company.com"],
  bcc: ["archive@company.com"],
  attachments: [
    {
      filename: "document.pdf",
      content: base64Content,
    },
  ],
  headers: {
    "X-Custom-Header": "value",
  },
  tags: [
    { name: "campaign", value: "welcome" },
    { name: "source", value: "signup" },
  ],
});
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Sender address with name |
| `to` | string[] | Yes | Recipient addresses |
| `subject` | string | Yes | Email subject |
| `html` | string | No* | HTML content |
| `text` | string | No* | Plain text content |
| `replyTo` | string | No | Reply-to address |
| `cc` | string[] | No | CC recipients |
| `bcc` | string[] | No | BCC recipients |
| `attachments` | array | No | File attachments |
| `headers` | object | No | Custom headers |
| `tags` | array | No | Metadata tags |

*Either `html` or `text` required

**Response:**
```typescript
{
  data: { id: "msg_xxx" },
  error: null
}
```

### Get Email

```typescript
const { data, error } = await resend.emails.get({
  id: "msg_xxx",
});
```

---

## Audiences API

### List Audiences

```typescript
const { data, error } = await resend.audiences.list();
```

**Response:**
```typescript
{
  data: [
    {
      id: "aud_xxx",
      name: "Default",
      created_at: "2024-01-01T00:00:00Z",
    },
  ],
  error: null
}
```

---

## Segments API

### Create Segment

```typescript
const { data, error } = await resend.segments.create({
  audienceId: "aud_xxx",
  name: "Newsletter Subscribers",
  filter: {
    and: [
      { field: "properties.source", operator: "equals", value: "newsletter" },
    ],
  },
});
```

### List Segments

```typescript
const { data, error } = await resend.segments.list({
  audienceId: "aud_xxx",
});
```

---

## Topics API

### Create Topic

```typescript
const { data, error } = await resend.topics.create({
  audienceId: "aud_xxx",
  name: "Product Updates",
  defaultSubscription: "opt_in", // or "opt_out"
  isPublic: true, // Visible on preference page
});
```

### List Topics

```typescript
const { data, error } = await resend.topics.list({
  audienceId: "aud_xxx",
});
```

---

## Broadcasts API

### Create Broadcast

```typescript
const { data, error } = await resend.broadcasts.create({
  audienceId: "aud_xxx",
  from: "Company <noreply@company.com>",
  subject: "January Newsletter",
  html: "<p>Newsletter content</p>",
  text: "Newsletter content",
  segmentId: "seg_xxx", // Target segment
});
```

### Send Broadcast

```typescript
const { data, error } = await resend.broadcasts.send({
  broadcastId: "bch_xxx",
});
```

---

## Webhooks

### Webhook Events

| Event | Description |
|-------|-------------|
| `email.sent` | Email queued for sending |
| `email.delivered` | Email delivered to recipient |
| `email.opened` | Email opened (if tracking enabled) |
| `email.clicked` | Link clicked (if tracking enabled) |
| `email.bounced` | Email bounced |
| `email.complained` | Spam complaint received |
| `email.received` | Inbound email received |
| `contact.created` | New contact added |
| `contact.updated` | Contact information changed |
| `contact.deleted` | Contact removed |

### Webhook Payload Structure

```typescript
interface WebhookPayload {
  type: string;
  created_at: string;
  data: {
    // Event-specific data
  };
}

// email.sent example
{
  type: "email.sent",
  created_at: "2024-01-10T12:00:00Z",
  data: {
    id: "msg_xxx",
    from: "sender@company.com",
    to: ["recipient@example.com"],
    subject: "Hello",
    created_at: "2024-01-10T12:00:00Z",
  }
}

// email.received example
{
  type: "email.received",
  created_at: "2024-01-10T12:00:00Z",
  data: {
    id: "msg_xxx",
    from: "sender@example.com",
    to: ["inbound@company.com"],
    subject: "Question",
    html: "<p>Email body</p>",
    text: "Email body",
    attachments: [
      {
        filename: "file.pdf",
        contentType: "application/pdf",
        size: 12345,
      },
    ],
  }
}
```

---

## Error Handling

### Error Response Structure

```typescript
{
  data: null,
  error: {
    message: "Contact already exists",
    statusCode: 409,
    name: "conflict",
  }
}
```

### Common Error Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (e.g., contact exists) |
| 422 | Unprocessable | Validation error |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Resend internal error |

### Error Handling Pattern

```typescript
const { data, error } = await resend.contacts.create({ email: "test@test.com" });

if (error) {
  if (error.statusCode === 409) {
    // Handle duplicate
    return { exists: true };
  }
  
  if (error.statusCode === 429) {
    // Handle rate limit
    throw new Error("Rate limited, retry after delay");
  }
  
  // Log and rethrow
  console.error("Resend API error:", error);
  throw new Error(error.message);
}

return { data, exists: false };
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Send Email | 100/second |
| Create Contact | 100/second |
| Other API | 1000/minute |

**Handling Rate Limits:**
```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY, {
  retry: {
    attempts: 3,
    delay: 1000, // ms between retries
  },
});
```
