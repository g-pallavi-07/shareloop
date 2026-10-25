import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { getListingById, createRequest } from '../services/api.js';
import { useFavorites, useToast } from '../context/AppContext.jsx';

function TypeBadge({ type }) {
  const map = { sale: 'For Sale', borrow: 'To Borrow', free: 'Free' };
  const cls = { sale: 'badge--sale', borrow: 'badge--borrow', free: 'badge--free' };
  return <span className={`badge ${cls[type] ?? ''}`}>{map[type] ?? type}</span>;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggle, isFavorite } = useFavorites();
  const { addToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    setLoading(true);
    getListingById(id)
      .then((l) => { setListing(l); setLoading(false); })
      .catch(() => { setError('Listing not found.'); setLoading(false); });
  }, [id]);

  async function handleRequest() {
    setRequesting(true);
    try {
      await createRequest(id, message);
      setRequested(true);
      setShowDialog(false);
      addToast('Request sent! The seller will get back to you.', 'success');
    } catch {
      addToast('Failed to send request. Please try again.', 'error');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <div className="page-loading container"><div className="spinner" /></div>;
  if (error) return (
    <div className="empty-state container">
      <div className="empty-state__icon">😕</div>
      <h3 className="empty-state__heading">{error}</h3>
      <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>Back to Marketplace</button>
    </div>
  );
  if (!listing) return null;

  const fav = isFavorite(id);

  const actionLabel =
    listing.type === 'free' ? 'Claim This Item' :
    listing.type === 'borrow' ? 'Request to Borrow' :
    'Request to Buy';

  return (
    <div className="detail-page">
      <div className="container">
        <button className="detail-page__back btn btn--ghost-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>

        <div className="detail-page__grid">
          {/* ── Gallery ──────────────────────────────────────────── */}
          <div className="detail-page__gallery">
            <div className="detail-page__main-image-wrap">
              <img
                src={listing.images[activeImg]}
                alt={listing.title}
                className="detail-page__main-image"
              />
              <TypeBadge type={listing.type} />
              <button
                className={`detail-page__fav-btn ${fav ? 'detail-page__fav-btn--active' : ''}`}
                onClick={() => toggle(id)}
                aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
              >
                <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>
            {listing.images.length > 1 && (
              <div className="detail-page__thumbnails">
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    className={`detail-page__thumb ${i === activeImg ? 'detail-page__thumb--active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt={`View ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ─────────────────────────────────────────────── */}
          <div className="detail-page__info">
            <div className="detail-page__meta-row">
              <span className="detail-page__category">{listing.categoryLabel}</span>
              <span className="detail-page__condition">{listing.conditionLabel}</span>
            </div>

            <h1 className="detail-page__title">{listing.title}</h1>

            <div className="detail-page__price-row">
              {listing.type === 'sale' && (
                <span className="detail-page__price">₹{listing.price?.toLocaleString('en-IN')}</span>
              )}
              {listing.type === 'borrow' && (
                <span className="detail-page__price">Borrow · {listing.borrowDuration ?? 'Flexible'}</span>
              )}
              {listing.type === 'free' && (
                <span className="detail-page__price detail-page__price--free">Free</span>
              )}
              <TypeBadge type={listing.type} />
            </div>

            <p className="detail-page__description">{listing.description}</p>

            {/* Seller card */}
            <div className="detail-page__seller">
              <div className="detail-page__seller-avatar">
                {listing.seller.name.charAt(0)}
              </div>
              <div className="detail-page__seller-info">
                <span className="detail-page__seller-name">{listing.seller.name}</span>
                <span className="detail-page__seller-dept">{listing.seller.department} · {listing.seller.year}</span>
              </div>
            </div>

            <div className="detail-page__availability">
              <ShieldCheck size={16} className="detail-page__avail-icon" />
              {listing.available ? 'Available now' : 'No longer available'}
            </div>

            {listing.available && !requested ? (
              <button className="btn btn--dark detail-page__cta" onClick={() => setShowDialog(true)}>
                {actionLabel} <ArrowRight size={16} />
              </button>
            ) : requested ? (
              <div className="detail-page__requested">
                ✓ Request sent! The seller will contact you.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Request Dialog ──────────────────────────────────────── */}
      {showDialog && (
        <div className="dialog-overlay" onClick={() => setShowDialog(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog__title">{actionLabel}</h3>
            <p className="dialog__sub">Introduce yourself and let the seller know why you're interested.</p>
            <textarea
              className="dialog__textarea"
              rows={4}
              placeholder="Hi, I'm interested because…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="dialog__actions">
              <button className="btn btn--ghost" onClick={() => setShowDialog(false)}>Cancel</button>
              <button
                className="btn btn--dark"
                onClick={handleRequest}
                disabled={requesting}
              >
                {requesting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
