import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Flag, Star } from 'lucide-react';
import { useAuth } from '../context/AppContext.jsx';
import { getPublicUser, getUserReviews } from '../services/api.js';
import ReportDialog from '../components/ReportDialog.jsx';

function formatReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getPublicUser(id), getUserReviews(id)])
      .then(([publicProfile, reviewList]) => {
        if (!active) return;
        setProfile(publicProfile);
        setReviews(reviewList.reviews);
        setError('');
        setLoadedUserId(id);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Unable to load this profile.');
        setLoadedUserId(id);
      });
    return () => { active = false; };
  }, [id]);

  if (loadedUserId !== id) return <div className="page-loading container"><div className="spinner" /></div>;
  if (error || !profile) {
    return (
      <div className="empty-state container profile-error">
        <h1 className="empty-state__heading">{error || 'User not found.'}</h1>
        <button className="btn btn--dark" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const ownProfile = isLoggedIn && String(user.id) === String(profile.user.id);

  return (
    <section className="profile-page">
      <div className="container">
        <header className="profile-header">
          <div className="profile-header__avatar">
            {profile.user.avatar
              ? <img src={profile.user.avatar} alt="" />
              : profile.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-header__info">
            <p className="section-eyebrow">ShareLoop member</p>
            <h1>{profile.user.name}</h1>
            <p>{profile.user.department} · {profile.user.year}</p>
            {profile.user.joinedAt && <span>Member since {formatReviewDate(profile.user.joinedAt)}</span>}
          </div>
          {isLoggedIn && !ownProfile && (
            <button type="button" className="btn btn--ghost-sm" onClick={() => setReportOpen(true)}>
              <Flag size={14} /> Report user
            </button>
          )}
        </header>

        <section className="profile-reviews" aria-labelledby="profile-reviews-heading">
          <div className="profile-reviews__heading">
            <div>
              <p className="section-eyebrow">Community feedback</p>
              <h2 id="profile-reviews-heading">Reviews &amp; Ratings</h2>
            </div>
            <div className="profile-rating-summary">
              <Star size={23} fill="currentColor" />
              <strong>{profile.average_rating ? profile.average_rating.toFixed(1) : '—'}</strong>
              <span>{profile.review_count} {profile.review_count === 1 ? 'review' : 'reviews'}</span>
            </div>
          </div>

          {reviews.length ? (
            <div className="profile-review-list">
              {reviews.map((review) => (
                <article className="profile-review" key={review.order_id + review.reviewer_id}>
                  <div className="profile-review__top">
                    <Link to={`/users/${review.reviewer_id}`} className="profile-review__reviewer">
                      <span className="profile-review__avatar">{review.reviewer_name.charAt(0)}</span>
                      <span>
                        <strong>{review.reviewer_name}</strong>
                        <small>{review.reviewer_department} · {review.reviewer_year}</small>
                      </span>
                    </Link>
                    <time dateTime={review.created_at}>{formatReviewDate(review.created_at)}</time>
                  </div>
                  <div className="profile-review__stars" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} size={16} fill={index < review.rating ? 'currentColor' : 'none'} />
                    ))}
                    <strong>{review.rating}/5</strong>
                  </div>
                  {review.comment && <p className="profile-review__comment">{review.comment}</p>}
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-reviews__empty">No reviews yet. Completed transactions can be reviewed here.</div>
          )}
        </section>
      </div>
      {reportOpen && (
        <ReportDialog targetType="user" targetId={profile.user.id} targetLabel={profile.user.name}
          onClose={() => setReportOpen(false)} />
      )}
    </section>
  );
}
