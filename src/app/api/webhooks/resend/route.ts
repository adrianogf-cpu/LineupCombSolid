import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { ingestPdf } from '@/lib/ingest';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getAllowedSenders() {
  return (process.env.ALLOWED_SENDERS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const resend = getResend();
  const allowedSenders = getAllowedSenders();

  // 1. Read raw body FIRST (critical for HMAC signature verification)
  const payload = await request.text();

  // 2. Verify webhook signature — returns parsed payload on success, throws on failure
  let event: any;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id')!,
        timestamp: request.headers.get('svix-timestamp')!,
        signature: request.headers.get('svix-signature')!,
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    });
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3. Only handle email.received events
  if (event.type !== 'email.received') {
    return Response.json({ status: 'ignored' });
  }

  // 4. Validate sender
  const senderEmail = extractEmail(event.data.from).toLowerCase();
  if (!allowedSenders.includes(senderEmail)) {
    await logRejectedEmail(senderEmail, event.data.subject);
    return Response.json({ error: 'Unauthorized sender' }, { status: 403 });
  }

  // 5. Find PDF attachment
  const pdfAttachment = event.data.attachments?.find(
    (a: any) => a.filename?.toLowerCase().endsWith('.pdf')
  );
  if (!pdfAttachment) {
    return Response.json({ error: 'No PDF attachment' });
  }

  if (event.data.attachments.length > 1) {
    console.warn(`Email has ${event.data.attachments.length} attachments, processing only first PDF`);
  }

  // 6. Download attachment via Resend API
  let pdfBuffer: Buffer;
  try {
    const { data: attachmentData, error: attachmentError } = await resend.emails.receiving.attachments.get({
      emailId: event.data.email_id,
      id: pdfAttachment.id,
    });

    if (attachmentError || !attachmentData?.download_url) {
      console.error('Attachment API error:', { attachmentError, attachmentData, emailId: event.data.email_id, attachmentId: pdfAttachment.id });
      return Response.json({
        error: 'Failed to get attachment download URL',
        detail: attachmentError?.message || 'No download_url in response',
        emailId: event.data.email_id,
        attachmentId: pdfAttachment.id,
      }, { status: 500 });
    }

    const pdfResponse = await fetch(attachmentData.download_url);
    if (!pdfResponse.ok) {
      return Response.json({
        error: 'Failed to download attachment',
        detail: `HTTP ${pdfResponse.status} from download URL`,
      }, { status: 500 });
    }
    pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  } catch (e: any) {
    console.error('Attachment download exception:', e);
    return Response.json({
      error: 'Exception downloading attachment',
      detail: e.message,
    }, { status: 500 });
  }

  // 7. Ingest using shared logic
  const result = await ingestPdf(pdfBuffer, pdfAttachment.filename, 'email');

  // Return 200 for duplicates to prevent Resend retry loops
  const statusCode =
    result.status === 'completed' ? 201 :
    result.status === 'duplicate' ? 200 :
    500;

  return Response.json(result, { status: statusCode });
}

function extractEmail(from: string): string {
  const match = /<(.+?)>/.exec(from);
  return match ? match[1] : from;
}

async function logRejectedEmail(senderEmail: string, subject: string) {
  const supabase = createServiceClient();
  await supabase.from('ingestion_log').insert({
    filename: `rejected-email-from-${senderEmail}`,
    source: 'email',
    status: 'rejected',
    error_message: `Unauthorized sender: ${senderEmail}. Subject: ${subject}`,
  });
}
