import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Laptop, Compass, FlaskConical, Bed, PenTool, Dumbbell, Bike, Headphones, Armchair, Shirt, Layers } from 'lucide-react';
import { getListings } from '../services/api.js';

const CATEGORY_DEFINITIONS = [
  {
    id: 'textbooks',
    label: 'Textbooks',
    icon: BookOpen,
    desc: 'Engineering, Medicine, Science, Economics & Exam prep guides',
    color: '#0f3028'
  },
  {
    id: 'tech-gadgets',
    label: 'Tech & Gadgets',
    icon: Laptop,
    desc: 'Scientific calculators, Arduino kits, mouse, keyboards & laptop stands',
    color: '#1a6060'
  },
  {
    id: 'academic-essentials',
    label: 'Academic Essentials',
    icon: Compass,
    desc: 'Drafters, drawing sets, lab notebooks, charts & reference binders',
    color: '#6b7c45'
  },
  {
    id: 'lab-equipment',
    label: 'Lab Equipment',
    icon: FlaskConical,
    desc: 'Lab coats, safety goggles, dissecting kits & soldering irons',
    color: '#154f4f'
  },
  {
    id: 'hostel-essentials',
    label: 'Hostel Essentials',
    icon: Bed,
    desc: 'Desk lamps, laundry baskets, electric kettles, hangers & organizers',
    color: '#d4836a'
  },
  {
    id: 'stationery',
    label: 'Stationery',
    icon: PenTool,
    desc: 'Highlighters, unused notebooks, sticky notes, markers & art supplies',
    color: '#6b7c45'
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    icon: Dumbbell,
    desc: 'Badminton rackets, footballs, resistance bands & cricket bats',
    color: '#0f3028'
  },
  {
    id: 'cycles',
    label: 'Cycles & Transport',
    icon: Bike,
    desc: 'Campus bicycles, locks, tyre pumps & lights for easy hostel commutes',
    color: '#1a6060'
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Headphones,
    desc: 'Bluetooth earphones, power banks, extension cords & speakers',
    color: '#154f4f'
  },
  {
    id: 'furniture',
    label: 'Furniture',
    icon: Armchair,
    desc: 'Study chairs, bean bags, foldable lap desks & bedside tables',
    color: '#6b7c45'
  },
  {
    id: 'clothing',
    label: 'Clothing & Uniforms',
    icon: Shirt,
    desc: 'Formal presentation suits, lab aprons, sports jerseys & winter jackets',
    color: '#d4836a'
  },
  {
    id: 'all',
    label: 'Browse Everything',
    icon: Layers,
    desc: 'Explore all active student listings across campus departments',
    color: '#0f3028'
  }
];

export default function CategoriesPage() {
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListings({ perPage: 50 }).then(({ listings, total: listingTotal }) => {
      const tally = {};
      listings.forEach((l) => {
        tally[l.category] = (tally[l.category] || 0) + 1;
      });
      setCounts(tally);
      setTotal(listingTotal ?? listings.length);
    }).catch((error) => {
      window.dispatchEvent(new CustomEvent('shareloop:error', { detail: error.message }));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="categories-page">
      <div className="categories-page__hero">
        <div className="container categories-page__hero-inner">
          <div>
            <p className="section-eyebrow">THE CAMPUS EDIT</p>
            <h1 className="categories-page__heading">Find your corner<br />of campus.</h1>
            <p className="categories-page__sub">
              From first-day essentials to the little things that make a semester yours.
            </p>
          </div>
          <div className="categories-page__hero-note" aria-label={`${CATEGORY_DEFINITIONS.length - 1} categories and ${loading ? 'loading' : total} active listings`}>
            <span className="categories-page__hero-note-label">A little of everything</span>
            <strong>{CATEGORY_DEFINITIONS.length - 1}<span> categories</span></strong>
            <span className="categories-page__hero-note-foot">{loading ? 'Loading listings' : `${total} active listings`}</span>
          </div>
        </div>
      </div>

      <div className="container categories-page__content">
        <div className="categories-page__section-heading">
          <div>
            <p className="section-eyebrow">BROWSE THE DEPARTMENTS</p>
            <h2>Good finds, sorted.</h2>
          </div>
          <span>{CATEGORY_DEFINITIONS.length} ways to share</span>
        </div>
        <div className="categories-full-grid">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'all' ? total : counts[cat.id] ?? 0;
            return (
              <Link
                key={cat.id}
                className="category-card"
                to={cat.id === 'all' ? '/marketplace' : `/marketplace?category=${cat.id}`}
                style={{ '--category-accent': cat.color }}
              >
                <div className="category-card__icon-wrap">
                  <Icon size={21} strokeWidth={1.8} />
                </div>
                <div className="category-card__info">
                  <div className="category-card__header">
                    <h3 className="category-card__title">{cat.label}</h3>
                    <span className="category-card__count">
                      {loading ? '…' : `${count} ${count === 1 ? 'item' : 'items'}`}
                    </span>
                  </div>
                  <p className="category-card__desc">{cat.desc}</p>
                </div>
                <div className="category-card__arrow">
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="categories-banner">
          <div className="categories-banner__copy">
            <span className="categories-banner__eyebrow">PASS IT ON</span>
            <h3 className="categories-banner__title">Some of the best things cost nothing.</h3>
            <p className="categories-banner__sub">
              Find a freebie, borrow what you need, and keep campus life in circulation.
            </p>
          </div>
          <Link className="categories-banner__link" to="/marketplace?type=free">
            Explore free &amp; borrow <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
