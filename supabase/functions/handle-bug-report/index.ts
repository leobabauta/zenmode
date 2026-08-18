const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const githubPat = Deno.env.get('GITHUB_PAT');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const repo = 'leobabauta/zenmode';

  try {
    const { message, user_email, url, userAgent } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Opaque reference that ties the public issue to the private record.
    // The repo is public, so the reporter's email must never reach the issue.
    const ref = `BR-${crypto.randomUUID().slice(0, 8)}`;

    // 1. Create GitHub Issue
    let issueNumber: number | null = null;
    if (githubPat) {
      const title = message.length > 80
        ? message.slice(0, 77) + '...'
        : message;

      const body = [
        `**Bug Report** (submitted via app)`,
        '',
        `**Description:**`,
        message,
        '',
        `**Reporter:** \`${ref}\` (identity held privately — this repo is public)`,
        url ? `**URL:** ${url}` : '',
        userAgent ? `**User Agent:** ${userAgent}` : '',
        '',
        '---',
        '_This issue was auto-created from an in-app bug report. Claude Code will attempt to auto-fix it._',
      ].filter(Boolean).join('\n');

      const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          labels: ['bug', 'auto-triage'],
        }),
      });

      if (issueRes.ok) {
        const issueData = await issueRes.json();
        issueNumber = issueData.number;
        console.log(`Created GitHub Issue #${issueNumber}`);
      } else {
        console.error(`GitHub Issue creation failed: ${issueRes.status} ${await issueRes.text()}`);
      }
    }

    // 2. Record the reporter privately, keyed by the ref in the public issue.
    // RLS is on with no policies, so only the service role can read this back.
    if (supabaseUrl && serviceRoleKey) {
      // Prefer the identity on the caller's JWT over the client-supplied email.
      let userId: string | null = null;
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { Authorization: authHeader, apikey: serviceRoleKey },
          });
          if (userRes.ok) userId = (await userRes.json())?.id ?? null;
        } catch (err) {
          console.error('Could not resolve reporter from JWT:', err);
        }
      }

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/bug_reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          ref,
          issue_number: issueNumber,
          user_id: userId,
          user_email: user_email ?? null,
          message,
          url: url ?? null,
          user_agent: userAgent ?? null,
        }),
      });

      if (!insertRes.ok) {
        // Non-fatal: the issue still exists and the notification email below
        // carries the reporter, so the report is never lost.
        console.error(`bug_reports insert failed: ${insertRes.status} ${await insertRes.text()}`);
      }
    }

    // 3. Trigger Claude Code auto-fix workflow
    if (githubPat && issueNumber) {
      const dispatchRes = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/auto-fix-bug.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubPat}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              issue_number: String(issueNumber),
              bug_description: message,
            },
          }),
        },
      );

      if (dispatchRes.ok || dispatchRes.status === 204) {
        console.log(`Dispatched auto-fix workflow for issue #${issueNumber}`);
      } else {
        console.error(`Workflow dispatch failed: ${dispatchRes.status} ${await dispatchRes.text()}`);
      }
    }

    // 4. Send email notification
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'zenmode <notifications@zenmode.work>',
          to: ['leo.babauta@gmail.com'],
          subject: `Bug Report${issueNumber ? ` #${issueNumber}` : ''}: ${message.slice(0, 60)}`,
          text: `Bug report from ${user_email || 'unknown'} (${ref}):\n\n${message}\n\n${issueNumber ? `GitHub Issue: https://github.com/${repo}/issues/${issueNumber}` : ''}`,
        }),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      issue_number: issueNumber,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    console.error('handle-bug-report error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
