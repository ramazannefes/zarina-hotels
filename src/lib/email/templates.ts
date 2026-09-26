// Branded responsive transactional email templates (inline styles for email clients).

export type BookingEmailData = {
  reference: string;
  hotelName: string;
  roomNames: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: string;
  total: string;
  guestName: string;
  manageUrl: string;
};

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FDFBF7;border:1px solid #E7DCC9;">
        <tr><td style="background:#1C1917;padding:28px 32px;text-align:center;">
          <div style="color:#D9B87C;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Zarina Hotels</div>
          <div style="color:#FDFBF7;font-size:22px;margin-top:6px;">All in Georgia</div>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="border-top:1px solid #E7DCC9;padding:20px 32px;color:#78716C;font-size:12px;text-align:center;">
          Zarina Hotels · Batumi, Georgia · +995 511 24 92 92<br>
          This is an automated message. Please do not reply directly.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function summaryTable(d: BookingEmailData): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7DCC9;margin:16px 0;">
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Reference</td><td style="padding:10px 14px;font-weight:bold;color:#1C1917;">${d.reference}</td></tr>
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Hotel</td><td style="padding:10px 14px;">${d.hotelName}</td></tr>
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Rooms</td><td style="padding:10px 14px;">${d.roomNames}</td></tr>
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Dates</td><td style="padding:10px 14px;">${d.checkIn} → ${d.checkOut} · ${d.nights} night${d.nights > 1 ? "s" : ""}</td></tr>
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Guests</td><td style="padding:10px 14px;">${d.guests}</td></tr>
    <tr><td style="padding:10px 14px;color:#78716C;font-size:12px;">Total</td><td style="padding:10px 14px;font-weight:bold;color:#8F7238;">${d.total}</td></tr>
  </table>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;"><tr><td style="background:#7A2E3A;padding:12px 28px;">
  <a href="${url}" style="color:#FDFBF7;text-decoration:none;font-size:14px;letter-spacing:1px;">${label}</a>
  </td></tr></table>`;
}

export function bookingConfirmationEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Booking confirmed — ${d.reference}`,
    html: layout(
      "Booking confirmed",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Thank you, ${d.guestName}</h1>
       <p style="color:#44403C;line-height:1.6;">Your stay at ${d.hotelName} is confirmed. We look forward to welcoming you to Georgia.</p>
       ${summaryTable(d)}
       ${button(d.manageUrl, "Manage your booking")}`,
    ),
  };
}

export function paymentConfirmationEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Payment received — ${d.reference}`,
    html: layout(
      "Payment received",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Payment confirmed</h1>
       <p style="color:#44403C;line-height:1.6;">We have received your payment of <strong>${d.total}</strong> for booking ${d.reference}.</p>
       ${summaryTable(d)}`,
    ),
  };
}

export function paymentFailedEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Payment unsuccessful — ${d.reference}`,
    html: layout(
      "Payment unsuccessful",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Payment could not be completed</h1>
       <p style="color:#44403C;line-height:1.6;">Your payment for booking ${d.reference} was unsuccessful. Your room is held until the hold expires — you can retry payment securely below.</p>
       ${summaryTable(d)}
       ${button(d.manageUrl, "Retry payment")}`,
    ),
  };
}

export function bookingCancelledEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Booking cancelled — ${d.reference}`,
    html: layout(
      "Booking cancelled",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Your booking has been cancelled</h1>
       <p style="color:#44403C;line-height:1.6;">Booking ${d.reference} at ${d.hotelName} has been cancelled. If a refund is due, it will be processed to your original payment method.</p>
       ${summaryTable(d)}`,
    ),
  };
}

export function refundConfirmationEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Refund processed — ${d.reference}`,
    html: layout(
      "Refund processed",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Refund on its way</h1>
       <p style="color:#44403C;line-height:1.6;">A refund of <strong>${d.total}</strong> for booking ${d.reference} has been processed. Depending on your bank, it may take 5–10 business days to appear.</p>`,
    ),
  };
}

export function upcomingStayEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Your stay is approaching — ${d.checkIn}`,
    html: layout(
      "Upcoming stay",
      `<h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">See you soon, ${d.guestName}</h1>
       <p style="color:#44403C;line-height:1.6;">Your stay at ${d.hotelName} begins on ${d.checkIn}. Check-in starts at 14:00; the front desk is open 24/7.</p>
       ${summaryTable(d)}`,
    ),
  };
}

export function adminNewBookingEmail(d: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `[ADMIN] New booking ${d.reference}`,
    html: layout(
      "New booking",
      `<h1 style="margin:0 0 8px;font-size:20px;color:#1C1917;">New booking received</h1>
       ${summaryTable(d)}`,
    ),
  };
}
