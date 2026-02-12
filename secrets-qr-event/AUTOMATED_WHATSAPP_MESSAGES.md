# Automated WhatsApp Messages

This document lists all automated WhatsApp messages sent by the Event System.

## Overview

The system automatically sends WhatsApp notifications at various stages of the visitor journey. All messages are sent using WhatsApp Business API templates that must be registered in WhatsApp Business Manager first.

---

## 1. Visitor Welcome (`visitor_welcome`)

**Trigger**: Automatically sent **after visitor registration** (both public registration and admin-created visitors)

**Template Format**:
```
Welcome {{1}}! 

Thank you for registering for {{2}}.

Event Guide: {{3}}

Emergency Contact: {{4}}

 See you soon!
```

**Parameters**:
- `{{1}}`: Visitor name (automatically filled)
- `{{2}}`: Event name (admin-configurable via Notifications Console)
- `{{3}}`: Event guide URL/PDF link (admin-configurable via Notifications Console)
- `{{4}}`: Emergency contact number (admin-configurable via Notifications Console)

**Configuration**: Admin can configure variables {{2}}, {{3}}, and {{4}} in the Notifications Console under "Configure Visitor Welcome Message"

**Location**: `server/src/router.ts` - `/events/:slug/visitors/register` endpoint

---

## 2. Token Booked (`token_booked`)

**Trigger**: Automatically sent when a visitor books a consultation token

**Template Format**:
```
Hello {{1}},

Your consultation token has been booked!

Token Number: {{2}}

Please wait for your turn. We'll notify you when it's time.
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Location**: `server/src/router.ts` - `/events/:eventId/tokens` endpoint

---

## 3. Consultation Ready (`consultation_ready`)

**Trigger**: Automatically sent when token status changes to `IN_PROGRESS` (consultation starts)

**Template Format**:
```
Hello {{1}},

Your consultation is ready!

Token Number: {{2}}

Please proceed to the consultation area.
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Location**: `server/src/router.ts` - Token status update endpoint

---

## 4. Consultation Get Ready (`consultation_get_ready`)

**Trigger**: 
- Automatically sent when the last person is in consultation (next person in line)
- Can also be manually triggered by Expert via `/api/consultations/:consultationId/notify-get-ready`

**Template Format**:
```
Hello {{1}},

Get ready! Your consultation is next.

Token Number: {{2}}

Please be prepared to proceed shortly.
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Location**: `server/src/router.ts` - Token status update and manual notification endpoints

---

## 5. Order Completed (`order_completed`)

**Trigger**: Automatically sent when order status changes to `completed`

**Template Format**:
```
Hello {{1}},

Your order for {{2}} has been completed and is ready for processing.

Thank you for your purchase!
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Product name

**Location**: `server/src/router.ts` - Order status update endpoint

---

## 6. Thank You with Feedback (`thank_you_feedback`)

**Trigger**: Automatically sent when token status changes to `DONE` (consultation completed)

**Template Format**:
```
Hello {{1}},

Thank you for visiting us at {{2}}!

We hope you had a wonderful experience. Your feedback is valuable to us.

Please share your feedback: {{3}}

Thank you for being part of our event! 🙏
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Event name
- `{{3}}`: Feedback link (from event themeConfig.feedbackLink or DEFAULT_FEEDBACK_LINK env var)

**Location**: `server/src/router.ts` - Token status update endpoint

---

## 7. Visitor Registration (`visitor_registration`)

**Trigger**: Automatically sent when admin creates a visitor (after OTP verification)

**Template Format**:
```
Hello {{1}},

Your registration for the event is complete!

You can log in using this link: {{2}}

Thank you for joining us!
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Login link (with JWT token)

**Location**: `server/src/router.ts` - `/admin/event/:eventId/visitors` endpoint

---

## 8. OTP Verification (`otp_verification`)

**Trigger**: Automatically sent when visitor requests OTP during registration

**Template Format**:
```
Your verification code is: {{1}}

Please enter this code to complete your registration.

This code is valid for 10 minutes.
```

**Parameters**:
- `{{1}}`: OTP code (6 digits)

**Location**: `server/src/router.ts` - `/otp/request` endpoint

---

## 9. Announcement (`announcement` or `event_information_update`)

**Trigger**: Manually triggered by Admin via Notifications Console or API endpoint

**Template Format**:
```
Event Information Update: {{1}}

{{2}}

This is an important update regarding your event participation.
```

**Parameters**:
- `{{1}}`: Announcement title
- `{{2}}`: Announcement message/content

**Batch Processing**: Automatically splits into batches of 250 recipients if >250 visitors

**Location**: `server/src/router.ts` - `/admin/event/:eventId/announcements/send` endpoint

---

## Summary Table

| Template Key | Trigger | Parameters | Configurable |
|-------------|---------|------------|--------------|
| `visitor_welcome` | After registration | Name, Event Name, Guide URL, Emergency Contact | ✅ Yes (Event Name, Guide, Contact) |
| `token_booked` | Token booking | Name, Token Number | ❌ No |
| `consultation_ready` | Consultation starts | Name, Token Number | ❌ No |
| `consultation_get_ready` | Next in line | Name, Token Number | ❌ No |
| `order_completed` | Order completed | Name, Product Name | ❌ No |
| `thank_you_feedback` | Consultation done | Name, Event Name, Feedback Link | ✅ Yes (Feedback Link via themeConfig) |
| `visitor_registration` | Admin creates visitor | Name, Login Link | ❌ No |
| `otp_verification` | OTP request | OTP Code | ❌ No |
| `announcement` | Admin manual | Title, Message | ❌ No |

---

## Configuration

### Visitor Welcome Message Configuration

Admin can configure the visitor welcome message variables in the Notifications Console:

1. Navigate to: `/admin/event/:eventId/notifications`
2. Scroll to "Configure Visitor Welcome Message" section
3. Configure:
   - **Event Name ({{2}})**: The event name displayed in the message
   - **Event Guide URL ({{3}})**: URL to the event guide PDF or document
   - **Emergency Contact ({{4}})**: Emergency contact number in international format

These values are stored in the event's `themeConfig` as:
- `visitorWelcomeEventName`
- `visitorWelcomeEventGuide`
- `visitorWelcomeEmergencyContact`

### Other Configurations

- **Feedback Link**: Configured in event `themeConfig.feedbackLink` or `DEFAULT_FEEDBACK_LINK` env var
- **Emergency Contact (fallback)**: `DEFAULT_EMERGENCY_CONTACT` env var
- **Welcome PDF Link (fallback)**: `DEFAULT_WELCOME_PDF_LINK` env var

---

## Notes

1. All templates must be registered in WhatsApp Business Manager first
2. Templates must be registered in the database via `/api/admin/event/:eventId/whatsapp-templates`
3. All messages use `language: "en"` (English)
4. WhatsApp messages are now **compulsory** for all visitors
5. Failed notifications are logged in `NotificationLog` table but don't block the main flow
6. Announcements are automatically batched (250 recipients per batch) to avoid API rate limits

---

## Testing Checklist

- [ ] Register new visitor → Should receive `visitor_welcome`
- [ ] Create token → Should receive `token_booked`
- [ ] Start consultation → Should receive `consultation_ready`
- [ ] Next person in line → Should receive `consultation_get_ready`
- [ ] Complete order → Should receive `order_completed`
- [ ] Complete consultation → Should receive `thank_you_feedback`
- [ ] Admin creates visitor → Should receive `visitor_registration`
- [ ] Request OTP → Should receive `otp_verification`
- [ ] Send announcement → Should receive `announcement` (test with >250 visitors for batch splitting)
