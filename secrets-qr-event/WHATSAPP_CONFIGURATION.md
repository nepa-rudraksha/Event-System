# WhatsApp Notification System Configuration

## Overview

All WhatsApp notifications are now **compulsory** for all visitors. The system automatically sends notifications at various stages of the event journey.

## Event Configuration

To configure event-specific settings (PDF link, emergency contact, feedback link), update the event's `themeConfig` JSON field:

### Configuration Structure

```json
{
  "welcomePdfLink": "https://example.com/event-guide.pdf",
  "emergencyContact": "+9779863832800",
  "feedbackLink": "https://example.com/feedback"
}
```

### Default Values

If not configured in `themeConfig`, the system uses environment variables:
- `DEFAULT_WELCOME_PDF_LINK` - Default PDF link for welcome message
- `DEFAULT_EMERGENCY_CONTACT` - Default emergency contact number
- `DEFAULT_FEEDBACK_LINK` - Default feedback link

### How to Update Event Configuration

**Via API:**
```bash
PATCH /api/admin/events/:eventId
Content-Type: application/json

{
  "themeConfig": {
    "welcomePdfLink": "https://your-domain.com/event-guide.pdf",
    "emergencyContact": "+9779863832800",
    "feedbackLink": "https://your-domain.com/feedback"
  }
}
```

**Via Database:**
Update the `themeConfig` JSON field in the `Event` table directly.

## Notification Flow

### 1. Registration → Welcome Message
- **Trigger**: Automatically after visitor registration (both public and admin-created)
- **Template**: `visitor_welcome`
- **Parameters**: Name, Event Name, PDF Link, Emergency Contact

### 2. Token Booking → Token Booked
- **Trigger**: Automatically when a token is created
- **Template**: `token_booked`
- **Parameters**: Name, Token Number

### 3. Consultation Ready → Consultation Ready
- **Trigger**: Automatically when token status changes to `IN_PROGRESS`
- **Template**: `consultation_ready`
- **Parameters**: Name, Token Number

### 4. Get Ready → Consultation Get Ready
- **Trigger**: 
  - Automatically when the last person is in consultation (next person in line)
  - Manually by Expert via `/api/consultations/:consultationId/notify-get-ready`
- **Template**: `consultation_get_ready`
- **Parameters**: Name, Token Number

### 5. Order Completed → Order Completed
- **Trigger**: Automatically when order status changes to `completed`
- **Template**: `order_completed`
- **Parameters**: Name, Product Name

### 6. Consultation Done → Thank You with Feedback
- **Trigger**: Automatically when token status changes to `DONE`
- **Template**: `thank_you_feedback`
- **Parameters**: Name, Event Name, Feedback Link

### 7. Announcements → Announcement
- **Trigger**: Manually by Admin via `/api/admin/event/:eventId/announcements/send`
- **Template**: `announcement`
- **Parameters**: Title, Message
- **Batch Splitting**: Automatically splits into batches of 250 recipients if >250 visitors

## API Endpoints

### Send Announcement
```bash
POST /api/admin/event/:eventId/announcements/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Important Announcement",
  "message": "Please proceed to the main hall for the closing ceremony."
}
```

**Response:**
```json
{
  "sent": 245,
  "failed": 5,
  "total": 250,
  "batches": 1,
  "message": "Announcement sent to 245 visitors in 1 batch(es)"
}
```

### Manual Get Ready Notification
```bash
POST /api/consultations/:consultationId/notify-get-ready
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Get ready notification sent"
}
```

## Template Registration

All templates must be registered in the database for each event:

```bash
POST /api/admin/event/:eventId/whatsapp-templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateKey": "visitor_welcome",
  "templateName": "Welcome Message",
  "description": "Welcome message sent after registration"
}
```

## Required Templates

1. ✅ `otp_verification` - OTP code
2. ✅ `visitor_welcome` - Welcome with PDF and emergency contact
3. ✅ `token_booked` - Token booking confirmation
4. ✅ `consultation_ready` - Consultation is ready
5. ✅ `consultation_get_ready` - Get ready for consultation
6. ✅ `order_completed` - Order processing complete
7. ✅ `announcement` - Admin announcements
8. ✅ `thank_you_feedback` - Thank you with feedback link

## Batch Processing

- Announcements are automatically split into batches of 250 recipients
- Each batch is sent sequentially to avoid API rate limits
- Failed batches are logged but don't stop other batches

## Error Handling

- All notification failures are logged in `NotificationLog` table
- Failed notifications don't block the main flow
- Errors are logged to console for debugging

## Testing

1. Register a new visitor → Should receive welcome message
2. Create a token → Should receive token booked message
3. Start consultation → Should receive consultation ready message
4. Next person in line → Should receive get ready message
5. Complete consultation → Should receive thank you message
6. Send announcement → Should receive announcement (test with >250 visitors for batch splitting)
