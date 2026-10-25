import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import ListingCard from '../components/ListingCard.jsx';
import { getListings } from '../services/api.js';
import { useInView } from '../hooks/useInView.js';

// ── Slide counter data ───────────────────────────────────────────────────────
const SLIDES = [
  { num: '01', label: 'FROM ONE SHELF TO ANOTHER', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=700&auto=format&fit=crop' },
  { num: '02', label: 'TECH FINDS ON CAMPUS', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&auto=format&fit=crop' },
  { num: '03', label: 'SHARE THE SEMESTER', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=700&auto=format&fit=crop' },
  { num: '04', label: 'GIVE IT ANOTHER LIFE', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=700&auto=format&fit=crop' },
];

// ── Animated Section ─────────────────────────────────────────────────────────
function FadeSection({ children, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`fade-section ${inView ? 'fade-section--visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [listingType, setListingType] = useState('all');
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    getListings({}).then(({ listings }) => {
      setRecentListings(listings.slice(0, 4));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'all') params.set('category', category);
    if (listingType !== 'all') params.set('type', listingType);
    navigate(`/marketplace?${params.toString()}`);
  }

  const slide = SLIDES[currentSlide];

  return (
    <div className="home">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__inner container">
          <div className="hero__left">
            <p className="hero__eyebrow">
              <span className="hero__eyebrow-line" />
              THE CAMPUS EXCHANGE
            </p>
            <h1 className="hero__heading">
              Your next favourite find is already on campus<span className="hero__dot">.</span>
            </h1>
            <p className="hero__sub">
              Buy, borrow, sell, or pass on the things that make student life easier.
            </p>

            <div className="hero__ctas">
              <button
                className="btn btn--dark hero__btn"
                onClick={() => navigate('/marketplace')}
              >
                EXPLORE THE MARKETPLACE <ArrowRight size={16} />
              </button>
              <button
                className="btn btn--ghost hero__btn"
                onClick={() => navigate('/create-listing')}
              >
                LIST AN ITEM <ArrowRight size={16} />
              </button>
            </div>

            <div className="hero__badge-row">
              <div className="hero__green-badge">
                <span className="hero__green-badge-small">USEFUL THINGS</span>
                <em className="hero__green-badge-em">deserve<br />another<br />semester</em>
              </div>

              <div className="hero__slide-counter">
                <span className="hero__slide-num">
                  <span className="hero__slide-current">{slide.num}</span>
                  <span className="hero__slide-sep"> / </span>
                  <span className="hero__slide-total">04</span>
                </span>
                <span className="hero__slide-label">{slide.label}</span>
              </div>
            </div>

            <div className="hero__community">
              <ShieldCheck size={18} className="hero__community-icon" />
              <span>Made for your campus. Built around your community.</span>
            </div>
          </div>

          <div className="hero__right">
            <div className="hero__image-circle">
              {SLIDES.map((s, i) => (
                <img
                  key={s.num}
                  src={s.image}
                  alt={s.label}
                  className={`hero__image ${i === currentSlide ? 'hero__image--active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <section className="search-section">
        <div className="search-section__inner container">
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-bar__row">
              <div className="search-bar__field">
                <span className="search-bar__icon">🔍</span>
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="search-bar__input"
                />
              </div>
              <div className="search-bar__divider" />
              <div className="search-bar__select-group">
                <label className="search-bar__label">CATEGORY</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="search-bar__select"
                >
                  <option value="all">All categories</option>
                  <option value="textbooks">Textbooks</option>
                  <option value="tech-gadgets">Tech &amp; Gadgets</option>
                  <option value="academic-essentials">Academic Essentials</option>
                  <option value="lab-equipment">Lab Equipment</option>
                  <option value="stationery">Stationery</option>
                  <option value="hostel-essentials">Hostel Essentials</option>
                  <option value="sports">Sports &amp; Fitness</option>
                  <option value="cycles">Cycles &amp; Transport</option>
                  <option value="electronics">Electronics</option>
                </select>
              </div>
              <div className="search-bar__divider" />
              <div className="search-bar__select-group">
                <label className="search-bar__label">LOOKING FOR</label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="search-bar__select"
                >
                  <option value="all">All types</option>
                  <option value="sale">For Sale</option>
                  <option value="borrow">Borrow</option>
                  <option value="free">Free</option>
                </select>
              </div>
            </div>
            <button type="submit" className="search-bar__submit">
              FIND A FIND <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ── Category Pills ─────────────────────────────────────────────────── */}
      <FadeSection className="categories-section">
        <div className="container">
          <p className="section-eyebrow">A LITTLE BIT OF EVERYTHING</p>
          <div className="categories-grid">
            {[
              { id: 'textbooks', label: '📚 Textbooks' },
              { id: 'tech-gadgets', label: '💻 Tech & Gadgets' },
              { id: 'academic-essentials', label: '📐 Academic Essentials' },
              { id: 'lab-equipment', label: '🔬 Lab Equipment' },
              { id: 'hostel-essentials', label: '🛏️ Hostel Essentials' },
              { id: 'stationery', label: '✏️ Stationery' },
              { id: 'sports', label: '🏸 Sports & Fitness' },
              { id: 'cycles', label: '🚲 Cycles' },
              { id: 'electronics', label: '🎧 Electronics' },
              { id: 'furniture', label: '🪑 Furniture' },
            ].map((cat) => (
              <button
                key={cat.id}
                className="category-pill"
                onClick={() => navigate(`/marketplace?category=${cat.id}`)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ── Featured Listings ───────────────────────────────────────────────── */}
      <section className="featured-section">
        <div className="container">
          <div className="featured-section__header">
            <div>
              <p className="section-eyebrow">FRESHLY LISTED BY STUDENTS</p>
              <h2 className="featured-section__heading">Good finds, right here on campus.</h2>
            </div>
            <button className="btn btn--ghost-dark" onClick={() => navigate('/marketplace')}>
              VIEW ALL LISTINGS <ArrowRight size={14} />
            </button>
          </div>

          <div className="featured-section__filters">
            <span className="featured-section__count">
              {loading ? '–' : recentListings.length} available finds
            </span>
            <button className="btn btn--outline-sm" onClick={() => navigate('/marketplace')}>
              ☰ MORE FILTERS
            </button>
          </div>

          {loading ? (
            <div className="listing-grid listing-grid--skeleton">
              {[1, 2, 3, 4].map((n) => <div key={n} className="listing-card listing-card--skeleton" />)}
            </div>
          ) : (
            <div className="listing-grid">
              {recentListings.map((l, i) => (
                <ListingCard key={l.id} listing={l} delay={i * 80} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Teal Feature Banner ────────────────────────────────────────────── */}
      <FadeSection>
        <section className="feature-banner">
          <div className="feature-banner__inner container">
            <div className="feature-banner__content">
              <p className="feature-banner__eyebrow">THE SHARELOOP WAY</p>
              <h2 className="feature-banner__heading">
                Less waste.<br />
                <em className="feature-banner__em">More shared resources.</em>
              </h2>
              <p className="feature-banner__body">
                Student life is full of things we need temporarily.<br />
                ShareLoop helps useful items move from one student's hands to another's.
              </p>
              <button className="btn btn--outline-light" onClick={() => navigate('/marketplace?type=free')}>
                EXPLORE FREE &amp; BORROW <ArrowRight size={16} />
              </button>
            </div>
            <div className="feature-banner__counter">
              <span className="feature-banner__num">03</span>
              <span className="feature-banner__sep"> / </span>
              <span className="feature-banner__total">04</span>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ── CTA Section ────────────────────────────────────────────────────── */}
      <FadeSection>
        <section className="cta-section">
          <div className="cta-section__circle">
            <div className="container cta-section__inner">
              <h2 className="cta-section__heading">Got something to pass on?</h2>
              <p className="cta-section__body">List it in a few minutes and help another student find what they need.</p>
              <button className="btn btn--dark" onClick={() => navigate('/create-listing')}>
                LIST YOUR FIRST ITEM <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </FadeSection>
    </div>
  );
}
