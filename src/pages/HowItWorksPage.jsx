import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'List your item',
    body: 'It takes less than 3 minutes. Add photos, a description, set your price, borrow terms, or mark it free.',
  },
  {
    num: '02',
    title: 'Get a request',
    body: 'Interested students send you a request with a message. You review and accept or decline.',
  },
  {
    num: '03',
    title: 'Exchange on campus',
    body: 'Meet within campus to hand over the item. For borrows, agree on a return date.',
  },
  {
    num: '04',
    title: 'Complete the loop',
    body: 'Mark the transaction complete. Items keep moving. Resources keep circulating.',
  },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();
  return (
    <div className="how-page">
      <section className="how-page__hero">
        <div className="container">
          <p className="section-eyebrow">THE SHARELOOP WAY</p>
          <h1 className="how-page__heading">How it works</h1>
          <p className="how-page__sub">
            A simple four-step loop that keeps campus resources moving.
          </p>
        </div>
      </section>

      <section className="how-page__steps">
        <div className="container">
          <div className="how-steps-grid">
            {steps.map((s) => (
              <div key={s.num} className="how-step">
                <div className="how-step__num">{s.num}</div>
                <h3 className="how-step__title">{s.title}</h3>
                <p className="how-step__body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-page__cta">
        <div className="container how-page__cta-inner">
          <h2 className="how-page__cta-heading">Ready to start?</h2>
          <div className="how-page__cta-btns">
            <button className="btn btn--dark" onClick={() => navigate('/marketplace')}>
              Browse Marketplace <ArrowRight size={16} />
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
