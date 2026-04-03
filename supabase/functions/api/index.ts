import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nanoid } from 'https://esm.sh/nanoid@5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// --- Auth ---

interface AuthResult {
  userId: string;
  scope: string;
}

async function authenticateApiKey(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith('zmk_')) return null;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('user_id, scope')
    .eq('key_hash', keyHash)
    .single();

  if (!keyRow) return null;

  // Fire-and-forget: update last_used_at
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)
    .then(() => {});

  return { userId: keyRow.user_id, scope: keyRow.scope };
}

// --- Helpers ---

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ItemRow {
  id: string;
  type: string;
  text: string;
  completed: boolean;
  day_key: string | null;
  is_later: boolean;
  order: number;
  is_priority: boolean;
  is_medium_priority: boolean;
  list_id: string | null;
  parent_id: string | null;
  is_archived: boolean;
  notes: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToApiItem(row: ItemRow) {
  return {
    id: row.id,
    type: row.type,
    text: row.text,
    completed: row.completed,
    dayKey: row.day_key,
    isLater: row.is_later,
    order: row.order,
    isPriority: row.is_priority,
    isMediumPriority: row.is_medium_priority,
    listId: row.list_id,
    parentId: row.parent_id,
    isArchived: row.is_archived,
    notes: row.notes,
    reminderAt: row.reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Handlers ---

async function handleListItems(
  supabase: SupabaseClient,
  userId: string,
  params: URLSearchParams,
  preset?: 'today' | 'inbox',
) {
  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .is('parent_id', null)
    .order('order', { ascending: true });

  if (preset === 'today') {
    query = query.eq('day_key', todayKey());
  } else if (preset === 'inbox') {
    query = query.is('day_key', null).eq('is_later', false).is('list_id', null);
  } else {
    // Apply filters from query params
    const dayKey = params.get('dayKey');
    const inbox = params.get('inbox');
    const later = params.get('later');
    const listId = params.get('listId');
    const completed = params.get('completed');

    if (dayKey) {
      query = query.eq('day_key', dayKey);
    } else if (inbox === 'true') {
      query = query.is('day_key', null).eq('is_later', false).is('list_id', null);
    } else if (later === 'true') {
      query = query.is('day_key', null).eq('is_later', true);
    }

    if (listId) {
      query = query.eq('list_id', listId);
    }

    if (completed === 'true') {
      query = query.eq('completed', true);
    } else if (completed === 'false') {
      query = query.eq('completed', false);
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('List items error:', error);
    return jsonResponse({ error: 'Failed to fetch items' }, 500);
  }

  return jsonResponse({ items: (rows as ItemRow[]).map(rowToApiItem) });
}

async function handleCreateItem(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const text = body.text;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return jsonResponse({ error: 'text is required' }, 400);
  }

  const type = body.type === 'note' ? 'note' : 'task';
  const dayKey = typeof body.dayKey === 'string' ? body.dayKey : null;
  const isLater = body.isLater === true;
  const listId = typeof body.listId === 'string' ? body.listId : null;
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;

  // Compute next order in the target container
  let orderQuery = supabase
    .from('items')
    .select('order')
    .eq('user_id', userId)
    .order('order', { ascending: false })
    .limit(1);

  if (parentId) {
    orderQuery = orderQuery.eq('parent_id', parentId);
  } else if (dayKey) {
    orderQuery = orderQuery.eq('day_key', dayKey).is('parent_id', null);
  } else if (isLater) {
    orderQuery = orderQuery.is('day_key', null).eq('is_later', true).is('parent_id', null);
  } else {
    orderQuery = orderQuery.is('day_key', null).eq('is_later', false).is('list_id', listId).is('parent_id', null);
  }

  const { data: existing } = await orderQuery;
  const nextOrder = (existing?.[0]?.order ?? -1) + 1;
  const now = new Date().toISOString();

  const row = {
    id: nanoid(),
    user_id: userId,
    type,
    text: text.trim(),
    completed: false,
    day_key: dayKey,
    is_later: isLater,
    order: nextOrder,
    is_priority: body.isPriority === true,
    is_medium_priority: body.isMediumPriority === true,
    list_id: listId,
    parent_id: parentId,
    is_archived: false,
    notes: typeof body.notes === 'string' ? body.notes : null,
    reminder_at: typeof body.reminderAt === 'string' ? body.reminderAt : null,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from('items').insert([row]);

  if (error) {
    console.error('Create item error:', error);
    return jsonResponse({ error: 'Failed to create item' }, 500);
  }

  return jsonResponse({ item: rowToApiItem(row as unknown as ItemRow) }, 201);
}

async function handleUpdateItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  body: Record<string, unknown>,
) {
  // Build snake_case patch from camelCase input
  const patch: Record<string, unknown> = {};
  if (typeof body.text === 'string') patch.text = body.text.trim();
  if (typeof body.completed === 'boolean') {
    patch.completed = body.completed;
    patch.completed_at = body.completed ? new Date().toISOString() : null;
  }
  if (body.dayKey !== undefined) patch.day_key = body.dayKey;
  if (typeof body.isLater === 'boolean') patch.is_later = body.isLater;
  if (typeof body.isPriority === 'boolean') patch.is_priority = body.isPriority;
  if (typeof body.isMediumPriority === 'boolean') patch.is_medium_priority = body.isMediumPriority;
  if (body.listId !== undefined) patch.list_id = body.listId;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (typeof body.order === 'number') patch.order = body.order;
  if (body.reminderAt !== undefined) patch.reminder_at = body.reminderAt;
  if (typeof body.isArchived === 'boolean') patch.is_archived = body.isArchived;

  if (Object.keys(patch).length === 0) {
    return jsonResponse({ error: 'No fields to update' }, 400);
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('items')
    .update(patch)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') return jsonResponse({ error: 'Item not found' }, 404);
    console.error('Update item error:', error);
    return jsonResponse({ error: 'Failed to update item' }, 500);
  }

  return jsonResponse({ item: rowToApiItem(data as ItemRow) });
}

async function handleDeleteItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
) {
  // Delete children first
  await supabase.from('items').delete().eq('parent_id', itemId).eq('user_id', userId);

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Delete item error:', error);
    return jsonResponse({ error: 'Failed to delete item' }, 500);
  }

  return jsonResponse({ success: true });
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authenticate
  const auth = await authenticateApiKey(req, supabase);
  if (!auth) {
    return jsonResponse({ error: 'Invalid or missing API key' }, 401);
  }

  // Check write scope
  const needsWrite = req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE';
  if (needsWrite && auth.scope === 'items:read') {
    return jsonResponse({ error: 'Insufficient scope. This key only has items:read access.' }, 403);
  }

  // Parse path — Supabase Edge Functions receive the full URL
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /today
    if (req.method === 'GET' && segments[0] === 'today') {
      return handleListItems(supabase, auth.userId, url.searchParams, 'today');
    }

    // GET /inbox
    if (req.method === 'GET' && segments[0] === 'inbox') {
      return handleListItems(supabase, auth.userId, url.searchParams, 'inbox');
    }

    // /items routes
    if (segments[0] === 'items') {
      const itemId = segments[1];

      if (req.method === 'GET' && !itemId) {
        return handleListItems(supabase, auth.userId, url.searchParams);
      }

      if (req.method === 'POST' && !itemId) {
        const body = await req.json();
        return handleCreateItem(supabase, auth.userId, body);
      }

      if (req.method === 'PATCH' && itemId) {
        const body = await req.json();
        return handleUpdateItem(supabase, auth.userId, itemId, body);
      }

      if (req.method === 'DELETE' && itemId) {
        return handleDeleteItem(supabase, auth.userId, itemId);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (err) {
    console.error('API error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
