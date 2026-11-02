import { useState } from 'react';
import { submitReport } from '../services/api.js';
import { useToast } from '../context/AppContext.jsx';

const REASONS = [
  ['scam_fraud', 'Scam or fraud'],
  ['misleading_information', 'Misleading information'],
  ['inappropriate_content', 'Inappropriate content'],
  ['suspicious_behavior', 'Suspicious behavior'],
  ['other', 'Other'],
];

export default function ReportDialog({ targetType, targetId, targetLabel, onClose }) {
  const { addToast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await submitReport(targetType, targetId, reason, details);
      addToast('Thank you. Your report has been submitted for review.', 'success');
      onClose();
    } catch (error) {
      addToast(error.message || 'Unable to submit your report.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title"
        onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <h2 className="dialog__title" id="report-dialog-title">
          Report {targetType === 'listing' ? 'listing' : 'user'}
        </h2>
        <p className="dialog__sub">Tell us what concerns you about {targetLabel}.</p>
        <label className="form-group">
          <span className="form-label">Reason</span>
          <select className="form-input form-select" value={reason} onChange={(event) => setReason(event.target.value)} required>
            <option value="">Select a reason</option>
            {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="form-group report-dialog__details">
          <span className="form-label">Additional details (optional)</span>
          <textarea className="form-input form-textarea" maxLength={2000} value={details}
            onChange={(event) => setDetails(event.target.value)} placeholder="Share any helpful context." />
        </label>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn--dark" disabled={submitting || !reason}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>
    </div>
  );
}
