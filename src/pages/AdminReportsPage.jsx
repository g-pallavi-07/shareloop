import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Flag, ShieldAlert } from 'lucide-react';
import { useAuth, useToast } from '../context/AppContext.jsx';
import {
  deleteListing,
  getReports,
  updateAccountStatus,
  updateReportStatus,
} from '../services/api.js';

const REPORT_STATUSES = [
  ['open', 'Open'],
  ['reviewing', 'Reviewing'],
  ['resolved', 'Resolved'],
  ['dismissed', 'Dismissed'],
];

function formatReportDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

export default function AdminReportsPage() {
  const { user, isLoggedIn } = useAuth();
  const { addToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') return undefined;
    let active = true;
    getReports()
      .then((items) => {
        if (!active) return;
        setReports(items);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isLoggedIn, user?.role]);

  async function changeStatus(reportId, status) {
    setBusy(reportId);
    try {
      await updateReportStatus(reportId, status);
      setReports((items) => items.map((item) => item.report_id === reportId ? { ...item, status } : item));
      addToast('Report status updated.', 'success');
    } catch (requestError) {
      addToast(requestError.message || 'Unable to update report status.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function takeListingAction(report) {
    if (!window.confirm(`Remove "${report.listing_title}" from the marketplace?`)) return;
    setBusy(report.report_id);
    try {
      await deleteListing(report.listing_id);
      setReports((items) => items.map((item) => item.report_id === report.report_id
        ? { ...item, listing_status: 'removed' } : item));
      addToast('Reported listing removed.', 'success');
    } catch (requestError) {
      addToast(requestError.message || 'Unable to remove the listing.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function toggleUserStatus(report) {
    const status = report.reported_user_status === 'suspended' ? 'active' : 'suspended';
    const action = status === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${action} ${report.reported_user_name}'s account?`)) return;
    setBusy(report.report_id);
    try {
      await updateAccountStatus(report.reported_user_id, status);
      setReports((items) => items.map((item) => item.report_id === report.report_id
        ? { ...item, reported_user_status: status } : item));
      addToast(`Account ${status === 'suspended' ? 'suspended' : 'reactivated'}.`, 'success');
    } catch (requestError) {
      addToast(requestError.message || `Unable to ${action.toLowerCase()} this account.`, 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <section className="admin-reports-page">
      <div className="container">
        <header className="admin-reports-header">
          <div>
            <p className="section-eyebrow">Administration</p>
            <h1>Reports</h1>
            <p>Review community reports and take appropriate action.</p>
          </div>
          <div className="admin-reports-header__count"><Flag size={19} /> {reports.length} reports</div>
        </header>

        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : error ? (
          <div className="empty-state"><p className="empty-state__body">{error}</p></div>
        ) : reports.length === 0 ? (
          <div className="empty-state admin-reports-empty">
            <div className="empty-state__icon"><ShieldAlert size={36} /></div>
            <h2 className="empty-state__heading">No reports to review</h2>
            <p className="empty-state__body">New listing and user reports will appear here.</p>
          </div>
        ) : (
          <div className="admin-report-list">
            {reports.map((report) => {
              const isListing = report.listing_id !== null;
              const targetLabel = isListing ? report.listing_title : report.reported_user_name;
              return (
                <article className="admin-report" key={report.report_id}>
                  <div className="admin-report__top">
                    <div>
                      <span className="admin-report__reason">{report.reason.replaceAll('_', ' ')}</span>
                      <span className="admin-report__date">{formatReportDate(report.created_at)}</span>
                    </div>
                    <label className="admin-report__status">
                      <span className="sr-only">Report status</span>
                      <select className="form-input form-select" value={report.status}
                        disabled={busy === report.report_id}
                        onChange={(event) => changeStatus(report.report_id, event.target.value)}>
                        {REPORT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="admin-report__target">
                    <strong>{isListing ? 'Listing' : 'User'}:</strong>{' '}
                    {isListing
                      ? <Link to={`/listing/${report.listing_id}`}>{targetLabel || `Listing #${report.listing_id}`}</Link>
                      : <Link to={`/users/${report.reported_user_id}`}>{targetLabel || `User #${report.reported_user_id}`}</Link>}
                  </p>
                  <p className="admin-report__reporter">
                    Reported by <Link to={`/users/${report.reporter_id}`}>{report.reporter_name}</Link>
                  </p>
                  {report.details && <p className="admin-report__details">{report.details}</p>}
                  <div className="admin-report__actions">
                    {isListing && report.listing_status !== 'removed' && (
                      <button className="btn btn--ghost btn--sm" disabled={busy === report.report_id}
                        onClick={() => takeListingAction(report)}>Remove listing</button>
                    )}
                    {!isListing && (
                      <button className="btn btn--ghost btn--sm" disabled={busy === report.report_id}
                        onClick={() => toggleUserStatus(report)}>
                        {report.reported_user_status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
