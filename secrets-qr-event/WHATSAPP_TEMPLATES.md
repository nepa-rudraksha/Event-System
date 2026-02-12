# WhatsApp Template Formats

This document contains all required WhatsApp template formats for the Event System.

## Template Requirements

All templates must be created in WhatsApp Business API with the exact `templateKey` names listed below. The system will automatically use these templates when sending notifications.

---

## 1. OTP Verification (`otp_verification`)

**Purpose**: Send OTP code during registration/verification

**Template Format**:
```
Your verification code is: {{1}}

Please enter this code to complete your registration.

This code is valid for 10 minutes.
```

**Parameters**:
- `{{1}}`: OTP code (6 digits)

**Usage**: Automatically sent when visitor requests OTP

---

## 2. Welcome Message (`visitor_welcome`)

**Purpose**: Welcome message after successful registration with PDF and emergency contact

**Template Format**:
```
Welcome {{1}}! 🎉

Thank you for registering for {{2}}.

📄 Event Guide: {{3}}
📞 Emergency Contact: {{4}}

 See you soon!
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Event name
- `{{3}}`: PDF download link/URL
- `{{4}}`: Emergency contact number

**Usage**: Sent automatically after visitor registration is completed

---

## 3. Announcement (`announcement`)

**Purpose**: Send announcements to all visitors (admin-triggered)

**Template Format**:
```
📢 Announcement: {{1}}

{{2}}

Thank you for your attention.
```

**Parameters**:
- `{{1}}`: Announcement title
- `{{2}}`: Announcement message/content

**Usage**: Admin can trigger announcements to all visitors. System automatically splits into batches of 250 if needed.

---

## 4. Token Booked (`token_booked`)

**Purpose**: Notify visitor when their consultation token is booked

**Template Format**:
```
Hello {{1}},

Your consultation token has been booked successfully!

*Token Number: {{2}}*

Please wait for your turn. We'll notify you when your consultation is ready.

Thank you for joining us at the event.
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Usage**: Sent automatically when a token is created for the visitor

---

## 5. Consultation Ready (`consultation_ready`)

**Purpose**: Notify visitor that their consultation is ready

**Template Format**:
```
Hello {{1}},

Your consultation is now ready!

Please proceed to the consultation area. Our expert is waiting for you.

*Token Number: {{2}}*
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Usage**: Sent automatically when consultation status changes to IN_PROGRESS

---

## 6. Consultation Get Ready (`consultation_get_ready`)

**Purpose**: Notify visitor to get ready when they are next in line (last person currently in consultation)

**Template Format**:
```
Hello {{1}},

Your consultation is coming up soon!

Please be ready. We'll call you shortly for your consultation.

*Token Number: {{2}}*

You are next in line.
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Token number

**Usage**: 
- Automatically sent when the last person in consultation (when visitor becomes next in line)
- Can also be manually triggered by Expert

---

## 7. Order Completed (`order_completed`)

**Purpose**: Notify visitor when their order has been processed

**Template Format**:
```
Hello {{1}},

Your order *{{2}}* has been processed.

You can now come and pickup your Rudraksha.

Thank you for your purchase!
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Order number or product name

**Usage**: Sent automatically when order status changes to "completed"

---

## 8. Visitor Registration (`visitor_registration`)

**Purpose**: Send login link and QR code to admin-created visitors

**Template Format**:
```
Hello {{1}},

Your registration for the event is complete!

You can log in using this link: {{2}}

Thank you for joining us!
```

**Parameters**:
- `{{1}}`: Visitor name
- `{{2}}`: Login link (with token)

**Usage**: Sent automatically when admin creates a visitor (after OTP verification)

---

## 9. Thank You with Feedback (`thank_you_feedback`)

**Purpose**: Send thank you message with feedback link after consultation

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
- `{{3}}`: Feedback link (admin-configurable)

**Usage**: Sent automatically after consultation is completed (or after 6 hours, as configured)

---

## Template Registration

All templates must be registered in the database for each event using the admin panel or API:

**Endpoint**: `POST /api/admin/event/:eventId/whatsapp-templates`

**Example Request**:
```json
{
  "templateKey": "visitor_welcome",
  "templateName": "Welcome Message",
  "description": "Welcome message sent after registration with PDF and emergency contact"
}
```

---

## Notes

1. **Language**: All templates use `language: "en"` (English)
2. **Channel ID**: Default channel ID is `6971f3a7cb205bd2e61ce326` (configurable via `WHATSAPP_CHANNEL_ID` env var)
3. **Batch Limits**: Announcements are automatically split into batches of 250 recipients
4. **Consent**: WhatsApp messages are now compulsory for all visitors
5. **PDF Links**: Welcome message PDF link should be a publicly accessible URL
6. **Emergency Contact**: Should be a phone number in international format (e.g., +9779863832800)
7. **Feedback Link**: Admin can configure the feedback link per event

---

## Template Status

- ✅ `otp_verification` - Implemented
- ✅ `visitor_welcome` - Implemented
- ✅ `announcement` - Implemented
- ✅ `token_booked` - Implemented
- ✅ `consultation_ready` - Implemented
- ⏳ `consultation_get_ready` - To be implemented
- ✅ `order_completed` - Implemented
- ✅ `visitor_registration` - Implemented
- ⏳ `thank_you_feedback` - To be implemented
