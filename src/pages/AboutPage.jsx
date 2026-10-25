import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Heart, Sparkles, RefreshCw, Users, BookOpen, Leaf } from 'lucide-react';
import { useInView } from '../hooks/useInView.js';

function FadeSection({ children, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`fade-section ${inView ? 'fade-section--visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="container about-hero__inner">
          <p className="section-eyebrow">THE CAMPUS STORY</p>
          <h1 className="about-hero__heading">
            Good things deserve<br />
            <em className="about-hero__em">another semester.</em>
          </h1>
          <p className="about-hero__sub">
            ShareLoop is a student-first campus marketplace created to help college students buy,
            sell, borrow, lend, and give away items within their college community.
          </p>
        </div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────── */}
      <section className="about-stats-section">
        <div className="container">
          <div className="about-stats-grid">
            <div className="about-stat-card">
              <span className="about-stat-num">₹4.8L+</span>
              <span className="about-stat-label">Saved by Students</span>
              <span className="about-stat-desc">On semester textbooks, lab gear &amp; calculators</span>
            </div>
            <div className="about-stat-card">
              <span className="about-stat-num">1,850+</span>
              <span className="about-stat-label">Items Re-circulated</span>
              <span className="about-stat-desc">Kept away from campus waste &amp; hostel cleanouts</span>
            </div>
            <div className="about-stat-card">
              <span className="about-stat-num">3,200+</span>
              <span className="about-stat-label">Verified Students</span>
              <span className="about-stat-desc">Exchanging safely within college gates</span>
            </div>
            <div className="about-stat-card">
              <span className="about-stat-num">100%</span>
              <span className="about-stat-label">College-Gated</span>
              <span className="about-stat-desc">Only verified college email addresses</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission Pillars ──────────────────────────────── */}
      <FadeSection className="about-mission-section">
        <div className="container">
          <div className="about-section-header">
            <p className="section-eyebrow">OUR VALUES</p>
            <h2 className="about-section-title">Built around student realities</h2>
            <p className="about-section-sub">
              Every college semester demands expensive books, calculators, drafters, and hostel gear that get used for only four months. We make sure they don't sit unused.
            </p>
          </div>

          <div className="about-pillars-grid">
            <div className="about-pillar-card">
              <div className="about-pillar-icon"><RefreshCw size={26} /></div>
              <h3 className="about-pillar-title">Circulation over Consumption</h3>
              <p className="about-pillar-body">
                Why pay full retail for a lab coat or an engineering graphics drafter you need for 14 weeks? Pass it on, borrow it, or grab it second-hand.
              </p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon"><ShieldCheck size={26} /></div>
              <h3 className="about-pillar-title">Verified Campus Safety</h3>
              <p className="about-pillar-body">
                No strangers, no shady courier deliveries. Every user is verified with a college email, and all handoffs happen right here on campus.
              </p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon"><Heart size={26} /></div>
              <h3 className="about-pillar-title">Free &amp; Borrowing Culture</h3>
              <p className="about-pillar-body">
                Not everything needs a price tag. Share notes, lend reference books before exams, and give away hostel essentials to incoming freshmen.
              </p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon"><Leaf size={26} /></div>
              <h3 className="about-pillar-title">Zero Campus Waste</h3>
              <p className="about-pillar-body">
                Reduce end-of-semester hostel dumpster waste. Items stay in circulation from seniors to juniors, semester after semester.
              </p>
            </div>
          </div>
        </div>
      </FadeSection>

      {/* ── How Campus Meetups Work ───────────────────────── */}
      <FadeSection className="about-meetups-section">
        <div className="container">
          <div className="about-meetups-card">
            <div className="about-meetups-content">
              <p className="section-eyebrow">TRUST &amp; SAFETY</p>
              <h2 className="about-meetups-title">Safe handoffs across campus spots</h2>
              <p className="about-meetups-body">
                ShareLoop makes exchanges completely hassle-free:
              </p>
              <ul className="about-meetups-list">
                <li>
                  <Sparkles size={18} className="about-check-icon" />
                  <span><strong>Central Library foyer:</strong> Popular quiet spot for textbook and calculator swaps</span>
                </li>
                <li>
                  <Sparkles size={18} className="about-check-icon" />
                  <span><strong>Campus Canteen / Cafeteria:</strong> Daytime casual meetups over chai</span>
                </li>
                <li>
                  <Sparkles size={18} className="about-check-icon" />
                  <span><strong>Hostel Gates &amp; Common Rooms:</strong> Quick handovers for room essentials and sports kit</span>
                </li>
              </ul>
            </div>
            <div className="about-meetups-badge-wrap">
              <div className="hero__green-badge about-badge-lg">
                <span className="hero__green-badge-small">CAMPUS FIRST</span>
                <em className="hero__green-badge-em">zero<br />delivery<br />fees</em>
              </div>
            </div>
          </div>
        </div>
      </FadeSection>

      {/* ── Ready to Start CTA ────────────────────────────── */}
      <section className="about-cta-section">
        <div className="container about-cta-inner">
          <h2 className="about-cta-heading">Ready to find your next campus gem?</h2>
          <p className="about-cta-body">
            Join thousands of college students exchanging resources every single semester.
          </p>
          <div className="about-cta-buttons">
            <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>
              Explore the Marketplace <ArrowRight size={16} />
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/create-listing')}>
              List an Item <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
