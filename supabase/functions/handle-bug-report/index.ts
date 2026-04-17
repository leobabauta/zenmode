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
  const repo = 'leobabauta/zenmode';

  try {
    const { message, user_email, url, userAgent } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

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
        user_email ? `**User:** ${user_email}` : '',
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

    // 2. Trigger Claude Code auto-fix workflow
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

    // 3. Send email notification
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
          text: `Bug report from ${user_email || 'unknown'}:\n\n${message}\n\n${issueNumber ? `GitHub Issue: https://github.com/${repo}/issues/${issueNumber}` : ''}`,
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
