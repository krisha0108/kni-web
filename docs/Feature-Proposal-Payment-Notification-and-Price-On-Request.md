# KNI Super App - Feature Proposal Document

**Document Version:** 1.0
**Date:** 10 March 2026
**Prepared For:** KNI Management
**Prepared By:** KNI Development Team

---

## Table of Contents

1. [Feature 1: Payment Received Notification](#feature-1-payment-received-notification)
2. [Feature 2: Price on Request (KNI Official Store)](#feature-2-price-on-request-kni-official-store)
3. [Implementation Recommendation](#implementation-recommendation)
4. [Timeline Summary](#timeline-summary)

---

---

# Feature 1: Payment Received Notification

## 1.1 Background

Currently, when a restaurant owner makes a payment (via QR Code / UPI) for marketplace products or equipment services, the payment screenshot is uploaded and sent to the vendor/admin for manual verification. Once the vendor/admin verifies the payment, the owner receives an **in-app notification only**.

The client has requested that upon successful payment verification, the owner should also receive a confirmation message via **WhatsApp, Email, or SMS** — so the owner has a reliable record that their payment has been received and verified.

## 1.2 Current Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT PAYMENT FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Owner makes payment via QR / UPI                            │
│       ↓                                                      │
│  Owner uploads payment screenshot in app                     │
│       ↓                                                      │
│  Payment request sent to Vendor/Admin (Status: PENDING)      │
│       ↓                                                      │
│  Vendor/Admin reviews screenshot                             │
│       ↓                                                      │
│  Vendor/Admin clicks "Verify" or "Reject"                    │
│       ↓                                                      │
│  ┌──────────────────────────────────────────┐                │
│  │ IF VERIFIED:                              │                │
│  │  • Order is created automatically         │                │
│  │  • In-app notification sent to owner  ✅  │                │
│  │  • Email notification                 ❌  │                │
│  │  • SMS notification                   ❌  │                │
│  │  • WhatsApp notification              ❌  │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 1.3 What Already Exists in Our System

Our system already has the infrastructure built for multiple notification channels. Below is the current readiness status:

| Channel | Infrastructure | Status | Notes |
|---------|---------------|--------|-------|
| In-App Notification | Firebase Cloud Messaging + Database | ✅ Ready & Active | Currently working for all payment events |
| Push Notification | Firebase Cloud Messaging (FCM) | ✅ Ready | Device tokens are stored, FCM configured |
| Email | Nodemailer (Gmail SMTP) | ✅ Ready | Email templates exist for service booking payments, needs marketplace templates |
| SMS | MSG91 / Twilio Integration | ✅ Ready | SMS service built, template system in place, needs marketplace templates |
| WhatsApp | Not yet integrated | ❌ Not Available | Requires new integration (see options below) |

> **Important Note:** For service booking payments, email and SMS notifications are already functional. Only marketplace payment notifications need to be added.

## 1.4 Proposed Notification Options

### Option A: Email Notification

**How it works:**
- When vendor/admin verifies payment → system sends email to owner's registered email
- Email contains: Payment amount, product details, order ID, vendor name, date/time
- Professional HTML email template with KNI branding

**Sample Email Content:**
```
Subject: Payment Verified - Order #MKT-A1B2C3D4

Dear [Owner Name],

Your payment of ₹12,500 has been verified successfully!

Order Details:
• Order ID: #MKT-A1B2C3D4
• Vendor: [Vendor Name]
• Items: 3 products
• Amount: ₹12,500
• Verified on: 10 March 2026, 2:30 PM

Your order has been placed automatically. The vendor will process
your order shortly.

View Order Details → [Button Link]
```

| Aspect | Detail |
|--------|--------|
| Development Time | 2-3 hours |
| Cost | Free (Gmail SMTP, limit 500/day) |
| Reliability | High |
| Owner Experience | Good - permanent record in email |

---

### Option B: SMS Notification

**How it works:**
- When vendor/admin verifies payment → system sends SMS to owner's registered phone number
- Short text message with key details

**Sample SMS Content:**
```
KNI: Payment of ₹12,500 verified for Order #MKT-A1B2C3D4.
Your order has been placed with [Vendor Name].
Track at: app.kni.com/orders
```

| Aspect | Detail |
|--------|--------|
| Development Time | 2-3 hours |
| Cost | ₹0.15 - ₹0.25 per SMS (via MSG91) |
| Reliability | Very High |
| Owner Experience | Instant, works without internet |

---

### Option C: WhatsApp Notification

**How it works:**
- When vendor/admin verifies payment → system sends WhatsApp message to owner's number
- Rich message with order details, can include images/buttons

**Sample WhatsApp Message:**
```
✅ Payment Verified!

Amount: ₹12,500
Order: #MKT-A1B2C3D4
Vendor: Kitchen Supplies Co.
Items: 3 products

Your order has been placed successfully.
The vendor will begin processing your order.

[View Order Details]
```

**WhatsApp Integration Sub-Options:**

| Provider | Setup Time | Cost per Message | Notes |
|----------|-----------|-----------------|-------|
| MSG91 WhatsApp | 2-3 days | ₹0.40 - ₹0.50 | Same provider as our SMS, easiest integration |
| Twilio WhatsApp | 2-3 days | ₹0.30 - ₹0.40 | Already integrated for SMS |
| WATI | 3-4 days | ₹0.50 - ₹0.70 | Dashboard included, chatbot support |
| Gupshup | 3-4 days | ₹0.35 - ₹0.45 | Popular in India |

**Requirements for WhatsApp:**
- Meta Business Verification (one-time, takes 2-5 business days)
- Message template approval from Meta (24-48 hours per template)
- WhatsApp Business API access

| Aspect | Detail |
|--------|--------|
| Development Time | 3-5 days (including Meta approvals) |
| Cost | ₹0.30 - ₹0.70 per message (provider dependent) |
| Reliability | Very High |
| Owner Experience | Best - most used messaging platform in India |

---

### Option D: Push Notification (Enhancement)

**How it works:**
- Rich push notification on owner's mobile device
- Tapping the notification opens the order details screen

| Aspect | Detail |
|--------|--------|
| Development Time | 1-2 hours |
| Cost | Free (Firebase FCM) |
| Reliability | Medium (needs app installed, internet required) |
| Owner Experience | Good - instant on mobile |

---

## 1.5 Recommendation

We recommend a **phased approach**:

| Phase | Channel | Timeline | Cost |
|-------|---------|----------|------|
| Phase 1 | Email + Push Notification | 1-2 days | Free |
| Phase 2 | SMS Notification | 1 day | ~₹0.20/SMS |
| Phase 3 | WhatsApp Notification | 3-5 days | ~₹0.40/message + Meta approval time |

**Phase 1** can be delivered immediately as all infrastructure exists. Phase 2 and 3 can follow based on priority.

## 1.6 Payment Types Covered

This notification feature will apply to all payment verification events:

| Payment Type | Verified By | Notification To |
|-------------|-------------|----------------|
| Marketplace Product Order (Vendor Store) | Vendor | Restaurant Owner |
| Marketplace Product Order (KNI Official Store) | Admin | Restaurant Owner |
| AMC Service Payment | Admin | Restaurant Owner |
| Vendor Commission Payment | Admin | Vendor |
| Vendor Subscription Payment | Admin | Vendor |

---

---

# Feature 2: Price on Request (KNI Official Store)

## 2.1 Background

The KNI Official Store (admin's marketplace store) sells products that may vary significantly in price based on quantity, customization, or market conditions. For high-value products, the admin wants the ability to **hide the price** and show **"Price on Request"** instead. This encourages owners to contact/engage before purchasing, allowing the admin to offer custom pricing.

## 2.2 Scope & Impact

| Aspect | Detail |
|--------|--------|
| Applies To | KNI Official Store products only |
| Impact on Vendors | **No impact** - vendor products remain unchanged |
| Impact on Owners | Selected products will show "Price on Request" instead of price |

> **Important:** This feature will **NOT** affect any vendor store product. Vendors will not see this option. It is exclusive to the KNI Official Store (Admin).

## 2.3 Proposed Flow Options

### Flow A: Simple Contact Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  FLOW A: SIMPLE CONTACT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADMIN SIDE:                                                 │
│  Admin opens KNI Official Store → Edit Product               │
│  Enables "Price on Request" toggle ✓                         │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                                              │
│  OWNER SIDE:                                                 │
│  Owner browses marketplace                                   │
│  Sees product with "Price on Request" label                  │
│  Sees "Contact for Pricing" with admin phone/WhatsApp        │
│  Owner contacts admin directly (phone/WhatsApp)              │
│  Admin discusses price offline                               │
│  Admin updates price and disables "Price on Request"         │
│  Owner can now order normally                                │
│                                                              │
│  ⚠ Product CANNOT be added to cart while Price on Request    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Very simple to implement (1-2 days) | Manual process for admin |
| No new database tables needed | No tracking of inquiries |
| Quick delivery | Same price shown to all owners after reveal |
| Zero complexity | Admin has to manually toggle ON/OFF |

---

### Flow B: Quote Request Flow (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                FLOW B: QUOTE REQUEST SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: OWNER BROWSES                                       │
│  ┌─────────────────────────────────┐                         │
│  │  Product Card                    │                         │
│  │  ┌───────────────────────────┐  │                         │
│  │  │      Product Image        │  │                         │
│  │  └───────────────────────────┘  │                         │
│  │  Commercial Deep Fryer          │                         │
│  │  KNI Official Store             │                         │
│  │                                 │                         │
│  │  💰 Price on Request            │                         │
│  │  [  Request Quote  ]            │                         │
│  └─────────────────────────────────┘                         │
│       ↓                                                      │
│  Step 2: OWNER REQUESTS QUOTE                                │
│  ┌─────────────────────────────────┐                         │
│  │  Request Quote Form              │                         │
│  │                                  │                         │
│  │  Product: Commercial Deep Fryer  │                         │
│  │  Quantity: [___10___]            │                         │
│  │  Message:  [Optional message___] │                         │
│  │                                  │                         │
│  │  [ Cancel ]    [ Send Request ]  │                         │
│  └─────────────────────────────────┘                         │
│       ↓                                                      │
│  Step 3: ADMIN RECEIVES REQUEST                              │
│  ┌─────────────────────────────────┐                         │
│  │  Quote Requests Dashboard        │                         │
│  │                                  │                         │
│  │  🔔 New Quote Request            │                         │
│  │  From: Raj's Kitchen             │                         │
│  │  Product: Commercial Deep Fryer  │                         │
│  │  Quantity: 10 units              │                         │
│  │  Message: "Need bulk pricing"    │                         │
│  │                                  │                         │
│  │  Your Price: [___₹42,000___]     │                         │
│  │  Valid Until: [___17 Mar 2026__] │                         │
│  │  Note: [___Bulk discount 15%___] │                         │
│  │                                  │                         │
│  │  [ Decline ]   [ Send Quote ]    │                         │
│  └─────────────────────────────────┘                         │
│       ↓                                                      │
│  Step 4: OWNER RECEIVES QUOTE                                │
│  ┌─────────────────────────────────┐                         │
│  │  🔔 Quote Received!              │                         │
│  │                                  │                         │
│  │  Commercial Deep Fryer           │                         │
│  │  Quantity: 10 units              │                         │
│  │  Quoted Price: ₹42,000/unit      │                         │
│  │  Total: ₹4,20,000               │                         │
│  │  Valid Until: 17 Mar 2026        │                         │
│  │  Note: "Bulk discount 15%"       │                         │
│  │                                  │                         │
│  │  [ Decline ]  [ Accept & Order ] │                         │
│  └─────────────────────────────────┘                         │
│       ↓                                                      │
│  Step 5: OWNER ACCEPTS                                       │
│  Product added to cart at quoted price (₹42,000)             │
│  Normal payment flow continues                               │
│  (QR/UPI → Screenshot → Vendor Verify → Order Created)       │
│                                                              │
│  ⏰ Quote expires after validity period (e.g., 7 days)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Benefits:**

| Benefit | Description |
|---------|-------------|
| Custom Pricing | Admin can offer different prices to different owners |
| Quantity-Based Pricing | 10 units vs 100 units can have different rates |
| Negotiation Record | All quotes tracked in system - full audit trail |
| Expiry Control | Quotes auto-expire, creating urgency for buyers |
| Professional | Owners see a structured business process |
| Notifications | Owner gets notified when quote is ready |

| Aspect | Detail |
|--------|--------|
| Development Time | 4-6 days |
| New Database Tables | 2 (QuoteRequest, QuoteResponse) |
| New Screens | Admin: Quote Requests Dashboard. Owner: My Quotes section |
| Impact on Vendors | None |
| Impact on Existing Flow | None - only adds new flow for "Price on Request" products |

---

### Flow C: Price Unlock Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 FLOW C: PRICE UNLOCK                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Owner sees "Price on Request"                               │
│       ↓                                                      │
│  Owner clicks "Request Price"                                │
│       ↓                                                      │
│  Admin gets notification                                     │
│       ↓                                                      │
│  Admin approves → Price unlocked for that specific owner     │
│       ↓                                                      │
│  Owner now sees actual price (same price as set by admin)    │
│       ↓                                                      │
│  Normal cart + order flow                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Simpler than Quote flow | No custom pricing per owner |
| Price reveal is per-owner | All approved owners see same price |
| Normal order flow after unlock | No quantity-based pricing |
| 2-3 days development | Less professional than Quote flow |

---

## 2.4 Flow Comparison

| Feature | Flow A (Contact) | Flow B (Quote) | Flow C (Unlock) |
|---------|:-:|:-:|:-:|
| Development Time | 1-2 days | 4-6 days | 2-3 days |
| Custom Price per Owner | ❌ | ✅ | ❌ |
| Quantity-Based Pricing | ❌ | ✅ | ❌ |
| In-System Tracking | ❌ | ✅ | ✅ |
| Quote Expiry | ❌ | ✅ | ❌ |
| Admin Effort | High (manual) | Low (in-system) | Medium |
| New DB Tables | 0 | 2 | 1 |
| Vendor Impact | None | None | None |
| Professional Feel | Basic | Premium | Good |
| Negotiation Support | ❌ | ✅ | ❌ |

## 2.5 Recommendation

**Flow B (Quote Request)** is recommended because:

1. Allows **different pricing for different owners** (bulk buyers get better rates)
2. **Quantity-based pricing** - admin can price based on order volume
3. All interactions **tracked in system** - useful for business analytics
4. **Quote expiry** creates buying urgency
5. **Professional experience** for restaurant owners
6. Complete **audit trail** for all pricing decisions

However, if speed is the priority, **Flow A (Simple Contact)** can be delivered in 1-2 days as an initial release, and upgraded to Flow B later.

---

---

# Implementation Recommendation

## Suggested Phased Approach

```
┌──────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASES                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  PHASE 1 (Week 1):                                            │
│  ├── Payment Notification: Email + Push               2 days  │
│  └── Price on Request: Simple Contact Flow (Flow A)   2 days  │
│                                                               │
│  PHASE 2 (Week 2):                                            │
│  ├── Payment Notification: SMS (MSG91)                1 day   │
│  └── Price on Request: Upgrade to Quote Flow (Flow B) 5 days  │
│                                                               │
│  PHASE 3 (Week 3-4):                                          │
│  ├── Payment Notification: WhatsApp Integration       4 days  │
│  └── Quote Flow: Mobile app support                   3 days  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

# Timeline Summary

| Feature | Phase | Approach | Estimated Time | Monthly Cost |
|---------|-------|----------|---------------|-------------|
| Payment: Email + Push | Phase 1 | Nodemailer + FCM | 2 days | Free |
| Price on Request: Basic | Phase 1 | Simple Contact | 2 days | Free |
| Payment: SMS | Phase 2 | MSG91 | 1 day | ~₹500-2000 (usage based) |
| Price on Request: Quote System | Phase 2 | Quote Request Flow | 5 days | Free |
| Payment: WhatsApp | Phase 3 | MSG91 WhatsApp API | 4 days | ~₹1000-3000 (usage based) |
| Quote System: Mobile App | Phase 3 | React Native screens | 3 days | Free |

**Total Estimated Development:** 15-17 working days (phased delivery)

---

**Note:** All timelines are estimates and may vary based on testing requirements and feedback cycles. Phase 1 deliverables can be ready for testing within the first week.

---

*Document End*
