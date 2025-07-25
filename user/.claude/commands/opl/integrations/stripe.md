---
description: General Stripe integration patterns and setup
allowed-tools: Bash, Read, Edit, MultiEdit, Write, Grep, Glob, Task
argument-hint: [search-term] | setup | test | webhook
---

## Your Task

If the arguments contain "--help", show this help:
**stripe** - General Stripe integration patterns and setup

**Usage:** `/stripe [topic]`

**Description:**
Comprehensive Stripe integration guide with code examples for Next.js App Router. Includes payment processing, webhooks, testing strategies, and common patterns.

**Arguments:**
- `setup`   : Initial Stripe SDK setup and configuration
- `test`    : Testing with test cards and webhook CLI
- `webhook` : Webhook handler implementation
- `<term>`  : Search for specific Stripe patterns
- `--help`  : Show this help message

**Examples:**
- `/stripe`         : Overview of Stripe integration
- `/stripe setup`   : SDK installation and environment setup
- `/stripe webhook` : Webhook endpoint implementation
- `/stripe checkout`: Checkout session examples

**Features:**
- Server-side API routes
- Client-side components
- Checkout sessions
- Payment intents
- Webhook handling
- Testing strategies

Then stop.

Otherwise, provide Stripe integration guidance:

# Stripe Integration Guide

$ARGUMENTS

## Quick Setup

1. **Install Stripe SDK**:
   ```bash
   npm install stripe @stripe/stripe-js @stripe/react-stripe-js
   # or
   bun add stripe @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Environment Variables**:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Common Patterns

### Server-Side API Route (Next.js App Router)
```typescript
// app/api/stripe/checkout/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: body.items,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/cancel`,
    });
    
    return Response.json({ sessionId: session.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
```

### Client-Side Component
```typescript
// components/checkout-button.tsx
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutButton({ items }: { items: any[] }) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    
    const { sessionId } = await response.json();
    await stripe?.redirectToCheckout({ sessionId });
  };
  
  return <button onClick={handleCheckout}>Checkout</button>;
}
```

### Webhook Handler
```typescript
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful payment
        break;
      case 'payment_intent.failed':
        // Handle failed payment
        break;
    }
    
    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
```

## Testing

1. **Test Cards**: https://stripe.com/docs/testing#cards
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. **Webhook Testing**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## Resources

- [Stripe Docs](https://stripe.com/docs)
- [Next.js Integration](https://github.com/vercel/next.js/tree/canary/examples/with-stripe-typescript)
- [Stripe Elements](https://stripe.com/docs/stripe-js)