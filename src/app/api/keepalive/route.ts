import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { NextRequest } from 'next/server';

// Free Supabase projects are paused when they see too little database activity
// in a week ("a few requests per day"). Vercel Hobby crons run once a day, so
// each run issues several real queries instead of a single ping.
const STALE_REPORT_DAYS = 10;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const queries = [
    supabase
      .from('lineup_reports')
      .select('report_date')
      .order('report_date', { ascending: false })
      .limit(1),
    supabase.from('lineup_entries').select('id', { count: 'exact', head: true }),
    supabase.from('v_cargo_composition').select('*').limit(1),
    supabase.from('v_afretador_summary').select('*').limit(1),
  ];

  // Extra pings (GitHub Actions) only add activity; alerts come from the daily
  // Vercel cron so a problem produces one e-mail per day, not one per ping.
  const shouldAlert =
    request.headers.get('user-agent')?.startsWith('vercel-cron') ?? false;

  let latestReport: string | null = null;
  const errors: string[] = [];
  for (const query of queries) {
    try {
      const { data, error } = await query;
      if (error) {
        errors.push(error.message.slice(0, 300));
      } else if (!latestReport && data?.[0] && 'report_date' in data[0]) {
        latestReport = data[0].report_date as string;
      }
    } catch (e) {
      errors.push(String(e).slice(0, 300));
    }
  }

  if (errors.length > 0) {
    if (shouldAlert) {
      await sendAlert(
        'Lineup: banco de dados inacessível',
        `O keepalive diário não conseguiu consultar o Supabase.\n\n` +
          `Provável causa: projeto pausado por inatividade. Restaure em ` +
          `https://supabase.com/dashboard e confira o dashboard.\n\n` +
          `Erros:\n- ${errors.join('\n- ')}`
      );
    }
    return Response.json({ ok: false, errors }, { status: 500 });
  }

  const daysSinceReport = latestReport
    ? Math.floor((Date.now() - new Date(latestReport).getTime()) / 86_400_000)
    : null;

  if (
    shouldAlert &&
    daysSinceReport !== null &&
    daysSinceReport >= STALE_REPORT_DAYS
  ) {
    await sendAlert(
      'Lineup: nenhum relatório novo recebido',
      `O último relatório no banco é de ${latestReport!.slice(0, 10)} ` +
        `(${daysSinceReport} dias atrás). Verifique se os e-mails com o PDF ` +
        `estão chegando ao endereço de ingestão.`
    );
  }

  // A rejected sender is only logged by the webhook, so a new address at the
  // supplier would otherwise stop ingestion silently.
  if (shouldAlert) {
    const since = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const { data: rejected } = await supabase
      .from('ingestion_log')
      .select('created_at, error_message')
      .eq('status', 'rejected')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (rejected && rejected.length > 0) {
      await sendAlert(
        'Lineup: e-mail de remetente não autorizado',
        `${rejected.length} e-mail(s) foram rejeitados nas últimas 24h por ` +
          `remetente fora de ALLOWED_SENDERS. Se for o lineup, inclua o ` +
          `endereço (ou "@dominio") na variável na Vercel e reenvie o PDF ` +
          `pelo Admin → Upload.\n\n` +
          rejected
            .map(r => `- ${r.created_at.slice(0, 16)}: ${r.error_message}`)
            .join('\n')
      );
    }
  }

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    latest_report: latestReport,
    days_since_report: daysSinceReport,
  });
}

async function sendAlert(subject: string, text: string) {
  const recipients = (process.env.ALERT_EMAIL || '')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    console.error(`[keepalive] ${subject} (ALERT_EMAIL not set)`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  // One send per recipient: Resend rejects the whole request if any address
  // is not allowed (e.g. no verified domain), which would silence everyone.
  for (const to of recipients) {
    try {
      const { error } = await resend.emails.send({
        from: process.env.ALERT_FROM || 'Lineup Dashboard <onboarding@resend.dev>',
        to,
        subject,
        text,
      });
      if (error) console.error(`[keepalive] alert to ${to} failed:`, error.message);
    } catch (e) {
      console.error(`[keepalive] alert to ${to} failed:`, e);
    }
  }
}
