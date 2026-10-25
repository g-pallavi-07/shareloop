import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ListingCard from '../components/ListingCard.jsx';
import { getListings } from '../services/api.js';
import { CATEGORIES, LISTING_TYPES, CONDITIONS } from '../data/mockData.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state — driven by URL
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  useEffect(() => {
    setLoading(true);
    getListings({ query, category, type, sort, condition, maxPrice: maxPrice ? Number(maxPrice) : undefined }).then(
      ({ listings: l, total: t }) => {
        setListings(l);
        setTotal(t);
        setLoading(false);
      }
    );
  }, [query, category, type, sort, condition, maxPrice]);

  function applyFilter(key, value) {
    const p = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') p.set(key, value);
    else p.delete(key);
    setSearchParams(p, { replace: true });
  }

  function clearFilters() {
    setQuery('');
    setCategory('all');
    setType('all');
    setSort('newest');
    setCondition('');
    setMaxPrice('');
    setSearchParams({});
  }

  const hasActiveFilters = query || category !== 'all' || type !== 'all' || condition || maxPrice;

  return (
    <div className="marketplace-page">
      <div className="container">
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="marketplace-page__topbar">
          <div className="marketplace-page__search-row">
            <input
              type="search"
              placeholder="Search listings…"
              className="marketplace-page__search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); applyFilter('q', e.target.value); }}
            />
            <select
              className="marketplace-page__select"
              value={category}
              onChange={(e) => { setCategory(e.target.value); applyFilter('category', e.target.value); }}
            >
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select
              className="marketplace-page__select"
              value={type}
              onChange={(e) => { setType(e.target.value); applyFilter('type', e.target.value); }}
            >
              {LISTING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select
              className="marketplace-page__select"
              value={sort}
              onChange={(e) => { setSort(e.target.value); applyFilter('sort', e.target.value); }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn btn--outline-sm marketplace-page__filter-btn" onClick={() => setFiltersOpen((v) => !v)}>
              <SlidersHorizontal size={15} /> Filters
            </button>
          </div>

          {/* Advanced filter panel */}
          {filtersOpen && (
            <div className="marketplace-page__filter-panel">
              <div className="marketplace-page__filter-group">
                <label className="marketplace-page__filter-label">Condition</label>
                <select
                  className="marketplace-page__select"
                  value={condition}
                  onChange={(e) => { setCondition(e.target.value); applyFilter('condition', e.target.value); }}
                >
                  <option value="">Any condition</option>
                  {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="marketplace-page__filter-group">
                <label className="marketplace-page__filter-label">Max Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  className="marketplace-page__input"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); applyFilter('maxPrice', e.target.value); }}
                />
              </div>
            </div>
          )}

          <div className="marketplace-page__results-row">
            <span className="marketplace-page__count">{loading ? '…' : `${total} listing${total !== 1 ? 's' : ''} found`}</span>
            {hasActiveFilters && (
              <button className="btn btn--ghost-sm" onClick={clearFilters}>
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="listing-grid listing-grid--skeleton">
            {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="listing-card listing-card--skeleton" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <h3 className="empty-state__heading">No listings found</h3>
            <p className="empty-state__body">Try different filters or search terms.</p>
            <button className="btn btn--dark" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="listing-grid listing-grid--marketplace">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} delay={i * 60} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
