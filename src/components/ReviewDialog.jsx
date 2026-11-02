import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview } from '../services/api.js';
import { useToast } from '../context/AppContext.jsx';

export default function ReviewDialog({ order, otherParty, onClose, onSubmitted }) {
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      await submitReview(order.id, rating, comment);
      addToast('Your review has been submitted.', 'success');
      onSubmitted();
    } catch (error) {
      addToast(error.message || 'Unable to submit your review.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title"
        onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <h2 className="dialog__title" id="review-dialog-title">Review {otherParty}</h2>
        <p className="dialog__sub">Rate your completed transaction for {order.listingTitle}.</p>
        <fieldset className="review-dialog__rating" aria-label="Rating">
          <legend className="form-label">Your rating</legend>
          <div className="review-dialog__stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" className={`review-dialog__star ${value <= rating ? 'review-dialog__star--active' : ''}`}
                aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value}
                onClick={() => setRating(value)}>
                <Star size={30} fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </fieldset>
        <label className="form-group review-dialog__comment">
          <span className="form-label">Review (optional)</span>
          <textarea className="form-input form-textarea" maxLength={2000} value={comment}
            onChange={(event) => setComment(event.target.value)} placeholder="How did the transaction go?" />
        </label>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn--dark" disabled={submitting || !rating}>
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </form>
    </div>
  );
}
