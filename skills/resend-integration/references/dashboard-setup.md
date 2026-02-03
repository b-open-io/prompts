---
name: resend-integration
description: Dashboard setup and configuration guide
---

# Dashboard Setup Guide

## Initial Setup

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. Verify your account

### 2. Add Domain

1. Go to Domains → Add Domain
2. Enter your domain (e.g., `yourdomain.com`)
3. Choose region (US or EU)
4. Add DNS records:
   - **DKIM**: Add CNAME record
   - **SPF**: Add TXT record
   - **DMARC**: Add TXT record (optional but recommended)

### 3. Verify Domain

1. Add DNS records to your domain provider
2. Click "Verify" in Resend
3. Wait for propagation (can take up to 48 hours)

---

## Audiences Configuration

### Understanding the Single Audience

Resend provides ONE audience per account. Use these features to organize:

```
Audience (single)
├── Contacts (all subscribers)
├── Properties (custom data fields)
├── Segments (internal groupings)
├── Topics (user-facing preferences)
└── Broadcasts (campaigns)
```

### Setting Up Properties

1. Go to **Audiences → Properties**
2. Click **Create Property**
3. Add these recommended properties:

| Property | Type | Purpose |
|----------|------|---------|
| `domain` | Text | Multi-domain tracking |
| `source` | Text | Signup source |
| `company` | Text | Company name |
| `plan` | Text | Subscription tier |
| `signup_date` | Date | When they joined |

### Creating Segments

1. Go to **Audiences → Segments**
2. Click **Create Segment**
3. Define filter conditions:

**Example: Newsletter Subscribers**
```
Field: properties.source
Operator: equals
Value: newsletter
```

**Example: Paid Customers**
```
Field: properties.plan
Operator: is not empty
```

**Example: Multi-condition**
```
AND:
  - Field: properties.source
    Operator: equals
    Value: newsletter
  - Field: created_at
    Operator: after
    Value: 2024-01-01
```

### Creating Topics

1. Go to **Audiences → Topics**
2. Click **Create Topic**
3. Configure:

| Setting | Recommendation |
|---------|----------------|
| Name | Clear, user-facing (e.g., "Product Updates") |
| Description | What they'll receive |
| Default | Opt-in (users must explicitly subscribe) |
| Visibility | Public (shown on preference page) |

**Recommended Topics:**
- Product Updates
- Newsletter
- Security Alerts
- Marketing
- Beta Invites

---

## Inbound Email Setup

### Use Case: Support Email Without Workspace Conflict

If you use Google Workspace for `yourdomain.com`, use a subdomain for Resend:

#### 1. DNS Configuration

Add MX record for subdomain:
```
Type: MX
Name: mail
Content: inbound-smtp.us-east-1.amazonaws.com
Priority: 10
```

#### 2. Enable in Resend

1. Go to **Domains**
2. Click your domain
3. Go to **Inbound** tab
4. Enable receiving for `mail.yourdomain.com`

#### 3. Configure Webhook

1. In Resend, go to **Webhooks**
2. Add endpoint: `https://yourapp.com/api/webhooks/resend`
3. Select event: `email.received`

#### 4. Set Forwarding Address

In your application:
```env
EMAIL_FORWARD_TO=support@yourdomain.com,team@yourdomain.com
```

---

## API Keys

### Creating API Keys

1. Go to **API Keys**
2. Click **Create API Key**
3. Choose permissions:
   - **Sending**: Send emails only
   - **Full Access**: All operations

### Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxx

# Optional - for Audiences
RESEND_AUDIENCE_ID=aud_xxxxx
RESEND_SEGMENT_NEWSLETTER=seg_xxxxx
RESEND_SEGMENT_LEADS=seg_xxxxx
RESEND_TOPIC_NEWSLETTER=top_xxxxx

# Optional - for inbound email
EMAIL_FORWARD_TO=email1@example.com,email2@example.com
```

---

## Broadcasts (Newsletters)

### Creating a Broadcast

1. Go to **Broadcasts**
2. Click **Create Broadcast**
3. Configure:

**Audience:**
- Select segment or all contacts
- Exclude unsubscribed automatically

**Content:**
- Subject line
- HTML content
- Plain text fallback

**Personalization:**
```html
<p>Hi {{{FIRST_NAME|there}}},</p>
<p>Your plan: {{{properties.plan|free}}}</p>
```

**Unsubscribe:**
```html
<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
```

### Sending Options

- **Send Now**: Immediate delivery
- **Schedule**: Future date/time
- **Test**: Send to test addresses first

---

## Webhook Configuration

### Setting Up Webhooks

1. Go to **Webhooks**
2. Click **Add Endpoint**
3. Configure:

| Setting | Value |
|---------|-------|
| URL | `https://yourapp.com/api/webhooks/resend` |
| Events | Select relevant events |
| Secret | Generate and store securely |

### Recommended Events

**Minimum:**
- `email.bounced` - Handle invalid emails
- `email.complained` - Handle spam complaints

**Full tracking:**
- `email.sent`
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`
- `email.received` (if using inbound)

### Webhook Security

Verify webhook signature:
```typescript
import { createHmac } from "crypto";

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return signature === expected;
}
```

---

## Testing

### Test Email Sending

1. Go to **Emails**
2. Click **Send Test Email**
3. Enter recipient and content
4. Verify delivery

### Test Contacts

1. Go to **Audiences → Contacts**
2. Click **Add Contact**
3. Test with your email
4. Verify segments and topics applied

### Test Webhooks

Use webhook.site for testing:
1. Go to [webhook.site](https://webhook.site)
2. Copy temporary URL
3. Add as webhook endpoint in Resend
4. Trigger events and verify payload

---

## Monitoring

### Dashboard Metrics

Monitor in Resend dashboard:
- Delivery rate (target: >95%)
- Open rate
- Click rate
- Bounce rate (target: <2%)
- Complaint rate (target: <0.1%)

### Alerts

Set up alerts for:
- High bounce rate
- Spam complaints
- Delivery failures

---

## Best Practices

### Domain Reputation

1. **Warm up new domains**: Start with small volumes
2. **Authenticate properly**: DKIM, SPF, DMARC
3. **Monitor bounces**: Remove invalid emails promptly
4. **Honor unsubscribes**: Process immediately

### Contact Management

1. **Use properties**: Tag with domain, source, plan
2. **Segment strategically**: Targeted > mass
3. **Topics for preferences**: Let users choose
4. **Regular cleanup**: Remove bounced emails

### Sending Practices

1. **Consistent from address**: Build recognition
2. **Clear subject lines**: No spam triggers
3. **Plain text fallback**: Always include
4. **Test before send**: Preview on multiple clients

---

## Troubleshooting

### Domain Not Verifying

**Check:**
1. DNS records added correctly
2. No typos in record values
3. Propagation complete (wait 24-48 hours)
4. No conflicting records

**Test DNS:**
```bash
dig CNAME resend._domainkey.yourdomain.com
dig TXT yourdomain.com
```

### Emails Going to Spam

**Check:**
1. Domain authenticated (DKIM/SPF)
2. Content not spammy
3. Sending reputation good
4. List quality high (low bounces)

**Improve:**
1. Add DMARC record
2. Warm up domain gradually
3. Use double opt-in
4. Monitor engagement

### Webhooks Not Received

**Check:**
1. Endpoint URL accessible
2. HTTPS required (not HTTP)
3. No firewall blocking
4. Correct event types selected

**Debug:**
```bash
# Test endpoint
curl -X POST https://yourapp.com/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
