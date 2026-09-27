export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // 所有 /api/* 路由都进 Worker
    if (url.pathname.includes('/api/')) {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() }
  });
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // POST /api/subscriptions — 新增
  if (path.endsWith('/api/subscriptions') && method === 'POST') {
    return addSubscription(request, env);
  }

  // GET /api/subscriptions?user_id=xxx — 列表
  if (path.endsWith('/api/subscriptions') && method === 'GET') {
    return listSubscriptions(request, env, url);
  }

  // DELETE /api/subscriptions/:id — 删除
  const deleteMatch = path.match(/\/api\/subscriptions\/([^\/]+)$/);
  if (deleteMatch && method === 'DELETE') {
    return deleteSubscription(request, env, deleteMatch[1]);
  }

  return json({ error: 'Not found' }, 404);
}

async function addSubscription(request, env) {
  try {
    const body = await request.json();
    const userId = (body.user_id || '').trim();
    const name = (body.name || '').trim();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || 'USD').trim().toUpperCase();
    const cycle = body.cycle === 'yearly' ? 'yearly' : 'monthly';
    const category = (body.category || 'other').trim();
    const nextDue = (body.next_due || '').trim();

    if (!userId || userId.length < 8 || userId.length > 64) {
      return json({ error: 'Invalid user_id' }, 400);
    }
    if (!name || name.length > 80) {
      return json({ error: 'Name required (max 80 chars)' }, 400);
    }
    if (!isFinite(amount) || amount <= 0 || amount > 100000) {
      return json({ error: 'Amount must be between 0 and 100000' }, 400);
    }
    if (!['monthly', 'yearly'].includes(cycle)) {
      return json({ error: 'Cycle must be monthly or yearly' }, 400);
    }

    const result = await env.DB.prepare(
      'INSERT INTO subscriptions (user_id, name, amount, currency, cycle, category, next_due) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, name, amount, currency, cycle, category, nextDue || null).run();

    return json({ success: true, id: result.meta.last_row_id });
  } catch (err) {
    console.error('addSubscription error:', err);
    return json({ error: 'Could not save subscription' }, 500);
  }
}

async function listSubscriptions(request, env, url) {
  try {
    const userId = url.searchParams.get('user_id');
    if (!userId || userId.length < 8) {
      return json({ error: 'Invalid user_id' }, 400);
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, amount, currency, cycle, category, next_due, created_at FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return json({ subscriptions: results || [] });
  } catch (err) {
    console.error('listSubscriptions error:', err);
    return json({ error: 'Could not load subscriptions' }, 500);
  }
}

async function deleteSubscription(request, env, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = (body.user_id || '').trim();
    if (!userId || userId.length < 8) {
      return json({ error: 'Invalid user_id' }, 400);
    }

    const result = await env.DB.prepare(
      'DELETE FROM subscriptions WHERE id = ? AND user_id = ?'
    ).bind(parseInt(id), userId).run();

    if (result.meta.changes === 0) {
      return json({ error: 'Subscription not found' }, 404);
    }
    return json({ success: true });
  } catch (err) {
    console.error('deleteSubscription error:', err);
    return json({ error: 'Could not delete subscription' }, 500);
  }
}
