import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Package, ArrowRight, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useAuth, useToast } from '../context/AppContext.jsx';
import {
  confirmPurchaseCompletion,
  deleteListing,
  getUserListings,
  getMyRequests,
  getIncomingRequests,
  updateRequestStatus,
} from '../services/api.js';

const TABS = ['Overview', 'My Listings', 'Requests Sent', 'Requests Received', 'Received', 'Sold'];

function isCompletedPurchase(order) {
  return order.status === 'completed' && order.transactionType === 'purchase';
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'status--pending', Icon: Clock },
    accepted: { label: 'Accepted', cls: 'status--accepted', Icon: CheckCircle },
    rejected: { label: 'Declined', cls: 'status--rejected', Icon: XCircle },
    completed: { label: 'Completed', cls: 'status--completed', Icon: CheckCircle },
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
  const [confirmingPurchase, setConfirmingPurchase] = useState(null);
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

  async function confirmPurchase(orderId) {
    setConfirmingPurchase(orderId);
    try {
      const updated = await confirmPurchaseCompletion(orderId);
      setOutgoing((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      setIncoming((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      addToast(
        updated.status === 'completed'
          ? 'Both parties confirmed. The transaction is complete.'
          : 'Your confirmation is saved. Waiting for the other party.',
        'success',
      );
    } catch (error) {
      addToast(error.message || 'Unable to confirm this transaction.', 'error');
    } finally {
      setConfirmingPurchase(null);
    }
  }

  function renderPurchaseConfirmation(order) {
    const viewerIsBuyer = String(user.id) === String(order.requesterId);
    const ownConfirmation = viewerIsBuyer ? order.buyerHandoverConfirmed : order.sellerHandoverConfirmed;
    const otherConfirmation = viewerIsBuyer ? order.sellerHandoverConfirmed : order.buyerHandoverConfirmed;
    return (
      <div className="request-confirmation">
        <p className="request-confirmation__title">
          Confirm the item handover{order.paymentRequired ? ' and payment' : ''}.
        </p>
        <p className="request-confirmation__status">
          You: {ownConfirmation ? 'Confirmed' : 'Not confirmed'} · Other party: {otherConfirmation ? 'Confirmed' : 'Waiting'}
        </p>
        {ownConfirmation ? (
          <span className="request-confirmation__waiting">Waiting for the other party to confirm.</span>
        ) : (
          <button
            className="btn btn--dark btn--sm"
            onClick={() => confirmPurchase(order.id)}
            disabled={confirmingPurchase === order.id}
          >
            {confirmingPurchase === order.id
              ? 'Saving…'
              : order.paymentRequired ? 'Confirm handover & payment' : 'Confirm handover'}
          </button>
        )}
      </div>
    );
  }

  function renderCompletedDeals(orders, emptyTitle, emptyBody, otherPartyLabel) {
    if (orders.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state__icon">📦</div>
          <h3 className="empty-state__heading">{emptyTitle}</h3>
          <p className="empty-state__body">{emptyBody}</p>
        </div>
      );
    }
    return (
      <div className="dashboard-requests">
        {orders.map((order) => (
          <div key={order.id} className="request-row">
            <div className="request-row__info">
              <Link to={`/listing/${order.listingId}`} className="request-row__title">{order.listingTitle}</Link>
              <span className="request-row__meta">
                {otherPartyLabel} {String(order.requesterId) === String(user.id) ? order.sellerName : order.requesterName}
              </span>
              {order.price > 0 && <span className="request-row__sub">₹{order.price.toLocaleString('en-IN')}</span>}
            </div>
            <StatusBadge status={order.status} />
          </div>
        ))}
      </div>
    );
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
              {t === 'Received' && outgoing.filter(isCompletedPurchase).length > 0 && (
                <span className="dashboard-tabs__badge">{outgoing.filter(isCompletedPurchase).length}</span>
              )}
              {t === 'Sold' && incoming.filter(isCompletedPurchase).length > 0 && (
                <span className="dashboard-tabs__badge">{incoming.filter(isCompletedPurchase).length}</span>
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
                      {r.status === 'accepted' && r.transactionType === 'purchase' && renderPurchaseConfirmation(r)}
                    </div>
                    {!(r.status === 'accepted' && r.transactionType === 'purchase') && <StatusBadge status={r.status} />}
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
                      {r.status === 'accepted' && r.transactionType === 'purchase' && renderPurchaseConfirmation(r)}
                    </div>
                    <div className="request-row__actions">
                      {r.status === 'pending' ? (
                        <>
                          <button className="btn btn--dark btn--sm" onClick={() => respondToRequest(r.id, 'accepted')}
                            disabled={updatingRequest === r.id}>
                            Accept
                          </button>
                          <button className="btn btn--ghost btn--sm" onClick={() => respondToRequest(r.id, 'rejected')}
                            disabled={updatingRequest === r.id}>
                            Decline
                          </button>
                        </>
                      ) : r.status !== 'accepted' || r.transactionType !== 'purchase' ? (
                        <StatusBadge status={r.status} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Received' && (
          <div className="dashboard-section">
            {renderCompletedDeals(
              outgoing.filter(isCompletedPurchase),
              'No items received yet',
              'Items you receive will appear here after both parties confirm the handover and payment.',
              'From',
            )}
          </div>
        )}

        {tab === 'Sold' && (
          <div className="dashboard-section">
            {renderCompletedDeals(
              incoming.filter(isCompletedPurchase),
              'No items sold yet',
              'Items you sell will appear here after both parties confirm the handover and payment.',
              'To',
            )}
          </div>
        )}
      </div>
    </div>
  );
}
