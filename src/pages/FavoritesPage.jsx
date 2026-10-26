import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/AppContext.jsx';
import { getFavorites } from '../services/api.js';
import ListingCard from '../components/ListingCard.jsx';

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getFavorites()
      .then(setListings)
      .catch((error) => window.dispatchEvent(new CustomEvent('shareloop:error', { detail: error.message })))
      .finally(() => setLoading(false));
  }, [favorites]);

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="favorites-page__header">
          <h1 className="favorites-page__heading">
            <Heart size={24} className="favorites-page__icon" /> Saved Finds
          </h1>
          <p className="favorites-page__sub">{listings.length} item{listings.length !== 1 ? 's' : ''} saved</p>
        </div>

        {loading ? (
          <div className="listing-grid listing-grid--skeleton">
            {[1, 2, 3].map((n) => <div key={n} className="listing-card listing-card--skeleton" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">💛</div>
            <h3 className="empty-state__heading">No saved finds yet</h3>
            <p className="empty-state__body">Tap the heart on any listing to save it here.</p>
            <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>Browse Marketplace</button>
          </div>
        ) : (
          <div className="listing-grid">
            {listings.map((l, i) => <ListingCard key={l.id} listing={l} delay={i * 60} />)}
          </div>
        )}
      </div>
    </div>
  );
}
