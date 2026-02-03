---
name: resend-integration
description: Advanced Resend patterns and multi-domain strategies
---

# Advanced Patterns

## Multi-Domain Contact Management

### Domain-Based Segmentation

For agencies or multi-product companies:

```typescript
// lib/resend.ts
interface DomainConfig {
  domain: string;
  segmentNewsletter: string;
  segmentLeads: string;
  topicNewsletter: string;
  fromAddress: string;
}

const domainConfigs: Record<string, DomainConfig> = {
  "product-a.com": {
    domain: "product-a.com",
    segmentNewsletter: process.env.RESEND_SEGMENT_A_NEWSLETTER!,
    segmentLeads: process.env.RESEND_SEGMENT_A_LEADS!,
    topicNewsletter: process.env.RESEND_TOPIC_A_NEWSLETTER!,
    fromAddress: "Product A <noreply@product-a.com>",
  },
  "product-b.com": {
    domain: "product-b.com",
    segmentNewsletter: process.env.RESEND_SEGMENT_B_NEWSLETTER!,
    segmentLeads: process.env.RESEND_SEGMENT_B_LEADS!,
    topicNewsletter: process.env.RESEND_TOPIC_B_NEWSLETTER!,
    fromAddress: "Product B <noreply@product-b.com>",
  },
};

export async function createContactForDomain(
  domain: string,
  options: Omit<CreateContactOptions, "source"> & { source: ContactSource }
) {
  const config = domainConfigs[domain];
  if (!config) throw new Error(`Unknown domain: ${domain}`);

  // Use domain-specific segments and topics
  const segments: { id: string }[] = [];
  if (options.source === "newsletter") {
    segments.push({ id: config.segmentNewsletter });
  } else {
    segments.push({ id: config.segmentLeads });
  }

  const topics = options.subscribeToNewsletter
    ? [{ id: config.topicNewsletter, subscription: "opt_in" as const }]
    : [];

  return createContact({
    ...options,
    segments,
    topics,
    properties: {
      domain,
      source: options.source,
    },
  });
}
```

### Cross-Domain Analytics

```typescript
// Aggregate contacts across domains
export async function getContactsByDomain() {
  const { data: contacts } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });

  const byDomain = contacts?.reduce((acc, contact) => {
    const domain = contact.properties?.domain || "unknown";
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return byDomain;
}
```

---

## Advanced Webhook Handling

### Email Routing System

```typescript
// app/api/webhooks/resend/route.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailRoute {
  pattern: RegExp;
  handlers: string[]; // Email addresses to forward to
  autoReply?: boolean;
  replyTemplate?: string;
}

const routes: EmailRoute[] = [
  {
    pattern: /^support@/i,
    handlers: ["team@company.com", "support-lead@company.com"],
    autoReply: true,
    replyTemplate: "support-auto-reply",
  },
  {
    pattern: /^sales@/i,
    handlers: ["sales@company.com"],
    autoReply: true,
    replyTemplate: "sales-auto-reply",
  },
  {
    pattern: /^billing@/i,
    handlers: ["billing@company.com", "finance@company.com"],
  },
];

export async function POST(request: Request) {
  const payload = await request.json();
  const event = payload.data;

  if (payload.type !== "email.received") {
    return new Response("OK"); // Ignore other events
  }

  // Find matching route
  const toAddress = event.to[0];
  const route = routes.find((r) => r.pattern.test(toAddress));

  if (!route) {
    // Default: forward to admin
    await forwardEmail(event, ["admin@company.com"]);
    return new Response("OK");
  }

  // Forward to handlers
  await forwardEmail(event, route.handlers);

  // Send auto-reply if configured
  if (route.autoReply && route.replyTemplate) {
    await sendAutoReply(event, route.replyTemplate);
  }

  // Create lead from email
  await createLeadFromEmail(event);

  return new Response("OK");
}

async function forwardEmail(event: any, handlers: string[]) {
  await resend.emails.send({
    from: `Forwarded <forwarded@${event.to[0].split("@")[1]}>`,
    to: handlers,
    replyTo: event.from,
    subject: `[${event.to[0]}] ${event.subject}`,
    html: `
      <div style="background: #f5f5f5; padding: 16px; margin-bottom: 16px;">
        <p><strong>Original To:</strong> ${event.to.join(", ")}</p>
        <p><strong>From:</strong> ${event.from}</p>
        <p><strong>Received:</strong> ${new Date().toISOString()}</p>
      </div>
      ${event.html || `<pre>${event.text}</pre>`}
    `,
    attachments: event.attachments,
  });
}

async function sendAutoReply(event: any, template: string) {
  const templates: Record<string, { subject: string; body: string }> = {
    "support-auto-reply": {
      subject: "We received your support request",
      body: `
        <p>Hi there,</p>
        <p>We've received your support request and will get back to you within 24 hours.</p>
        <p>Ticket ID: ${Date.now()}</p>
        <p>- Support Team</p>
      `,
    },
    "sales-auto-reply": {
      subject: "Thanks for your interest",
      body: `
        <p>Hi there,</p>
        <p>Thanks for reaching out! Our sales team will contact you within 1 business day.</p>
        <p>- Sales Team</p>
      `,
    },
  };

  const t = templates[template];
  if (!t) return;

  await resend.emails.send({
    from: "Company <noreply@company.com>",
    to: [event.from],
    subject: t.subject,
    html: t.body,
  });
}

async function createLeadFromEmail(event: any) {
  // Extract name from email
  const name = event.from_name || event.from.split("@")[0];
  const email = event.from;

  // Create contact as lead
  await createContact({
    email,
    firstName: name,
    source: "contact",
    subscribeToNewsletter: false,
  }).catch(() => {}); // Ignore errors
}
```

---

## Broadcast Automation

### Drip Campaign Sequence

```typescript
// lib/campaigns.ts
interface CampaignStep {
  delayDays: number;
  template: string;
  subject: string;
  condition?: (contact: any) => boolean;
}

const onboardingCampaign: CampaignStep[] = [
  {
    delayDays: 0,
    template: "welcome",
    subject: "Welcome to Company!",
  },
  {
    delayDays: 3,
    template: "getting-started",
    subject: "Quick tips to get started",
  },
  {
    delayDays: 7,
    template: "feature-highlight",
    subject: "Have you tried this feature?",
  },
  {
    delayDays: 14,
    template: "case-study",
    subject: "How Company X achieved Y",
    condition: (contact) => !contact.properties?.hasLoggedIn,
  },
];

export async function enrollInCampaign(
  email: string,
  campaign: CampaignStep[]
) {
  // Store enrollment in your database
  // Trigger scheduled sends via cron job or queue
}
```

### Segment-Based Triggered Emails

```typescript
// Trigger emails based on contact behavior
export async function checkSegmentTriggers() {
  // Get contacts in specific segments
  const { data: newsletterContacts } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });

  // Filter by properties
  const newSignups = newsletterContacts?.filter(
    (c) =>
      c.created_at &&
      new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  // Send welcome to new signups
  for (const contact of newSignups || []) {
    await resend.emails.send({
      from: "Company <noreply@company.com>",
      to: [contact.email],
      subject: "Welcome!",
      html: welcomeTemplate,
    });
  }
}
```

---

## Contact Enrichment

### Enrich Contact Data

```typescript
// Enrich contacts with external data
export async function enrichContact(email: string) {
  // Get existing contact
  const { data: contact } = await resend.contacts.get({ email });

  if (!contact) return;

  // Enrich with Clearbit, Hunter, etc.
  // const enrichment = await clearbit.enrich(email);

  // Update with enriched data
  await resend.contacts.update({
    email,
    firstName: contact.first_name,
    lastName: contact.last_name,
    properties: {
      ...contact.properties,
      // company: enrichment.company.name,
      // title: enrichment.title,
      enriched: "true",
      enrichedAt: new Date().toISOString(),
    },
  });
}
```

---

## Analytics & Reporting

### Custom Dashboard Metrics

```typescript
// lib/analytics.ts
export async function getEmailMetrics(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // This would integrate with Resend's analytics API
  // or track sends in your own database

  return {
    period: `${days} days`,
    since: since.toISOString(),
    // metrics would come from your tracking
  };
}

// Track email events
export async function trackEmailEvent(
  event: "sent" | "delivered" | "opened" | "clicked" | "bounced",
  data: { email: string; messageId: string; campaign?: string }
) {
  // Store in your analytics database
  // await db.emailEvents.create({ ... });
}
```

---

## Testing & Development

### Test Contact Creation

```typescript
// __tests__/resend.test.ts
import { createContact } from "@/lib/resend";

describe("createContact", () => {
  it("should create a newsletter subscriber", async () => {
    const result = await createContact({
      email: "test@example.com",
      source: "newsletter",
      subscribeToNewsletter: true,
    });

    expect(result.error).toBeNull();
    expect(result.exists).toBe(false);
  });

  it("should handle duplicate emails", async () => {
    // First create
    await createContact({
      email: "duplicate@example.com",
      source: "newsletter",
    });

    // Second create should indicate exists
    const result = await createContact({
      email: "duplicate@example.com",
      source: "newsletter",
    });

    expect(result.exists).toBe(true);
  });
});
```

### Webhook Testing

```typescript
// Test webhook payload handling
const mockEmailReceived = {
  type: "email.received",
  data: {
    from: "sender@example.com",
    to: ["support@company.com"],
    subject: "Test email",
    html: "<p>Test content</p>",
    text: "Test content",
    attachments: [],
  },
};

// Use in tests
const response = await fetch("/api/webhooks/resend", {
  method: "POST",
  body: JSON.stringify(mockEmailReceived),
});
```
