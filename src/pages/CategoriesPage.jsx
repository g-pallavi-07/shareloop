import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListings({}).then(({ listings }) => {
      const tally = {};
      listings.forEach((l) => {
        tally[l.category] = (tally[l.category] || 0) + 1;
      });
      tally.all = listings.length;
      setCounts(tally);
      setLoading(false);
    });
  }, []);

  return (
    <div className="categories-page">
      <div className="categories-page__hero">
        <div className="container">
          <p className="section-eyebrow">EXPLORE BY CATEGORY</p>
          <h1 className="categories-page__heading">Campus Marketplace Departments</h1>
          <p className="categories-page__sub">
            Find exactly what you need for this semester — from textbooks and lab gear to hostel furniture and transport.
          </p>
        </div>
      </div>

      <div className="container categories-page__content">
        <div className="categories-full-grid">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const Icon = cat.icon;
            const count = counts[cat.id] ?? 0;
            return (
              <div
                key={cat.id}
                className="category-card"
                onClick={() =>
                  navigate(cat.id === 'all' ? '/marketplace' : `/marketplace?category=${cat.id}`)
                }
              >
                <div className="category-card__icon-wrap" style={{ backgroundColor: cat.color }}>
                  <Icon size={24} color="#ffffff" />
                </div>
                <div className="category-card__info">
                  <div className="category-card__header">
                    <h3 className="category-card__title">{cat.label}</h3>
                    <span className="category-card__count">
                      {loading ? '…' : `${count} item${count !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <p className="category-card__desc">{cat.desc}</p>
                </div>
                <div className="category-card__arrow">
                  <ArrowRight size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick action banner */}
        <div className="categories-banner">
          <div>
            <h3 className="categories-banner__title">Looking for free giveaways or borrowable items?</h3>
            <p className="categories-banner__sub">
              Seniors frequently give away lab coats, notes, and study gear for free to incoming students.
            </p>
          </div>
          <button
            className="btn btn--dark"
            onClick={() => navigate('/marketplace?type=free')}
          >
            Explore Free &amp; Borrows <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
