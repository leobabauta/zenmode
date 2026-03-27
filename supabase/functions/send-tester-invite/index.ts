import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

/**
 * Call this to send an invite email to an approved tester.
 * POST body: { tester_id: string }
 * Requires service_role or authenticated admin.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { tester_id } = await req.json();
    if (!tester_id) {
      return new Response(JSON.stringify({ error: 'Missing tester_id' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: tester, error } = await supabase
      .from('beta_testers')
      .select('*')
      .eq('id', tester_id)
      .single();

    if (error || !tester) {
      return new Response(JSON.stringify({ error: 'Tester not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const isAndroid = tester.platform === 'android';
    const installLink = isAndroid
      ? Deno.env.get('ANDROID_TEST_LINK') || 'https://play.google.com/store/apps/details?id=net.zenhabits.zenmode'
      : Deno.env.get('IOS_TEST_LINK') || 'https://testflight.apple.com/join/YOUR_CODE';

    const platformName = isAndroid ? 'Android' : 'iPhone';
    const feedbackLink = 'https://zenmode.work/tester-feedback/';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 0 auto; color: #1c1917;">
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Welcome to the zenmode beta!</h2>
        <p>Hi ${tester.name},</p>
        <p>You've been approved to test zenmode on ${platformName}. Here's how to get started:</p>
        <p><strong>1. Install the app:</strong><br/>
        <a href="${installLink}" style="color: #2563eb;">${isAndroid ? 'Get it on Google Play (closed testing)' : 'Install via TestFlight'}</a></p>
        <p><strong>2. Send feedback:</strong><br/>
        <a href="${feedbackLink}" style="color: #2563eb;">Submit bugs, issues, or feature requests</a></p>
        <p>Thanks for helping test zenmode!</p>
        <p>&mdash; Leo</p>
      </div>
    `;

    if (RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Leo from zenmode <noreply@zenmode.work>',
          to: [tester.email],
          subject: "You're in! Here's your zenmode beta invite",
          html: htmlBody,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        console.error('Resend error:', err);
        return new Response(JSON.stringify({ error: 'Email send failed' }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log('No RESEND_API_KEY. Would send invite to:', tester.email);
    }

    // Mark invite as sent
    await supabase
      .from('beta_testers')
      .update({ approved: true, invite_sent: true })
      .eq('id', tester_id);

    return new Response(JSON.stringify({ ok: true, email: tester.email }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-tester-invite error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
