import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Package, ArrowRight, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useAuth, useToast } from '../context/AppContext.jsx';
import { deleteListing, getUserListings, getMyRequests, getIncomingRequests, updateRequestStatus } from '../services/api.js';

const TABS = ['Overview', 'My Listings', 'Requests Sent', 'Requests Received'];

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'status--pending', Icon: Clock },
    accepted: { label: 'Accepted', cls: 'status--accepted', Icon: CheckCircle },
    rejected: { label: 'Declined', cls: 'status--rejected', Icon: XCircle },
  };
  const { label, cls, Icon } = map[status] ?? { label: status, cls: '', Icon: Clock };
  return (
    <span className={`status-badge ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

export default function DashboardPage() {
  const { user, isLoggedIn } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('Overview');
  const [listings, setListings] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [updatingRequest, setUpdatingRequest] = useState(null);
  const [deletingListing, setDeletingListing] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    Promise.all([getUserListings(), getMyRequests(), getIncomingRequests()])
      .then(([myListings, sent, received]) => {
        setListings(myListings);
        setOutgoing(sent);
        setIncoming(received);
      })
      .catch((error) => addToast(error.message || 'Unable to load dashboard data.', 'error'));
  }, [addToast, isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  async function respondToRequest(requestId, status) {
    setUpdatingRequest(requestId);
    try {
      const updated = await updateRequestStatus(requestId, status);
      setIncoming((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      addToast(status === 'accepted' ? 'Request accepted.' : 'Request declined.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to update request.', 'error');
    } finally {
      setUpdatingRequest(null);
    }
  }

  async function removeListing(listing) {
    if (!window.confirm(`Delete "${listing.title}"? It will no longer appear in the marketplace.`)) return;
    setDeletingListing(listing.id);
    try {
      await deleteListing(listing.id);
      setListings((current) => current.filter((item) => item.id !== listing.id));
      addToast('Listing deleted.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to delete listing.', 'error');
    } finally {
      setDeletingListing(null);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="dashboard-page__header">
          <div className="dashboard-page__welcome">
            <div className="dashboard-page__avatar">{user?.name?.charAt(0) ?? '?'}</div>
            <div>
              <h1 className="dashboard-page__name">Hey, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="dashboard-page__dept">{user?.department} · {user?.year}</p>
            </div>
          </div>
          <button className="btn btn--dark" onClick={() => navigate('/create-listing')}>
            <Plus size={16} /> List an Item
          </button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="dashboard-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`dashboard-tabs__tab ${tab === t ? 'dashboard-tabs__tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Requests Received' && incoming.length > 0 && (
                <span className="dashboard-tabs__badge">{incoming.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────── */}
        {tab === 'Overview' && (
          <div className="dashboard-overview">
            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-card__num">{listings.length}</span>
                <span className="stat-card__label">Active Listings</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__num">{outgoing.length}</span>
                <span className="stat-card__label">Requests Sent</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__num">{incoming.length}</span>
                <span className="stat-card__label">Requests Received</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__num">{outgoing.filter((r) => r.status === 'completed').length}</span>
                <span className="stat-card__label">Completed Deals</span>
              </div>
            </div>
            <div className="dashboard-quick-actions">
              <h3 className="dashboard-quick-actions__title">Quick Actions</h3>
              <div className="dashboard-quick-actions__grid">
                <button className="quick-action" onClick={() => navigate('/create-listing')}>
                  <Plus size={20} /> <span>List an Item</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/marketplace')}>
                  <Package size={20} /> <span>Browse Marketplace</span>
                </button>
                <button className="quick-action" onClick={() => setTab('Requests Received')}>
                  <ArrowRight size={20} /> <span>View Incoming Requests</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── My Listings ───────────────────────────────────────── */}
        {tab === 'My Listings' && (
          <div className="dashboard-section">
            {listings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📦</div>
                <h3 className="empty-state__heading">No listings yet</h3>
                <p className="empty-state__body">Create your first listing and start sharing.</p>
                <button className="btn btn--dark" onClick={() => navigate('/create-listing')}>
                  <Plus size={16} /> List an Item
                </button>
              </div>
            ) : (
              <div className="dashboard-listings">
                {listings.map((l) => (
                  <div key={l.id} className="dashboard-listing-row">
                    <img src={l.images[0]} alt={l.title} className="dashboard-listing-row__img" />
                    <div className="dashboard-listing-row__info">
                      <Link to={`/listing/${l.id}`} className="dashboard-listing-row__title">{l.title}</Link>
                      <span className="dashboard-listing-row__meta">{l.categoryLabel} · {l.conditionLabel}</span>
                    </div>
                    <div className="dashboard-listing-row__stats">
                      <span>{l.requests ?? 0} request{l.requests !== 1 ? 's' : ''}</span>
                      <span>{l.views ?? 0} views</span>
                    </div>
                    <span className={`listing-type-badge listing-type-badge--${l.type}`}>
                      {l.type === 'sale' ? `₹${l.price}` : l.type === 'borrow' ? 'Borrow' : 'Free'}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm dashboard-listing-row__delete"
                      onClick={() => removeListing(l)}
                      disabled={deletingListing === l.id}
                      aria-label={`Delete ${l.title}`}
                    >
                      <Trash2 size={15} />
                      {deletingListing === l.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Requests Sent ─────────────────────────────────────── */}
        {tab === 'Requests Sent' && (
          <div className="dashboard-section">
            {outgoing.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📬</div>
                <h3 className="empty-state__heading">No requests sent yet</h3>
                <p className="empty-state__body">Browse the marketplace and request items you need.</p>
                <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>Browse Marketplace</button>
              </div>
            ) : (
              <div className="dashboard-requests">
                {outgoing.map((r) => (
                  <div key={r.id} className="request-row">
                    <div className="request-row__info">
                      <Link to={`/listing/${r.listingId}`} className="request-row__title">{r.listingTitle}</Link>
                      <span className="request-row__meta">
                        {r.type === 'borrow' ? 'Borrow request' : r.type === 'free' ? 'Claim request' : 'Purchase request'}
                        {' · '}to {r.sellerName}
                      </span>
                      {r.returnDate && (
                        <span className="request-row__return">Return by: {r.expectedReturnDate}</span>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Requests Received ─────────────────────────────────── */}
        {tab === 'Requests Received' && (
          <div className="dashboard-section">
            {incoming.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📭</div>
                <h3 className="empty-state__heading">No incoming requests</h3>
                <p className="empty-state__body">When students request your items, they'll appear here.</p>
              </div>
            ) : (
              <div className="dashboard-requests">
                {incoming.map((r) => (
                  <div key={r.id} className="request-row">
                    <div className="request-row__info">
                      <span className="request-row__title">{r.requesterName}</span>
                      <span className="request-row__meta">wants your <strong>{r.listingTitle}</strong></span>
                      <span className="request-row__sub">{r.requesterDept}</span>
                      <blockquote className="request-row__message">"{r.message}"</blockquote>
                    </div>
                    <div className="request-row__actions">
                      <button className="btn btn--dark btn--sm" onClick={() => respondToRequest(r.id, 'accepted')}
                        disabled={updatingRequest === r.id || r.status !== 'pending'}>
                        Accept
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => respondToRequest(r.id, 'rejected')}
                        disabled={updatingRequest === r.id || r.status !== 'pending'}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
