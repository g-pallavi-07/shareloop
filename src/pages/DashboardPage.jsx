import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';

import { useAuth, useToast } from '../context/AppContext.jsx';
import ReviewDialog from '../components/ReviewDialog.jsx';
import {
  confirmPurchaseCompletion,
  confirmBorrowedItemCollected,
  confirmBorrowedItemReceived,
  confirmBorrowedItemReturned,
  deleteListing,
  getUserListings,
  getMyRequests,
  getIncomingRequests,
  updateRequestStatus,
} from '../services/api.js';

const TABS = [
  'Overview',
  'My Listings',
  'Requests Sent',
  'Requests Received',
  'Borrowed',
  'Lent',
  'Bought',
  'Sold',
];

function isCompletedPurchase(order) {
  return order.status === 'completed' && order.transactionType === 'purchase';
}

function getBorrowDueStatus(order) {
  if (order.borrowerReturnConfirmed || order.status === 'completed') {
    return 'returned';
  }
  const dueDate = new Date(`${order.expectedReturnDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today ? 'overdue' : 'upcoming';
}

function seenDealsStorageKey(userId) {
  return `shareloop_seen_deals_${userId}`;
}

function readSeenDealIds(userId) {
  try {
    const stored = JSON.parse(
      localStorage.getItem(seenDealsStorageKey(userId)) || '[]'
    );

    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return new Set();
  }
}

function StatusBadge({ status }) {
  const map = {
    pending: {
      label: 'Pending',
      cls: 'status--pending',
      Icon: Clock,
    },
    accepted: {
      label: 'Accepted',
      cls: 'status--accepted',
      Icon: CheckCircle,
    },
    rejected: {
      label: 'Declined',
      cls: 'status--rejected',
      Icon: XCircle,
    },
    completed: {
      label: 'Completed',
      cls: 'status--completed',
      Icon: CheckCircle,
    },
  };

  const { label, cls, Icon } = map[status] ?? {
    label: status,
    cls: '',
    Icon: Clock,
  };

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
  const [searchParams] = useSearchParams();

  const userId = user?.id == null ? null : String(user.id);

  const [tab, setTab] = useState('Overview');
  const [listings, setListings] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);

  const [seenDeals, setSeenDeals] = useState(() => ({
    userId,
    ids: userId ? readSeenDealIds(userId) : new Set(),
  }));

  const [updatingRequest, setUpdatingRequest] = useState(null);
  const [confirmingPurchase, setConfirmingPurchase] = useState(null);
  const [deletingListing, setDeletingListing] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);

  // Notification navigation and highlighting
  const [highlightedRequestId, setHighlightedRequestId] = useState(null);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  const requestId = searchParams.get('requestId');
  const requestedTab = searchParams.get('tab');

  const targetTab =
    requestedTab === 'received'
      ? 'Requests Received'
      : requestedTab === 'sent'
        ? 'Requests Sent'
        : null;

  // Automatically open the correct tab from a notification
  useEffect(() => {
    if (targetTab) {
      setTab(targetTab);
    }
  }, [targetTab]);

  // Fetch dashboard data
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setRequestsLoaded(false);

    Promise.all([
      getUserListings(),
      getMyRequests(),
      getIncomingRequests(),
    ])
      .then(([myListings, sent, received]) => {
        setListings(myListings);
        setOutgoing(sent);
        setIncoming(received);
      })
      .catch((error) =>
        addToast(
          error.message || 'Unable to load dashboard data.',
          'error'
        )
      )
      .finally(() => {
        setRequestsLoaded(true);
      });
  }, [addToast, isLoggedIn, navigate]);

  // Find, scroll to and highlight the exact request
  useEffect(() => {
    if (!requestId || !targetTab || !requestsLoaded) return;

    const requests =
      targetTab === 'Requests Received' ? incoming : outgoing;

    const matchingRequest = requests.find(
      (request) => String(request.id) === String(requestId)
    );

    if (!matchingRequest) return;

    setHighlightedRequestId(String(requestId));

    const timer = window.setTimeout(() => {
      const element = document.getElementById(
        `request-${requestId}`
      );

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 150);

    const clearHighlight = window.setTimeout(() => {
      setHighlightedRequestId(null);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [
    requestId,
    targetTab,
    requestsLoaded,
    incoming,
    outgoing,
  ]);

  // Completed purchase tracking
  const seenDealIds =
    seenDeals.userId === userId
      ? seenDeals.ids
      : new Set();

  const receivedDeals = outgoing.filter(isCompletedPurchase);
  const soldDeals = incoming.filter(isCompletedPurchase);
  const borrowedOrders = outgoing.filter(
    (order) => order.transactionType === 'borrow' &&
      ['accepted', 'completed'].includes(order.status)
  );
  const lentOrders = incoming.filter(
    (order) => order.transactionType === 'borrow' &&
      ['accepted', 'completed'].includes(order.status)
  );
  const pendingIncomingCount = incoming.filter(
    (request) => request.status === 'pending'
  ).length;

  const unreadBoughtCount = receivedDeals.filter(
    (order) => !seenDealIds.has(String(order.id))
  ).length;

  const unreadSoldCount = soldDeals.filter(
    (order) => !seenDealIds.has(String(order.id))
  ).length;

  if (!isLoggedIn) return null;

  // Mark Bought/Sold deals as seen
  function openDealsTab(section) {
    const ids =
      seenDeals.userId === userId
        ? seenDeals.ids
        : readSeenDealIds(userId);

    const orders =
      section === 'Bought' ? receivedDeals : soldDeals;

    const nextIds = new Set(ids);

    orders.forEach((order) => {
      nextIds.add(String(order.id));
    });

    setSeenDeals({
      userId,
      ids: nextIds,
    });

    try {
      localStorage.setItem(
        seenDealsStorageKey(userId),
        JSON.stringify([...nextIds])
      );
    } catch {
      addToast(
        'This tab was marked as seen, but the setting could not be saved.',
        'error'
      );
    }

    setTab(section);
  }

  // Accept or decline an incoming request
  async function respondToRequest(requestId, status) {
    setUpdatingRequest(requestId);

    try {
      const updated = await updateRequestStatus(requestId, status);

      setIncoming((requests) =>
        requests.map((request) =>
          request.id === updated.id ? updated : request
        )
      );

      addToast(
        status === 'accepted'
          ? 'Request accepted.'
          : 'Request declined.',
        'success'
      );
    } catch (error) {
      addToast(
        error.message || 'Unable to update request.',
        'error'
      );
    } finally {
      setUpdatingRequest(null);
    }
  }

  // Confirm purchase handover
  async function confirmPurchase(orderId) {
    setConfirmingPurchase(orderId);

    try {
      const updated = await confirmPurchaseCompletion(orderId);

      setOutgoing((requests) =>
        requests.map((request) =>
          request.id === updated.id ? updated : request
        )
      );

      setIncoming((requests) =>
        requests.map((request) =>
          request.id === updated.id ? updated : request
        )
      );

      addToast(
        updated.status === 'completed'
          ? 'Both parties confirmed. The transaction is complete.'
          : 'Your confirmation is saved. Waiting for the other party.',
        'success'
      );
    } catch (error) {
      addToast(
        error.message || 'Unable to confirm this transaction.',
        'error'
      );
    } finally {
      setConfirmingPurchase(null);
    }
  }

  async function confirmBorrowCollection(orderId) {
    setUpdatingRequest(orderId);

    try {
      const updated = await confirmBorrowedItemCollected(orderId);

      setIncoming((requests) =>
        requests.map((request) =>
          request.id === updated.id ? updated : request
        )
      );

      setOutgoing((requests) =>
        requests.map((request) =>
          request.id === updated.id ? updated : request
        )
      );

      const viewerIsBorrower =
        String(user.id) === String(updated.requesterId);

      const ownConfirmation = viewerIsBorrower
        ? updated.buyerHandoverConfirmed
        : updated.sellerHandoverConfirmed;

      const bothConfirmed =
        updated.buyerHandoverConfirmed &&
        updated.sellerHandoverConfirmed;

      addToast(
        bothConfirmed
          ? 'Both parties confirmed collection. The item handover is complete.'
          : ownConfirmation
            ? 'Your collection confirmation is saved. Waiting for the other party.'
            : 'Collection confirmation updated.',
        'success'
      );
    } catch (error) {
      addToast(
        error.message || 'Unable to confirm item collection.',
        'error'
      );
    } finally {
      setUpdatingRequest(null);
    }
  }
  // Purchase handover confirmation UI

  async function confirmBorrowReturn(orderId) {
    setUpdatingRequest(orderId);
    try {
      const updated = await confirmBorrowedItemReturned(orderId);
      setIncoming((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      setOutgoing((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      addToast('Return and any agreed payment confirmed. Waiting for the seller.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to confirm this return.', 'error');
    } finally {
      setUpdatingRequest(null);
    }
  }

  async function confirmBorrowReturnReceived(orderId) {
    setUpdatingRequest(orderId);
    try {
      const updated = await confirmBorrowedItemReceived(orderId);
      setIncoming((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      setOutgoing((requests) => requests.map((request) => request.id === updated.id ? updated : request));
      addToast('Returned item and any agreed payment confirmed. Borrow is complete.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to confirm receipt of this return.', 'error');
    } finally {
      setUpdatingRequest(null);
    }
  }
  function renderBorrowCollectionConfirmation(order, viewerIsBorrower) {
    const ownConfirmation = viewerIsBorrower
      ? order.buyerHandoverConfirmed
      : order.sellerHandoverConfirmed;

    const otherConfirmation = viewerIsBorrower
      ? order.sellerHandoverConfirmed
      : order.buyerHandoverConfirmed;

    const bothConfirmed = ownConfirmation && otherConfirmation;

    return (
      <div className="request-confirmation">
        <p className="request-confirmation__title">
          Borrowed item collection confirmation
        </p>

        <p className="request-confirmation__status">
          You: {ownConfirmation ? 'Confirmed' : 'Not confirmed'}
          {' · '}
          {viewerIsBorrower ? 'Seller' : 'Borrower'}:{' '}
          {otherConfirmation ? 'Confirmed' : 'Waiting'}
        </p>

        {bothConfirmed ? (
          <span className="request-confirmation__waiting">
            Both parties have confirmed collection.
          </span>
        ) : ownConfirmation ? (
          <span className="request-confirmation__waiting">
            Your confirmation is saved. Waiting for the other party.
          </span>
        ) : (
          <button
            className="btn btn--dark btn--sm"
            disabled={updatingRequest === order.id}
            onClick={() => confirmBorrowCollection(order.id)}
          >
            {updatingRequest === order.id
              ? 'Saving…'
              : viewerIsBorrower
                ? 'Confirm item collected'
                : 'Confirm item handed over'}
          </button>
        )}
      </div>
    );
  }
  function renderBorrowReturnConfirmation(order, viewerIsBorrower) {
    const ownConfirmation = viewerIsBorrower
      ? order.borrowerReturnConfirmed
      : order.sellerReturnPaymentConfirmed;
    const otherConfirmation = viewerIsBorrower
      ? order.sellerReturnPaymentConfirmed
      : order.borrowerReturnConfirmed;

    return (
      <div className="request-confirmation">
        <p className="request-confirmation__title">
          Return and any agreed payment confirmation
        </p>
        <p className="request-confirmation__status">
          You: {ownConfirmation ? 'Confirmed' : 'Not confirmed'}
          {' · '}
          {viewerIsBorrower ? 'Seller' : 'Borrower'}: {otherConfirmation ? 'Confirmed' : 'Waiting'}
        </p>
        {ownConfirmation ? (
          <span className="request-confirmation__waiting">
            Waiting for the other party to confirm.
          </span>
        ) : viewerIsBorrower ? (
          <button
            className="btn btn--dark btn--sm"
            disabled={updatingRequest === order.id}
            onClick={() => confirmBorrowReturn(order.id)}
          >
            {updatingRequest === order.id ? 'Saving…' : 'Confirm returned & payment made'}
          </button>
        ) : otherConfirmation ? (
          <button
            className="btn btn--dark btn--sm"
            disabled={updatingRequest === order.id}
            onClick={() => confirmBorrowReturnReceived(order.id)}
          >
            {updatingRequest === order.id ? 'Saving…' : 'Confirm item received & payment received'}
          </button>
        ) : (
          <span className="request-confirmation__waiting">
            Waiting for the borrower to confirm the return.
          </span>
        )}
      </div>
    );
  }

  function markReviewed() {
    const mark = (orders) => orders.map((order) => order.id !== reviewingOrder.id ? order : {
      ...order,
      ...(String(user.id) === String(order.requesterId)
        ? { buyerReviewed: true }
        : { sellerReviewed: true }),
    });
    setOutgoing(mark);
    setIncoming(mark);
    setReviewingOrder(null);
  }

  function renderPurchaseConfirmation(order) {
    const viewerIsBuyer =
      String(user.id) === String(order.requesterId);

    const ownConfirmation = viewerIsBuyer
      ? order.buyerHandoverConfirmed
      : order.sellerHandoverConfirmed;

    const otherConfirmation = viewerIsBuyer
      ? order.sellerHandoverConfirmed
      : order.buyerHandoverConfirmed;

    return (
      <div className="request-confirmation">
        <p className="request-confirmation__title">
          Confirm the item handover
          {order.paymentRequired ? ' and payment' : ''}.
        </p>

        <p className="request-confirmation__status">
          You: {ownConfirmation ? 'Confirmed' : 'Not confirmed'}
          {' · '}
          Other party: {otherConfirmation ? 'Confirmed' : 'Waiting'}
        </p>

        {ownConfirmation ? (
          <span className="request-confirmation__waiting">
            Waiting for the other party to confirm.
          </span>
        ) : (
          <button
            className="btn btn--dark btn--sm"
            onClick={() => confirmPurchase(order.id)}
            disabled={confirmingPurchase === order.id}
          >
            {confirmingPurchase === order.id
              ? 'Saving…'
              : order.paymentRequired
                ? 'Confirm handover & payment'
                : 'Confirm handover'}
          </button>
        )}
      </div>
    );
  }

  // Render completed purchases
  function renderCompletedDeals(
    orders,
    emptyTitle,
    emptyBody,
    otherPartyLabel
  ) {
    if (orders.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state__icon">📦</div>
          <h3 className="empty-state__heading">
            {emptyTitle}
          </h3>
          <p className="empty-state__body">
            {emptyBody}
          </p>
        </div>
      );
    }

    return (
      <div className="dashboard-requests">
        {orders.map((order) => (
          <div key={order.id} className="request-row">
            <div className="request-row__info">
              <Link
                to={`/listing/${order.listingId}`}
                className="request-row__title"
              >
                {order.listingTitle}
              </Link>

              <span className="request-row__meta">
                {otherPartyLabel}{' '}
                <Link to={`/users/${String(user.id) === String(order.requesterId) ? order.sellerId : order.requesterId}`}>
                  {String(order.requesterId) === String(user.id)
                    ? order.sellerName
                    : order.requesterName}
                </Link>
              </span>

              {order.price > 0 && (
                <span className="request-row__sub">
                  ₹{order.price.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="completed-deal__actions">
              <StatusBadge status={order.status} />
              {(String(user.id) === String(order.requesterId) ? !order.buyerReviewed : !order.sellerReviewed) ? (
                <button className="btn btn--outline-sm" onClick={() => setReviewingOrder(order)}>Write a review</button>
              ) : (
                <span className="review-submitted">Review submitted</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Delete a listing
  async function removeListing(listing) {
    if (
      !window.confirm(
        `Delete "${listing.title}"? It will no longer appear in the marketplace.`
      )
    ) {
      return;
    }

    setDeletingListing(listing.id);

    try {
      await deleteListing(listing.id);

      setListings((current) =>
        current.filter((item) => item.id !== listing.id)
      );

      addToast('Listing deleted.', 'success');
    } catch (error) {
      addToast(
        error.message || 'Unable to delete listing.',
        'error'
      );
    } finally {
      setDeletingListing(null);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* Dashboard Header */}
        <div className="dashboard-page__header">
          <div className="dashboard-page__welcome">
            <div className="dashboard-page__avatar">
              {user?.name?.charAt(0) ?? '?'}
            </div>

            <div>
              <h1 className="dashboard-page__name">
                Hey, {user?.name?.split(' ')[0]} 👋
              </h1>

              <p className="dashboard-page__dept">
                {user?.department} · {user?.year}
              </p>
              <Link to={`/users/${user.id}`} className="dashboard-profile-link">View your profile</Link>
            </div>
          </div>

          <button
            className="btn btn--dark"
            onClick={() => navigate('/create-listing')}
          >
            <Plus size={16} /> List an Item
          </button>
        </div>

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`dashboard-tabs__tab ${
                tab === t
                  ? 'dashboard-tabs__tab--active'
                  : ''
              }`}
              onClick={() =>
                t === 'Bought' || t === 'Sold'
                  ? openDealsTab(t)
                  : setTab(t)
              }
            >
              {t}
              {t === 'Requests Received' &&
                pendingIncomingCount > 0 && (
                  <span className="dashboard-tabs__badge">
                    {pendingIncomingCount}
                  </span>
                )}

              {t === 'Bought' &&
                unreadBoughtCount > 0 && (
                  <span className="dashboard-tabs__badge">
                    {unreadBoughtCount}
                  </span>
                )}

              {t === 'Sold' && unreadSoldCount > 0 && (
                <span className="dashboard-tabs__badge">
                  {unreadSoldCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'Overview' && (
          <div className="dashboard-overview">
            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-card__num">
                  {listings.length}
                </span>
                <span className="stat-card__label">
                  Total Listings
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-card__num">
                  {outgoing.length}
                </span>
                <span className="stat-card__label">
                  Requests Sent
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-card__num">
                  {incoming.length}
                </span>
                <span className="stat-card__label">
                  Requests Received
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-card__num">
                  {outgoing.filter(
                    (r) => r.status === 'completed'
                  ).length}
                </span>
                <span className="stat-card__label">
                  Completed Deals
                </span>
              </div>
            </div>

            <div className="dashboard-quick-actions">
              <h3 className="dashboard-quick-actions__title">
                Quick Actions
              </h3>

              <div className="dashboard-quick-actions__grid">
                <button
                  className="quick-action"
                  onClick={() => navigate('/create-listing')}
                >
                  <Plus size={20} />
                  <span>List an Item</span>
                </button>

                <button
                  className="quick-action"
                  onClick={() => navigate('/marketplace')}
                >
                  <Package size={20} />
                  <span>Browse Marketplace</span>
                </button>

                <button
                  className="quick-action"
                  onClick={() => setTab('Requests Received')}
                >
                  <ArrowRight size={20} />
                  <span>View Incoming Requests</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Listings */}
        {tab === 'My Listings' && (
          <div className="dashboard-section">
            {listings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📦</div>

                <h3 className="empty-state__heading">
                  No listings yet
                </h3>

                <p className="empty-state__body">
                  Create your first listing and start sharing.
                </p>

                <button
                  className="btn btn--dark"
                  onClick={() => navigate('/create-listing')}
                >
                  <Plus size={16} /> List an Item
                </button>
              </div>
            ) : (
              <div className="dashboard-listings">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="dashboard-listing-row"
                  >
                    <img
                      src={l.images[0]}
                      alt={l.title}
                      className="dashboard-listing-row__img"
                    />

                    <div className="dashboard-listing-row__info">
                      <Link
                        to={`/listing/${l.id}`}
                        className="dashboard-listing-row__title"
                      >
                        {l.title}
                      </Link>

                      <span className="dashboard-listing-row__meta">
                        {l.categoryLabel} · {l.conditionLabel}
                      </span>
                    </div>

                    <div className="dashboard-listing-row__stats">
                      <span>
                        {l.requests ?? 0} request
                        {l.requests !== 1 ? 's' : ''}
                      </span>
                      <span>{l.views ?? 0} views</span>
                    </div>

                    <span
                      className={`listing-type-badge listing-type-badge--${l.type}`}
                    >
                      {l.type === 'sale'
                        ? `₹${l.price}`
                        : l.type === 'borrow'
                          ? 'Borrow'
                          : 'Free'}
                    </span>

                    <button
                      type="button"
                      className="btn btn--ghost btn--sm dashboard-listing-row__delete"
                      onClick={() => removeListing(l)}
                      disabled={deletingListing === l.id}
                      aria-label={`Delete ${l.title}`}
                    >
                      <Trash2 size={15} />
                      {deletingListing === l.id
                        ? 'Deleting…'
                        : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Sent */}
        {tab === 'Requests Sent' && (
          <div className="dashboard-section">
            {outgoing.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📬</div>

                <h3 className="empty-state__heading">
                  No requests sent yet
                </h3>

                <p className="empty-state__body">
                  Browse the marketplace and request items you need.
                </p>

                <button
                  className="btn btn--dark"
                  onClick={() => navigate('/marketplace')}
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="dashboard-requests">
                {outgoing.map((r) => (
                  <div
                    key={r.id}
                    id={`request-${r.id}`}
                    className={`request-row ${
                      highlightedRequestId === String(r.id)
                        ? 'request-row--highlighted'
                        : ''
                    }`}
                  >
                    <div className="request-row__info">
                      <Link
                        to={`/listing/${r.listingId}`}
                        className="request-row__title"
                      >
                        {r.listingTitle}
                      </Link>

                      <span className="request-row__meta">
                        {r.type === 'borrow'
                          ? 'Borrow request'
                          : r.type === 'free'
                            ? 'Claim request'
                            : 'Purchase request'}
                        {' · '}to <Link to={`/users/${r.sellerId}`}>{r.sellerName}</Link>
                      </span>

                      {r.returnDate && (
                        <span className="request-row__return">
                          Return by: {r.expectedReturnDate}
                        </span>
                      )}

                      {r.status === 'accepted' &&
                        r.transactionType === 'purchase' &&
                        renderPurchaseConfirmation(r)}

                      {r.status === 'accepted' &&
                        r.transactionType === 'borrow' && (
                          <>
                            {renderBorrowCollectionConfirmation(r, true)}
                            {renderBorrowReturnConfirmation(r, true)}
                          </>
                        )}
                    </div>

                    {!(
                      r.status === 'accepted' &&
                      r.transactionType === 'purchase'
                    ) && <StatusBadge status={r.status} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Received */}
        {tab === 'Requests Received' && (
          <div className="dashboard-section">
            {incoming.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📭</div>

                <h3 className="empty-state__heading">
                  No incoming requests
                </h3>

                <p className="empty-state__body">
                  When students request your items, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="dashboard-requests">
                {incoming.map((r) => (
                  <div
                    key={r.id}
                    id={`request-${r.id}`}
                    className={`request-row ${
                      highlightedRequestId === String(r.id)
                        ? 'request-row--highlighted'
                        : ''
                    }`}
                  >
                    <div className="request-row__info">
                      <Link to={`/users/${r.requesterId}`} className="request-row__title">
                        {r.requesterName}
                      </Link>

                      <span className="request-row__meta">
                        wants your <strong>{r.listingTitle}</strong>
                      </span>

                      <span className="request-row__sub">
                        {r.requesterDept}
                      </span>

                      <blockquote className="request-row__message">
                        "{r.message}"
                      </blockquote>

                      {r.status === 'accepted' &&
                        r.transactionType === 'purchase' &&
                        renderPurchaseConfirmation(r)}
                      
                      {r.status === 'accepted' &&
                        r.transactionType === 'borrow' && (
                          <>
                            {renderBorrowCollectionConfirmation(r, false)}
                            {renderBorrowReturnConfirmation(r, false)}
                          </>
                        )}
                    </div>

                    <div className="request-row__actions">
                      {r.status === 'pending' ? (
                        <>
                          <button
                            className="btn btn--dark btn--sm"
                            onClick={() =>
                              respondToRequest(r.id, 'accepted')
                            }
                            disabled={updatingRequest === r.id}
                          >
                            Accept
                          </button>

                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              respondToRequest(r.id, 'rejected')
                            }
                            disabled={updatingRequest === r.id}
                          >
                            Decline
                          </button>
                        </>
                      ) : r.status !== 'accepted' ||
                        r.transactionType !== 'purchase' ? (
                        <StatusBadge status={r.status} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Borrowed items */}
        {tab === 'Borrowed' && (
          <div className="dashboard-section">
            {borrowedOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📦</div>
                <h3 className="empty-state__heading">No borrowed items</h3>
                <p className="empty-state__body">
                  Accepted borrow requests will appear here until the return is confirmed by both parties.
                </p>
                <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="dashboard-requests">
                {borrowedOrders.map((order) => {
                  const dueStatus = getBorrowDueStatus(order);
                  return (
                    <div key={order.id} className="request-row">
                      <div className="request-row__info">
                        <Link to={`/listing/${order.listingId}`} className="request-row__title">
                          {order.listingTitle}
                        </Link>
                        <span className="request-row__meta">
                          Borrowed from <Link to={`/users/${order.sellerId}`}>{order.sellerName}</Link>
                        </span>
                        <span className={`request-row__return request-row__return--${dueStatus}`}>
                          {order.status === 'completed'
                            ? `Returned on: ${order.actualReturnDate}`
                            : dueStatus === 'returned'
                              ? `Return reported · due date: ${order.expectedReturnDate}`
                              : dueStatus === 'overdue'
                                ? `Overdue · return by: ${order.expectedReturnDate}`
                                : `Return by: ${order.expectedReturnDate}`}
                        </span>
                        {order.status === 'accepted' && (
                          <>
                            {renderBorrowCollectionConfirmation(order, true)}
                            {renderBorrowReturnConfirmation(order, true)}
                          </>
                        )}
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lent items */}
        {tab === 'Lent' && (
          <div className="dashboard-section">
            {lentOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🤝</div>
                <h3 className="empty-state__heading">No lent items</h3>
                <p className="empty-state__body">
                  Items you lend will appear here until the borrower and you confirm the return.
                </p>
              </div>
            ) : (
              <div className="dashboard-requests">
                {lentOrders.map((order) => {
                  const dueStatus = getBorrowDueStatus(order);
                  return (
                    <div key={order.id} className="request-row">
                      <div className="request-row__info">
                        <Link to={`/listing/${order.listingId}`} className="request-row__title">
                          {order.listingTitle}
                        </Link>
                        <span className="request-row__meta">
                          Lent to <Link to={`/users/${order.requesterId}`}>{order.requesterName}</Link>
                        </span>
                        <span className={`request-row__return request-row__return--${dueStatus}`}>
                          {order.status === 'completed'
                            ? `Returned on: ${order.actualReturnDate}`
                            : dueStatus === 'returned'
                              ? `Return reported · due date: ${order.expectedReturnDate}`
                              : dueStatus === 'overdue'
                                ? `Overdue · return by: ${order.expectedReturnDate}`
                                : `Return by: ${order.expectedReturnDate}`}
                        </span>
                        {order.status === 'accepted' && (
                          <>
                            {renderBorrowCollectionConfirmation(order, false)}
                            {renderBorrowReturnConfirmation(order, false)}
                          </>
                        )}
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bought purchases */}
        {tab === 'Bought' && (
          <div className="dashboard-section">
            {renderCompletedDeals(
              receivedDeals,
              'No completed transactions yet',
              'Transactions you complete with other students will appear here.',
              'From',
            )}
          </div>
        )}

        {/* Sold Purchases */}
        {tab === 'Sold' && (
          <div className="dashboard-section">
            {renderCompletedDeals(
              soldDeals,
              'No completed transactions yet',
              'Transactions you complete with other students will appear here.',
              'To',
            )}
          </div>
        )}

      </div>
      {reviewingOrder && (
        <ReviewDialog
          order={reviewingOrder}
          otherParty={String(user.id) === String(reviewingOrder.requesterId)
            ? reviewingOrder.sellerName : reviewingOrder.requesterName}
          onClose={() => setReviewingOrder(null)}
          onSubmitted={markReviewed}
        />
      )}
    </div>
  );
}
