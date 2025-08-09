export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  // Prefer env var, but fall back to the provided build hook URL
  const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL || 'https://api.netlify.com/build_hooks/6896c0619f3d22c797ccf57b';
  try {
    await fetch(hookUrl, { method: 'POST' });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
