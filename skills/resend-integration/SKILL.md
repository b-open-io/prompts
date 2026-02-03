---
name: resend-integration
description: This skill should be used when the user wants to set up Resend email integration with newsletters, contact forms, and booking systems. Use when implementing email functionality with Resend Audiences, segments, topics, webhooks, and multi-domain accounts.
---

# Resend Integration

Complete guide for integrating Resend email services into Next.js applications with proper Audiences setup.

## When to Use

- Setting up newsletter signups
- Adding contact form email notifications
- Implementing booking/calendar email confirmations
- Configuring email forwarding via webhooks
- Managing multi-domain Resend accounts

## Resend Audiences Architecture

Resend has ONE audience per account. Use these features to organize:

| Feature | Purpose | Visibility |
|---------|---------|------------|
| **Contacts** | Individual subscribers | - |
| **Properties** | Custom data fields (domain, source, company) | Internal |
| **Segments** | Internal groupings for targeting | Internal |
| **Topics** | User-facing email preferences | User can manage |
| **Broadcasts** | Campaign sending with auto-unsubscribe | - |

## Multi-Domain Strategy

For accounts with multiple domains, tag contacts with properties:

```typescript
await resend.contacts.create({
  email,
  properties: {
    domain: "example.com",
    source: "newsletter",
  },
  segments: [{ id: SEGMENT_ID }],
  topics: [{ id: TOPIC_ID, subscription: "opt_in" }],
});
```

## Core Implementation

### 1. Shared Utility (`lib/resend.ts`)

```typescript
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function createContact({
  email,
  firstName,
  lastName,
  company,
  source,
  subscribeToNewsletter = false,
}: CreateContactOptions) {
  const segments = [];
  const topics = [];
  
  if (subscribeToNewsletter && TOPIC_NEWSLETTER) {
    topics.push({ id: TOPIC_NEWSLETTER, subscription: "opt_in" });
  }

  const { data, error } = await resend.contacts.create({
    email,
    firstName,
    lastName,
    properties: { domain: "YOUR_DOMAIN.com", source, company },
    segments,
    topics,
  });

  if (error?.message?.includes("already exists")) {
    return { exists: true, error: null };
  }
  return { data, exists: false, error };
}
```

### 2. Newsletter Route (`/api/newsletter`)

```typescript
export async function POST(request: Request) {
  const { email } = await request.json();

  if (await contactExists(email)) {
    return NextResponse.json(
      { error: "already_subscribed", message: "You're already subscribed!" },
      { status: 409 },
    );
  }

  const { error } = await createContact({
    email,
    source: "newsletter",
    subscribeToNewsletter: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send welcome email
  await resend.emails.send({
    from: "Company <noreply@example.com>",
    to: [email],
    subject: "Welcome to our Newsletter",
    html: `<h2>Thanks for subscribing!</h2>...`,
  });

  return NextResponse.json({ success: true });
}
```

### 3. Booking/Contact Form (Create Lead)

```typescript
// In booking or contact form API route
createContact({
  email,
  firstName,
  lastName,
  company,
  source: "booking", // or "contact"
}).catch((err) => console.error("Failed to create contact:", err));
```

### 4. Inbound Email Forwarding

```typescript
// Webhook handler for email.received
case "email.received":
  const forwardTo = process.env.EMAIL_FORWARD_TO?.split(",").map(e => e.trim());
  if (!forwardTo?.length) return;

  await resend.emails.send({
    from: "Forwarded <forwarded@example.com>",
    to: forwardTo,
    replyTo: event.data.from,
    subject: `[Fwd] ${event.data.subject}`,
    html: `
      <div style="padding: 16px; background: #f5f5f5;">
        <p><strong>From:</strong> ${event.data.from}</p>
        <p><strong>To:</strong> ${event.data.to?.join(", ")}</p>
      </div>
      <hr/>
      ${event.data.html || event.data.text}
    `,
    attachments: event.data.attachments,
  });
  break;
```

## Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxx

# Optional - for Audiences integration
RESEND_SEGMENT_NEWSLETTER=seg_xxxxx
RESEND_SEGMENT_LEADS=seg_xxxxx
RESEND_TOPIC_NEWSLETTER=top_xxxxx

# Optional - for email forwarding
EMAIL_FORWARD_TO=email1@example.com,email2@example.com
```

## Dashboard Setup (Required First)

**IMPORTANT:** Create these in the Resend dashboard BEFORE deploying code:

1. **Properties** (Audiences → Properties):
   - `domain` (text) - For multi-domain filtering
   - `source` (text) - How contact signed up
   - `company` (text) - Optional company name

2. **Segments** (Audiences → Segments):
   - Create segments for newsletter, leads
   - Copy IDs to env vars

3. **Topics** (Audiences → Topics):
   - Create topics for user preferences
   - Set default to Opt-in
   - Copy IDs to env vars

## Broadcasts

Use Resend dashboard for sending newsletters:
1. Go to Broadcasts → Create
2. Select segment to target
3. Use personalization: `{{{FIRST_NAME|there}}}`
4. Include unsubscribe: `{{{RESEND_UNSUBSCRIBE_URL}}}`
5. Send or schedule

## Common Patterns

### Sender Addresses

- `noreply@domain.com` - Automated notifications
- `contact@domain.com` - Contact form
- `booking@domain.com` - Calendar invites
- `forwarded@domain.com` - Forwarded inbound emails

### Team Notifications

Send internal notifications to a subdomain address that forwards:
```typescript
to: ["info@mail.domain.com"]  // Forwards via webhook
```

## Additional Resources

For detailed guidance, see the references directory:

- **`references/advanced-patterns.md`** - Multi-domain contact management, email routing systems, drip campaigns, contact enrichment, analytics
- **`references/api-reference.md`** - Complete API reference for Contacts, Emails, Audiences, Segments, Topics, Broadcasts, and Webhooks
- **`references/dashboard-setup.md`** - Step-by-step dashboard configuration, DNS setup, webhook configuration, testing procedures, and troubleshooting
