# Payment Integration Verification (Stripe)

## Pre-Launch Checklist

### Account Setup

- [ ] Business details verified (legal name, address, tax ID)
- [ ] Bank account connected and verified
- [ ] Statement descriptor set (what customers see on statements)
- [ ] Support email and phone configured
- [ ] Branding assets uploaded (logo, icon, colors)

### API Configuration

- [ ] Live API keys generated (not test keys!)
- [ ] Webhook signing secret stored securely
- [ ] API version pinned (don't use rolling latest)
- [ ] Error handling implemented for all API calls

### Webhook Endpoints

Required webhooks for subscriptions:
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
checkout.session.completed
```

For each webhook:
- [ ] Endpoint URL configured in Stripe dashboard
- [ ] Signing secret verified in code
- [ ] Idempotency handled (duplicate events)
- [ ] Failure alerting configured

### Test Transactions

Run these tests in live mode with real cards:
- [ ] Successful card payment
- [ ] 3D Secure authentication flow
- [ ] Subscription creation
- [ ] Subscription upgrade/downgrade
- [ ] Subscription cancellation
- [ ] Failed payment retry flow
- [ ] Refund processing

### Billing Portal

- [ ] Customer portal link accessible
- [ ] Customers can update payment method
- [ ] Customers can view invoice history
- [ ] Customers can cancel/downgrade (if allowed)
- [ ] Proration settings configured correctly

### Tax Compliance

- [ ] Stripe Tax enabled (if applicable)
- [ ] Tax registration numbers collected
- [ ] Invoice includes required tax information
- [ ] Tax rates configured per region

### Fraud Prevention

- [ ] Radar rules configured
- [ ] Block lists set up (if needed)
- [ ] 3D Secure required for high-risk transactions
- [ ] Velocity limits configured

## Common Integration Mistakes

### Webhook Failures
- Not verifying webhook signatures
- Not handling duplicate events
- No retry logic for failed processing
- Not logging webhook payloads for debugging

### Subscription Issues
- Not handling failed payments gracefully
- No dunning emails configured
- Immediate cancellation vs end of period
- Missing proration handling

### Security Issues
- API keys in client-side code
- Not using HTTPS for webhooks
- Storing full card numbers (use tokens)
- Missing PCI compliance considerations

## Go-Live Verification

Before announcing launch:

1. **Process a real transaction** with your own card
2. **Verify webhook delivery** in Stripe dashboard
3. **Check customer portal** works end-to-end
4. **Test subscription lifecycle** (create, upgrade, cancel)
5. **Verify invoices** include correct business details
6. **Check statement descriptor** appears correctly

## Monitoring After Launch

Set up alerts for:
- Payment failure rate > 5%
- Webhook delivery failures
- Unusual transaction patterns
- Chargeback notifications
- Subscription churn spikes
