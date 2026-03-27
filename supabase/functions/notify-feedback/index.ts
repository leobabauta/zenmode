const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { email, type, message } = await req.json();

    const typeLabels: Record<string, string> = {
      bug: 'Bug Report',
      problem: 'Something Frustrating/Confusing',
      feature: 'Feature Request',
    };

    const subject = `[zenmode tester] ${typeLabels[type] || type} from ${email}`;
    const body = `Type: ${typeLabels[type] || type}\nFrom: ${email}\n\n${message}`;

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'zenmode <noreply@zenmode.work>',
          to: ['leo.babauta@gmail.com'],
          subject,
          text: body,
        }),
      });
    } else {
      console.log('No RESEND_API_KEY set. Would have sent:', subject, body);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-feedback error:', err);
    return new Response(JSON.stringify({ error: 'Failed' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
