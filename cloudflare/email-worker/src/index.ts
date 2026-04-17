import PostalMime from 'postal-mime';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY?: string;
}

function cleanBody(body: string): string {
  const sigPatterns = [
    /^--\s*$/m,
    /^Sent from my /m,
    /^Get Outlook for /m,
    /^On .+ wrote:$/m,
    /^>{2,}/m,
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

function nanoid(size = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (b) => chars[b & 63]).join('');
}

async function createTask(
  env: Env,
  senderEmail: string,
  subject: string,
  plainBody: string,
): Promise<{ status: number; body: string }> {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Ignore automated emails
  if (senderEmail.endsWith('@cloudflare.com') || senderEmail.endsWith('@notify.cloudflare.com')) {
    return { status: 200, body: JSON.stringify({ success: true, skipped: true }) };
  }

  // Look up user by email (paginated)
  let userId: string | null = null;
  let page = 1;
  while (!userId) {
    const res = await fetch(
      `${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=500`,
      { headers },
    );
    if (!res.ok) break;
    const data: any = await res.json();
    const users = data.users || [];
    if (users.length === 0) break;
    const match = users.find((u: any) => u.email?.toLowerCase() === senderEmail);
    if (match) { userId = match.id; break; }
    if (users.length < 500) break;
    page++;
  }

  if (!userId) {
    return { status: 403, body: JSON.stringify({ error: 'Unknown sender' }) };
  }

  // Clean email content
  const cleanedBody = cleanBody(plainBody);
  let taskText = subject.replace(/^(?:fwd?|re):\s*/gi, '');
  if (!taskText && cleanedBody) {
    taskText = cleanedBody.split(/\r?\n/)[0].trim();
  }
  if (!taskText) {
    return { status: 400, body: JSON.stringify({ error: 'No task text found' }) };
  }

  // Use Claude to generate better task name
  let taskNotes: string | null = cleanedBody || null;
  if (env.ANTHROPIC_API_KEY) {
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `Turn this email into a task. Return JSON only, no other text.

Email subject: ${taskText || '(no subject)'}
Email body:
${cleanedBody || '(no body)'}

Return a JSON object with:
- "task": A clean task name (under 80 chars). Keep the core action, who it's from, and any project/tag info (e.g. "[FM26 Fall]"). Strip emojis, notification prefixes ("assigned you a task:"), and app boilerplate. Preserve people's names — say "from Amanda" not "from a colleague". Examples: "Review Marketing Ideas from Amanda [FM26 Fall]", "Reply to Sarah about Q3 budget".
- "notes": Brief summary of key details from the body, or null if no meaningful body.

JSON response:`,
          }],
        }),
      });
      if (claudeRes.ok) {
        const claudeData: any = await claudeRes.json();
        const content = claudeData?.content?.[0]?.text || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.task) taskText = parsed.task;
          if (parsed.notes !== undefined) taskNotes = parsed.notes || null;
        }
      }
    } catch {
      // Fall back to original subject/body
    }
  }

  // Get max inbox order
  const orderRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/items?select=order&user_id=eq.${userId}&day_key=is.null&is_later=eq.false&parent_id=is.null&order=order.desc&limit=1`,
    { headers },
  );
  const orderData: any = await orderRes.json();
  const nextOrder = ((orderData?.[0]?.order) ?? -1) + 1;
  const now = new Date().toISOString();

  // Insert task
  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/items`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      id: nanoid(),
      user_id: userId,
      type: 'task',
      text: taskText,
      completed: false,
      day_key: null,
      is_later: false,
      order: nextOrder,
      created_at: now,
      updated_at: now,
      notes: taskNotes,
    }),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return { status: 500, body: JSON.stringify({ error: `Failed to create task: ${err}` }) };
  }

  return { status: 200, body: JSON.stringify({ success: true, task_text: taskText }) };
}

export default {
  async email(message: ForwardableEmailMessage, env: Env) {
    try {
      const rawEmail = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const parsed = await parser.parse(rawEmail);

      let senderEmail = message.from.toLowerCase().trim();
      // Decode Cloudflare SRS
      const srsMatch = senderEmail.match(/^srs0=[^=]+=\w+=([^=]+)=([^@]+)@/);
      if (srsMatch) senderEmail = `${srsMatch[2]}@${srsMatch[1]}`;

      const subject = parsed.subject || '';
      const plainBody = parsed.text || '';

      const result = await createTask(env, senderEmail, subject, plainBody);

      if (result.status !== 200) {
        console.error(`Task creation failed: ${result.body}`);
        message.setReject(`Failed: ${result.status}`);
      }
    } catch (err) {
      console.error('Worker error:', err);
      message.setReject('Internal worker error');
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      try {
        const payload: any = await request.json();
        const senderEmail = (payload.envelope?.from || '').toLowerCase().trim();
        const subject = (payload.headers?.subject || '');
        const plainBody = payload.plain || '';
        const result = await createTask(env, senderEmail, subject, plainBody);
        return new Response(result.body, {
          status: result.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response('zenmode-email-worker OK');
  },
};
