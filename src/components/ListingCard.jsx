import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/AppContext.jsx';
import { useInView } from '../hooks/useInView.js';

function formatPrice(listing) {
  if (listing.type === 'free') return 'Free';
  if (listing.type === 'borrow') return `Borrow · ${listing.borrowDuration ?? 'Flexible'}`;
  return `₹${listing.price?.toLocaleString('en-IN')}`;
}

function typeBadgeClass(type) {
  if (type === 'free') return 'badge--free';
  if (type === 'borrow') return 'badge--borrow';
  return 'badge--sale';
}

function typeBadgeLabel(type) {
  if (type === 'free') return 'Free';
  if (type === 'borrow') return 'To Borrow';
  return 'For Sale';
}

export default function ListingCard({ listing, delay = 0 }) {
  const { toggle, isFavorite } = useFavorites();
  const [ref, inView] = useInView();
  const fav = isFavorite(listing.id);

  return (
    <article
      ref={ref}
      className={`listing-card ${inView ? 'listing-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Link to={`/listing/${listing.id}`} className="listing-card__image-link">
        <div className="listing-card__image-wrap">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="listing-card__image"
            loading="lazy"
          />
          <span className={`listing-card__badge ${typeBadgeClass(listing.type)}`}>
            {typeBadgeLabel(listing.type)}
          </span>
        </div>
      </Link>

      <button
        className={`listing-card__fav-btn ${fav ? 'listing-card__fav-btn--active' : ''}`}
        aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        onClick={() => toggle(listing.id)}
      >
        <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
      </button>

      <div className="listing-card__body">
        <div className="listing-card__meta">
          <span className="listing-card__category">{listing.categoryLabel}</span>
          <span className="listing-card__condition">{listing.conditionLabel}</span>
        </div>
        <Link to={`/listing/${listing.id}`} className="listing-card__title-link">
          <h3 className="listing-card__title">{listing.title}</h3>
        </Link>
        <div className="listing-card__footer">
          <span className="listing-card__price">{formatPrice(listing)}</span>
          <span className="listing-card__seller">by {listing.seller.name}</span>
        </div>
      </div>
    </article>
  );
}
