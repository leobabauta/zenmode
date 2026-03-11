import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nanoid } from 'https://esm.sh/nanoid@5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const subject = (payload.headers?.subject || '').replace(/^(?:fwd?|re):\s*/gi, '');
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
    console.log(`Subject: "${subject}"`);
    console.log(`Plain body: "${plainBody}"`);
    console.log(`HTML body present: ${!!payload.html}`);
    console.log(`Payload keys: ${Object.keys(payload).join(', ')}`);

    const user = userData.users.find((u) => u.email?.toLowerCase() === senderEmail);
    if (!user) {
      console.log(`No user found for email: ${senderEmail}`);
      return new Response(JSON.stringify({ error: 'Unknown sender' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a single task from subject (or first line of body)
    const cleanedBody = cleanBody(plainBody);
    let taskText = subject;
    if (!taskText && cleanedBody) {
      taskText = cleanedBody.split(/\r?\n/)[0].trim();
    }

    if (!taskText) {
      return new Response(JSON.stringify({ error: 'No task text found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use Claude to generate a better task name and notes from the email
    let taskNotes: string | null = cleanedBody || null;
    try {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (anthropicApiKey) {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            messages: [
              {
                role: 'user',
                content: `Analyze this email and create a task from it. Return JSON only, no other text.

Email subject: ${subject || '(no subject)'}
Email body:
${cleanedBody || '(no body)'}

Return a JSON object with:
- "task": A concise, action-oriented task name (under 80 chars). Start with a verb like "Reply to", "Review", "Follow up on", "Schedule", etc. Include who/what from the email.
- "notes": A brief summary of key details from the email body that would be useful context for the task. If there's no meaningful body content, set to null.

JSON response:`,
              },
            ],
          }),
        });

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json();
          const content = claudeData?.content?.[0]?.text || '';
          // Extract JSON from the response (handle possible markdown code blocks)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.task && typeof parsed.task === 'string') {
              taskText = parsed.task;
              console.log(`Claude generated task: "${taskText}"`);
            }
            if (parsed.notes !== undefined) {
              taskNotes = parsed.notes || null;
              console.log(`Claude generated notes: "${taskNotes}"`);
            }
          }
        } else {
          console.error(`Claude API error: ${claudeResponse.status} ${claudeResponse.statusText}`);
        }
      }
    } catch (claudeErr) {
      console.error('Claude API call failed, using fallback:', claudeErr);
      // Fall back to original subject/body — taskText and taskNotes already set
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

    const nextOrder = (existingItems?.[0]?.order ?? -1) + 1;
    const now = new Date().toISOString();

    const row = {
      id: nanoid(),
      user_id: user.id,
      type: 'task',
      text: taskText,
      completed: false,
      day_key: null,
      is_later: false,
      order: nextOrder,
      created_at: now,
      updated_at: now,
      notes: taskNotes,
    };

    const { error: insertError } = await supabase.from('items').insert([row]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created task for ${senderEmail} from email "${subject}"`);

    return new Response(JSON.stringify({
      success: true,
      tasks_created: 1,
      task_text: taskText,
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
