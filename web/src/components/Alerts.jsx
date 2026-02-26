import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bell, Plus, Save, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchJson } from '../lib/api.js';
import { useAlertRules, useAlertDeliveries } from '../hooks/useAlerts.js';

const EMPTY_FORM = {
  name: '',
  enabled: true,
  scopeType: 'all',
  scopeValue: '',
  characteristic: '',
  operator: 'equals',
  matchValue: '',
  targetUrl: '',
  quietMinutes: 0,
};

function statusClass(status) {
  if (status === 'sent') return 'text-green-700 bg-green-50 border-green-200';
  if (status === 'suppressed') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

export default function Alerts() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [deliveryPage, setDeliveryPage] = useState(1);

  const { data: rules = [], isLoading: rulesLoading } = useAlertRules();
  const { data: deliveriesData, isLoading: deliveriesLoading } = useAlertDeliveries(deliveryPage, 15);
  const deliveries = deliveriesData?.deliveries ?? [];

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.id - a.id),
    [rules]
  );

  const saveRuleMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        return fetchJson(`/api/alerts/rules/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      return fetchJson('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'deliveries'] });
    },
    onError: (err) => {
      setError(err.message || 'Failed to save alert rule');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, enabled }) => fetchJson(`/api/alerts/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => fetchJson(`/api/alerts/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'deliveries'] });
      if (editingId) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    },
  });

  function onSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      quietMinutes: Number.parseInt(String(form.quietMinutes ?? 0), 10) || 0,
    };
    setError('');
    saveRuleMutation.mutate(payload);
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      enabled: rule.enabled,
      scopeType: rule.scopeType,
      scopeValue: rule.scopeValue ?? '',
      characteristic: rule.characteristic ?? '',
      operator: rule.operator,
      matchValue: rule.matchValue,
      targetUrl: rule.targetUrl,
      quietMinutes: rule.quietMinutes ?? 0,
    });
    setError('');
  }

  return (
    <div className="max-w-6xl mx-auto w-full py-4 sm:py-6 px-3 sm:px-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Alert Rules</h2>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Rule name"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="url"
            value={form.targetUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, targetUrl: e.target.value }))}
            placeholder="Webhook URL (https://...)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <select
            value={form.scopeType}
            onChange={(e) => setForm((prev) => ({ ...prev, scopeType: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All events</option>
            <option value="room">Room</option>
            <option value="accessory">Accessory</option>
            <option value="characteristic">Characteristic</option>
          </select>
          <input
            type="text"
            value={form.scopeValue}
            onChange={(e) => setForm((prev) => ({ ...prev, scopeValue: e.target.value }))}
            placeholder="Scope value (optional for All)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={form.characteristic}
            onChange={(e) => setForm((prev) => ({ ...prev, characteristic: e.target.value }))}
            placeholder="Characteristic filter (optional)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.operator}
            onChange={(e) => setForm((prev) => ({ ...prev, operator: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="equals">Equals</option>
            <option value="not_equals">Not equals</option>
            <option value="contains">Contains</option>
          </select>
          <input
            type="text"
            value={form.matchValue}
            onChange={(e) => setForm((prev) => ({ ...prev, matchValue: e.target.value }))}
            placeholder="Match value"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            max="10080"
            value={form.quietMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, quietMinutes: e.target.value }))}
            placeholder="Quiet period (minutes)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Enabled
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={saveRuleMutation.isPending}
            >
              {editingId ? <Save size={14} /> : <Plus size={14} />}
              {editingId ? 'Update Rule' : 'Create Rule'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setError('');
                }}
                className="rounded-lg px-3 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-4 space-y-2">
          {rulesLoading && <p className="text-sm text-gray-500">Loading rules...</p>}
          {!rulesLoading && sortedRules.length === 0 && (
            <p className="text-sm text-gray-500">No alert rules yet.</p>
          )}
          {sortedRules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-gray-200 p-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={clsx(
                  'text-xs px-2 py-1 rounded border',
                  rule.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                )}
                onClick={() => toggleRuleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
              >
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                type="button"
                className="text-sm font-medium text-gray-900 hover:text-blue-700"
                onClick={() => startEdit(rule)}
              >
                {rule.name}
              </button>
              <span className="text-xs text-gray-500">{rule.scopeType}{rule.scopeValue ? `: ${rule.scopeValue}` : ''}</span>
              <span className="text-xs text-gray-500">{rule.operator} {rule.matchValue}</span>
              <span className="text-xs text-gray-500">quiet {rule.quietMinutes}m</span>
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                onClick={() => deleteRuleMutation.mutate(rule.id)}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Deliveries</h3>
        <div className="space-y-2">
          {deliveriesLoading && <p className="text-sm text-gray-500">Loading deliveries...</p>}
          {!deliveriesLoading && deliveries.length === 0 && (
            <p className="text-sm text-gray-500">No deliveries yet.</p>
          )}
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx('text-xs px-2 py-1 rounded border', statusClass(delivery.status))}>
                  {delivery.status}
                </span>
                <span className="text-sm text-gray-900">{delivery.ruleName || `Rule #${delivery.ruleId}`}</span>
                <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(delivery.sentAt), { addSuffix: true })}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{delivery.targetUrl}</p>
              {delivery.error && <p className="text-xs text-red-600 mt-1">{delivery.error}</p>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeliveryPage((p) => Math.max(1, p - 1))}
            disabled={deliveryPage <= 1}
            className="text-xs rounded border border-gray-200 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {deliveriesData?.page ?? 1} of {deliveriesData?.pages ?? 1}</span>
          <button
            type="button"
            onClick={() => setDeliveryPage((p) => p + 1)}
            disabled={deliveryPage >= (deliveriesData?.pages ?? 1)}
            className="text-xs rounded border border-gray-200 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

