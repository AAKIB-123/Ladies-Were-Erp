import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Building,
  Eye,
  X,
  FileCode,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { Badge } from '../../components/common/Badge';

interface AuditLogItem {
  _id: string;
  timestamp: string;
  userId: { _id: string; name: string; email: string; role: string };
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  locationId?: { _id: string; name: string; code: string };
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {};
      if (entityType) params.entityType = entityType;
      if (action) params.action = action;

      const res = await api.get('/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data.logs || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retrieve audit log trail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityType, action]);

  const getActionBadge = (actionName: string) => {
    if (actionName.includes('void')) {
      return <Badge variant="danger">{actionName}</Badge>;
    }
    if (actionName.includes('reconcile')) {
      return <Badge variant="provisional">{actionName}</Badge>;
    }
    if (actionName.includes('create')) {
      return <Badge variant="success">{actionName}</Badge>;
    }
    return <Badge variant="neutral">{actionName}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-pink-600" />
            <span>Tamper-Proof Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Immutable log of all financial corrections, voids, reconciliations, and critical system events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entity:</span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Entities</option>
              <option value="Sale">Sale</option>
              <option value="Purchase">Purchase</option>
              <option value="Expense">Expense</option>
              <option value="Payment">Payment</option>
              <option value="Inventory">Inventory</option>
              <option value="Location">Location</option>
              <option value="User">User</option>
              <option value="Product">Product</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action:</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Actions</option>
              <option value="sale_voided">sale_voided</option>
              <option value="sale_reconciled">sale_reconciled</option>
              <option value="purchase_created">purchase_created</option>
              <option value="purchase_corrected">purchase_corrected</option>
              <option value="expense_voided">expense_voided</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500">
          Total Logged Events: <span className="text-slate-900">{total}</span>
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl font-semibold">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Mandatory Audit Reason</th>
                <th className="py-3 px-4 text-center">Snapshot Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{log.entityType}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        #{log.entityId.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{log.userName}</span>
                      <span className="text-[11px] text-slate-500 block uppercase">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.locationId ? (
                        <span className="font-semibold text-slate-800">
                          {log.locationId.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Consolidated / Shared</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium">
                      {log.reason || <span className="text-slate-400 italic">No notes</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No audit records found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-pink-600" />
                <h3 className="text-base font-black text-slate-900">
                  Audit Snapshot Inspector ({selectedLog.action})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl">
              <div>
                <span className="text-slate-400 font-bold block uppercase">Recorded Timestamp:</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase">Acting User:</span>
                <span className="font-bold text-slate-800">
                  {selectedLog.userName} ({selectedLog.userRole})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase">Entity Target:</span>
                <span className="font-bold text-slate-800">
                  {selectedLog.entityType} ({selectedLog.entityId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase">Mandatory Reason:</span>
                <span className="font-bold text-slate-800">{selectedLog.reason || 'None provided'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before State */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  State Before Change
                </span>
                <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto max-h-56">
                  {selectedLog.beforeState
                    ? JSON.stringify(selectedLog.beforeState, null, 2)
                    : 'null (Initial Creation)'}
                </pre>
              </div>

              {/* After State */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  State After Change
                </span>
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto max-h-56">
                  {selectedLog.afterState
                    ? JSON.stringify(selectedLog.afterState, null, 2)
                    : 'null'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
