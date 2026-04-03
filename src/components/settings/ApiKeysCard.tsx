import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `zmk_${hex}`;
}

export function ApiKeysCard() {
  const user = useAuthStore((s) => s.user);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newKeyScope, setNewKeyScope] = useState<'items:read' | 'items:write'>('items:read');
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from('api_keys')
      .select('id, name, key_prefix, scope, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setKeys(data as ApiKey[]);
        setLoading(false);
      });
  }, [user]);

  const handleGenerate = async () => {
    if (!supabase || !user) return;
    setGenerating(true);

    const rawKey = generateRawKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: newKeyName.trim() || '',
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scope: newKeyScope,
      })
      .select('id, name, key_prefix, scope, created_at, last_used_at')
      .single();

    setGenerating(false);
    if (error) {
      console.error('Failed to create API key:', error);
      return;
    }

    setNewKeyRaw(rawKey);
    setCopied(false);
    setNewKeyName('');
    if (data) setKeys((prev) => [data as ApiKey, ...prev]);
  };

  const handleRevoke = async (id: string) => {
    if (!supabase) return;
    await supabase.from('api_keys').delete().eq('id', id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setRevokeId(null);
  };

  const handleCopy = () => {
    if (newKeyRaw) {
      navigator.clipboard.writeText(newKeyRaw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
      <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-1">API</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Generate API keys to access your items programmatically.
      </p>

      {/* Newly generated key banner */}
      {newKeyRaw && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40">
          <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">
            Copy this key now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 text-xs bg-white dark:bg-[var(--color-bg)] px-3 py-2 rounded-lg border border-green-200 dark:border-green-800/40 text-[var(--color-text-primary)] font-mono truncate select-all">
              {newKeyRaw}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setNewKeyRaw(null)}
            className="mt-2 text-xs text-green-700 dark:text-green-400 hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {/* Generate form */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (optional)"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm bg-[var(--color-input-settings)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
        <select
          value={newKeyScope}
          onChange={(e) => setNewKeyScope(e.target.value as 'items:read' | 'items:write')}
          className="text-xs px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
        >
          <option value="items:read">Read only</option>
          <option value="items:write">Read & Write</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {generating ? 'Generating...' : 'Generate key'}
        </button>
      </div>

      {/* Key list */}
      {loading ? (
        <p className="text-xs text-[var(--color-text-muted)] py-3">Loading keys...</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] py-3">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[var(--color-text-primary)]">
                    {key.key_prefix}...
                  </code>
                  {key.name && (
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">
                      {key.name}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                      key.scope === 'items:write'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                    )}
                  >
                    {key.scope === 'items:write' ? 'read & write' : 'read only'}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  Created {formatDate(key.created_at)}
                  {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                </div>
              </div>

              {revokeId === key.id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-red-500">Revoke?</span>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="px-2 py-1 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setRevokeId(null)}
                    className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRevokeId(key.id)}
                  className="flex-shrink-0 px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
