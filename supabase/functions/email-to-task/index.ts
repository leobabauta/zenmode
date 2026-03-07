import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nanoid } from 'https://esm.sh/nanoid@5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Extract list items from email body text. Returns null if no list found. */
function parseListItems(body: string): string[] | null {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const listLines: string[] = [];

  for (const line of lines) {
    // Match: - item, * item, • item, 1. item, 1) item, [] item, [ ] item
    const match = line.match(/^(?:[-*•]|\d+[.)]\s*|\[[\sx]?\]\s*)(.+)/i);
    if (match) {
      const text = match[1].trim();
      if (text) listLines.push(text);
    }
  }

  // Only treat as a list if we found at least 2 list items
  return listLines.length >= 2 ? listLines : null;
}

/** Strip common email signature patterns and quoted replies */
function cleanBody(body: string): string {
  // Remove everything after common signature markers
  const sigPatterns = [
    /^--\s*$/m,                    // --
    /^Sent from my /m,            // Sent from my iPhone/iPad
    /^Get Outlook for /m,         // Get Outlook for iOS
    /^On .+ wrote:$/m,            // On Mon, Jan 1... wrote:
    /^>{2,}/m,                    // >> quoted text
  ];

  let cleaned = body;
  for (const pattern of sigPatterns) {
    const match = cleaned.match(pattern);
    if (match?.index !== undefined) {
      cleaned = cleaned.slice(0, match.index);
    }
  }

  return cleaned.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const webhookSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
  if (webhookSecret) {
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('secret');
    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');
    if (querySecret !== webhookSecret && bearerToken !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // CloudMailin sends JSON with these fields:
    // - envelope.from, envelope.to
    // - headers.subject, headers.from, headers.to
    // - plain (plain text body)
    // - html (HTML body)
    const payload = await req.json();

    let senderEmail = (payload.envelope?.from || '').toLowerCase().trim();

    // Cloudflare Email Routing uses SRS (Sender Rewriting Scheme)
    // Format: srs0=hash=tt=originaldomain=user@forwardingdomain
    const srsMatch = senderEmail.match(/^srs0=[^=]+=\w+=([^=]+)=([^@]+)@/);
    if (srsMatch) {
      senderEmail = `${srsMatch[2]}@${srsMatch[1]}`;
      console.log(`SRS decoded sender: ${senderEmail}`);
    }
    const subject = payload.headers?.subject || '';
    const plainBody = payload.plain || '';

    if (!senderEmail) {
      return new Response(JSON.stringify({ error: 'No sender email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Look up the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(JSON.stringify({ error: 'Failed to look up user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ignore automated emails (e.g. Cloudflare verification)
    if (senderEmail.endsWith('@cloudflare.com') || senderEmail.endsWith('@notify.cloudflare.com')) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Sender email: "${senderEmail}"`);
    console.log(`Known users: ${userData.users.map((u) => u.email).join(', ')}`);

    const user = userData.users.find((u) => u.email?.toLowerCase() === senderEmail);
    if (!user) {
      console.log(`No user found for email: ${senderEmail}`);
      return new Response(JSON.stringify({ error: 'Unknown sender' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine tasks to create
    const tasks: string[] = [];
    const cleanedBody = cleanBody(plainBody);
    const listItems = parseListItems(cleanedBody);

    if (listItems) {
      // Body contains a list — each item becomes a task
      // Prepend subject as context if it's meaningful
      const prefix = subject && !subject.toLowerCase().startsWith('re:')
        ? `${subject}: `
        : '';
      for (const item of listItems) {
        tasks.push(prefix ? `${prefix}${item}` : item);
      }
    } else if (subject) {
      // Single task from subject line
      tasks.push(subject);
    } else if (cleanedBody) {
      // No subject — use first line of body
      const firstLine = cleanedBody.split(/\r?\n/)[0].trim();
      if (firstLine) tasks.push(firstLine);
    }

    if (tasks.length === 0) {
      return new Response(JSON.stringify({ error: 'No task text found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current max order in inbox
    const { data: existingItems } = await supabase
      .from('items')
      .select('order')
      .eq('user_id', user.id)
      .is('day_key', null)
      .eq('is_later', false)
      .is('parent_id', null)
      .order('order', { ascending: false })
      .limit(1);

    let nextOrder = (existingItems?.[0]?.order ?? -1) + 1;
    const now = new Date().toISOString();

    // Create item rows
    const rows = tasks.map((text) => ({
      id: nanoid(),
      user_id: user.id,
      type: 'task',
      text,
      completed: false,
      day_key: null,
      is_later: false,
      order: nextOrder++,
      created_at: now,
      updated_at: now,
      notes: cleanedBody || null,
    }));

    const { error: insertError } = await supabase.from('items').insert(rows);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create tasks' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created ${rows.length} task(s) for ${senderEmail} from email "${subject}"`);

    return new Response(JSON.stringify({
      success: true,
      tasks_created: rows.length,
      task_texts: tasks,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('email-to-task error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
