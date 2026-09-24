import React, { useState } from 'react';
import { ShieldAlert, Send, X, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { ApprovalActionType, ApprovalEntityType, EscalationTier } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getRequiredEscalationTier } from '../utils/rbac';

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEntityType: ApprovalEntityType;
  targetEntityId: string;
  targetEntityName: string;
  actionType: ApprovalActionType;
  proposedDiff?: {
    before?: any;
    after?: any;
  };
  complexId?: string;
  lineId?: string;
  stationId?: string;
  onSuccess: () => void;
}

export default function ApprovalRequestModal({
  isOpen,
  onClose,
  targetEntityType,
  targetEntityId,
  targetEntityName,
  actionType,
  proposedDiff,
  complexId,
  lineId,
  stationId,
  onSuccess,
}: ApprovalRequestModalProps) {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const escalationTier: EscalationTier = user?.role
    ? getRequiredEscalationTier(user.role, actionType, targetEntityType)
    : 'FACILITY_MANAGER';

  const getTierLabel = (tier: EscalationTier) => {
    switch (tier) {
      case 'GENERAL_MANAGER':
        return isRtl ? 'مدیر کل سیستم' : 'General Manager';
      case 'FACILITY_MANAGER':
        return isRtl ? 'مدیر مجموعه' : 'Facility Manager';
      case 'SPECIALIST':
        return isRtl ? 'سرپرست و کارشناس خط' : 'Line Specialist';
      default:
        return tier;
    }
  };

  const getEntityLabel = (type: ApprovalEntityType) => {
    switch (type) {
      case 'EQUIPMENT':
        return t('requests.entity_equipment');
      case 'TASK':
        return t('requests.entity_task');
      case 'STATION':
        return t('requests.entity_station');
      case 'LINE':
        return t('requests.entity_line');
      default:
        return type;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim()) {
      setError(isRtl ? 'ثبت علت و توجیه فنی برای ارسال درخواست الزامی است' : 'Please provide a rationale for this request.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/approval-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEntityType,
          targetEntityId,
          targetEntityName,
          actionType,
          proposedDiff,
          rationale: rationale.trim(),
          complexId,
          lineId,
          stationId,
          escalationTier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit approval request');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (isRtl ? 'خطا در ثبت درخواست' : 'Error submitting request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {t('requests.submit_approval_request')}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {t('requests.approval_required_notice')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action & Entity Summary */}
          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400">{t('requests.action_type')}:</span>
              <span className={`px-2 py-0.5 rounded-md font-semibold text-xs ${
                actionType === 'DELETE' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {actionType === 'DELETE' ? t('requests.action_delete') : t('requests.action_edit')}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400">{t('requests.target')}:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {getEntityLabel(targetEntityType)} - {targetEntityName}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">{t('requests.escalation_tier')}:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {getTierLabel(escalationTier)}
              </span>
            </div>
          </div>

          {/* Proposed Diff Preview if EDIT */}
          {actionType === 'EDIT' && proposedDiff && (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-2">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                {t('requests.diff_preview')}:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/40">
                  <div className="font-medium text-red-600 dark:text-red-400 mb-1">{t('requests.before')}:</div>
                  <pre className="text-[11px] whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                    {JSON.stringify(proposedDiff.before, null, 2)}
                  </pre>
                </div>
                <div className="bg-green-50/50 dark:bg-green-950/20 p-2 rounded-lg border border-green-100 dark:border-green-900/40">
                  <div className="font-medium text-green-600 dark:text-green-400 mb-1">{t('requests.after')}:</div>
                  <pre className="text-[11px] whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                    {JSON.stringify(proposedDiff.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Rationale Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {t('requests.rationale')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder={t('requests.rationale_placeholder')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-750 hover:to-amber-800 text-white rounded-xl text-xs font-medium shadow-md shadow-amber-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send size={15} className={isRtl ? 'rotate-180' : ''} />
              <span>{submitting ? t('common.loading') : t('requests.send_request_btn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
