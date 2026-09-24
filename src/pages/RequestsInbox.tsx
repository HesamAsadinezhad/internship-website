import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  ShieldAlert, 
  Check, 
  X, 
  AlertCircle, 
  FileText, 
  User as UserIcon,
  Layers,
  ChevronDown,
  ArrowRight,
  Eye,
  RefreshCw
} from 'lucide-react';
import { PendingApprovalRequest, ApprovalStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { canReviewRequest, getRoleTitle, getRoleTier } from '../utils/rbac';
import { 
  getLocalizedEquipmentName, 
  getLocalizedTaskName, 
  getLocalizedUserName, 
  getLocalizedEntityType, 
  getLocalizedEscalationTier 
} from '../utils/hierarchyLocalization';

export default function RequestsInbox() {
  const { user } = useAuth();
  const { t, isRtl, formatDate, language } = useLanguage();
  
  const [requests, setRequests] = useState<PendingApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / State for Actions
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedDiffRequest, setSelectedDiffRequest] = useState<PendingApprovalRequest | null>(null);

  const getLocalizedTargetName = (name: string, entityType: string) => {
    if (entityType === 'EQUIPMENT') return getLocalizedEquipmentName(name, language);
    if (entityType === 'TASK') return getLocalizedTaskName(name, language);
    return name;
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approval-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (reqItem: PendingApprovalRequest) => {
    const targetTitle = getLocalizedTargetName(reqItem.targetEntityName, reqItem.targetEntityType);
    if (!window.confirm(isRtl ? `آیا از تأیید و اعمال این درخواست (${targetTitle}) در سیستم اطمینان دارید؟` : `Approve and apply this request (${targetTitle})?`)) {
      return;
    }

    setProcessingId(reqItem.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/approval-requests/${reqItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to approve');
      }

      setFeedback({
        type: 'success',
        message: t('requests.approved_notice'),
      });
      fetchRequests();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'خطا در تایید درخواست' : 'Error approving request'),
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequestId || !rejectionReason.trim()) return;

    setProcessingId(rejectingRequestId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/approval-requests/${rejectingRequestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reject');
      }

      setFeedback({
        type: 'success',
        message: t('requests.rejected_notice'),
      });
      setRejectingRequestId(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'خطا در رد درخواست' : 'Error rejecting request'),
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.targetEntityName || '').toLowerCase().includes(q);
      const matchInitiator = (r.initiatorName || '').toLowerCase().includes(q);
      const matchRationale = (r.rationale || '').toLowerCase().includes(q);
      return matchName || matchInitiator || matchRationale;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={13} className="animate-pulse" />
            {t('requests.pending_badge')}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={13} />
            {t('requests.approved_badge')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle size={13} />
            {t('requests.rejected_badge')}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-2xl">
              <Inbox size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('requests.title')}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('requests.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{pendingCount} {t('requests.pending_count')}</span>
            </div>
          )}
          <button
            onClick={fetchRequests}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition"
            title="بروزرسانی"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {status === 'ALL' && t('requests.filter_all')}
              {status === 'PENDING' && t('requests.filter_pending')}
              {status === 'APPROVED' && t('requests.filter_approved')}
              {status === 'REJECTED' && t('requests.filter_rejected')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="w-full px-3.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* Requests Table / Cards */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500">
          <Inbox size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">{t('requests.no_requests')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((reqItem) => {
            const userCanReview = canReviewRequest(user?.role, reqItem.escalationTier) && reqItem.status === 'PENDING';

            return (
              <div
                key={reqItem.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Summary and Target */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {getStatusBadge(reqItem.status)}

                      <span className={`px-2.5 py-0.5 rounded-md font-semibold text-xs ${
                        reqItem.actionType === 'DELETE'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {reqItem.actionType === 'DELETE' ? t('requests.action_delete') : t('requests.action_edit')}
                      </span>

                      <span className="text-gray-400">•</span>

                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        {getLocalizedEntityType(reqItem.targetEntityType, language)}
                      </span>

                      <span className="text-gray-400">•</span>

                      <span className="text-gray-400 text-[11px]" dir="ltr">
                        {isRtl 
                          ? `${new Date(reqItem.createdAt).toLocaleDateString('fa-IR')} (${new Date(reqItem.createdAt).toLocaleDateString('en-US')})`
                          : `${new Date(reqItem.createdAt).toLocaleDateString('en-US')} (${new Date(reqItem.createdAt).toLocaleDateString('fa-IR')})`
                        }
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {getLocalizedTargetName(reqItem.targetEntityName, reqItem.targetEntityType)}
                    </h3>

                    {/* Rationale */}
                    <div className="text-xs bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">
                        {t('requests.rationale')}:
                      </span>
                      {reqItem.rationale}
                    </div>

                    {/* Initiator & Escalation Tier */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <UserIcon size={14} className="text-gray-400" />
                        <span>{t('requests.initiator')}:</span>
                        <strong className="text-gray-700 dark:text-gray-200">
                          {getLocalizedUserName(reqItem.initiatorName, language)} ({getRoleTitle(reqItem.initiatorRole, isRtl)})
                        </strong>
                      </span>

                      <span>
                        <span>{t('requests.escalation_tier')}:</span>{' '}
                        <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {getLocalizedEscalationTier(reqItem.escalationTier, language)}
                        </strong>
                      </span>
                    </div>

                    {/* Resolution details if reviewed */}
                    {reqItem.status !== 'PENDING' && reqItem.reviewedBy && (
                      <div className="text-xs pt-2 border-t border-gray-100 dark:border-gray-700 text-gray-500">
                        <span>{t('requests.reviewed_by')}: </span>
                        <strong className="text-gray-700 dark:text-gray-200">
                          {getLocalizedUserName(reqItem.reviewedBy.name, language)}
                        </strong>
                        {reqItem.rejectionReason && (
                          <div className="mt-1 text-rose-600 dark:text-rose-400 font-medium">
                            {t('requests.rejection_reason')}: {reqItem.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions & Diff inspection */}
                  <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-700 shrink-0">
                    {/* View Diff Button if EDIT */}
                    {reqItem.proposedDiff && Object.keys(reqItem.proposedDiff).length > 0 && (
                      <button
                        onClick={() => setSelectedDiffRequest(reqItem)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition"
                      >
                        <Eye size={14} />
                        <span>{t('requests.diff_preview')}</span>
                      </button>
                    )}

                    {/* Action Buttons for Superior Reviewer */}
                    {userCanReview && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRejectingRequestId(reqItem.id)}
                          disabled={processingId === reqItem.id}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <X size={14} />
                          <span>{t('requests.reject_btn')}</span>
                        </button>

                        <button
                          onClick={() => handleApprove(reqItem)}
                          disabled={processingId === reqItem.id}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Check size={14} />
                          <span>{t('requests.approve_btn')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('requests.reject_btn')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('requests.rejection_prompt')}
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('requests.rejection_reason_placeholder')}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setRejectingRequestId(null); setRejectionReason(''); }}
                  className="px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim() || processingId === rejectingRequestId}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {t('requests.reject_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diff Inspection Modal */}
      {selectedDiffRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  {t('requests.diff_preview')}: {getLocalizedTargetName(selectedDiffRequest.targetEntityName, selectedDiffRequest.targetEntityType)}
                </h3>
                <span className="text-xs text-gray-500">
                  {selectedDiffRequest.actionType === 'DELETE' ? t('requests.action_delete') : t('requests.action_edit')} • {getLocalizedEntityType(selectedDiffRequest.targetEntityType, language)}
                </span>
              </div>
              <button
                onClick={() => setSelectedDiffRequest(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs max-h-[60vh] overflow-y-auto">
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40">
                <div className="font-semibold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                  <XCircle size={15} />
                  <span>{t('requests.before')}</span>
                </div>
                <pre className="text-[11px] whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
                  {JSON.stringify(selectedDiffRequest.proposedDiff?.before || {}, null, 2)}
                </pre>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>{t('requests.after')}</span>
                </div>
                <pre className="text-[11px] whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
                  {JSON.stringify(selectedDiffRequest.proposedDiff?.after || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setSelectedDiffRequest(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
