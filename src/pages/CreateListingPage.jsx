import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import { createListing } from '../services/api.js';
import { useToast, useAuth } from '../context/AppContext.jsx';

const CATEGORIES = [
  'Textbooks', 'Tech & Gadgets', 'Academic Essentials', 'Lab Equipment',
  'Stationery', 'Hostel Essentials', 'Sports & Fitness', 'Cycles & Transport',
  'Electronics', 'Furniture', 'Clothing', 'Other',
];

const CONDITIONS = ['Like New', 'Good', 'Fair', 'Well Used'];

const CATEGORY_IDS = {
  'Textbooks': 'textbooks', 'Tech & Gadgets': 'tech-gadgets',
  'Academic Essentials': 'academic-essentials', 'Lab Equipment': 'lab-equipment',
  'Stationery': 'stationery', 'Hostel Essentials': 'hostel-essentials',
  'Sports & Fitness': 'sports', 'Cycles & Transport': 'cycles',
  'Electronics': 'electronics', 'Furniture': 'furniture',
  'Clothing': 'clothing', 'Other': 'other',
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  const [form, setForm] = useState({
    title: '', type: 'sale', category: '', condition: '',
    price: '', borrowDuration: '', description: '', quantity: '1',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  function set(key) {
    return (e) => {
      setForm((v) => ({ ...v, [key]: e.target.value }));
      setErrors((v) => ({ ...v, [key]: '' }));
    };
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.category) e.category = 'Select a category.';
    if (!form.condition) e.condition = 'Select the condition.';
    if (form.type === 'sale' && !form.price) e.price = 'Enter the price.';
    if (form.type === 'borrow' && !form.borrowDuration) e.borrowDuration = 'Specify borrow duration.';
    if (!form.description.trim()) e.description = 'Add a description.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const categoryLabel = form.category;
      const category = CATEGORY_IDS[form.category] ?? 'other';
      const conditionLabel = form.condition;
      const condition = form.condition.toLowerCase().replace(/ /g, '-');
      const seller = { id: user?.id ?? 'u0', name: user?.name ?? 'You', department: user?.department ?? '', year: user?.year ?? '' };
      const images = previewUrls.length
        ? previewUrls
        : ['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop'];
      const newListing = await createListing({
        ...form,
        category, categoryLabel, condition, conditionLabel,
        price: form.type === 'sale' ? Number(form.price) : null,
        borrowDuration: form.type === 'borrow' ? form.borrowDuration : undefined,
        images, seller, tags: [form.title.toLowerCase()],
      });
      addToast('Listing created!', 'success');
      navigate(`/listing/${newListing.id}`);
    } catch {
      addToast('Failed to create listing. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleImages(e) {
    const files = Array.from(e.target.files);
    files.slice(0, 4).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrls((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  }

  return (
    <div className="create-page">
      <div className="container">
        <div className="create-page__header">
          <h1 className="create-page__heading">List an Item</h1>
          <p className="create-page__sub">Help another student find what they need.</p>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          {/* ── Listing Type ─────────────────────────────────────── */}
          <div className="create-form__section">
            <h3 className="create-form__section-title">Listing Type</h3>
            <div className="type-toggle">
              {['sale', 'borrow', 'free'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`type-toggle__btn ${form.type === t ? 'type-toggle__btn--active' : ''}`}
                  onClick={() => setForm((v) => ({ ...v, type: t }))}
                >
                  {t === 'sale' ? '🏷️ For Sale' : t === 'borrow' ? '🔄 Lend / Borrow' : '🎁 Give Away Free'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Basic Details ────────────────────────────────────── */}
          <div className="create-form__section">
            <h3 className="create-form__section-title">Item Details</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title *</label>
              <input id="title" type="text" className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                placeholder="e.g. Casio fx-991ES Plus" value={form.title} onChange={set('title')} />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="create-form__row">
              <div className="form-group">
                <label className="form-label" htmlFor="category">Category *</label>
                <select id="category" className={`form-input form-select ${errors.category ? 'form-input--error' : ''}`}
                  value={form.category} onChange={set('category')}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <span className="form-error">{errors.category}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="condition">Condition *</label>
                <select id="condition" className={`form-input form-select ${errors.condition ? 'form-input--error' : ''}`}
                  value={form.condition} onChange={set('condition')}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.condition && <span className="form-error">{errors.condition}</span>}
              </div>
            </div>

            {/* Conditional fields */}
            {form.type === 'sale' && (
              <div className="form-group">
                <label className="form-label" htmlFor="price">Price (₹) *</label>
                <input id="price" type="number" min="0" className={`form-input ${errors.price ? 'form-input--error' : ''}`}
                  placeholder="e.g. 500" value={form.price} onChange={set('price')} />
                {errors.price && <span className="form-error">{errors.price}</span>}
              </div>
            )}
            {form.type === 'borrow' && (
              <div className="form-group">
                <label className="form-label" htmlFor="borrowDuration">Borrow Duration *</label>
                <input id="borrowDuration" type="text" className={`form-input ${errors.borrowDuration ? 'form-input--error' : ''}`}
                  placeholder="e.g. 1 week, 3 days" value={form.borrowDuration} onChange={set('borrowDuration')} />
                {errors.borrowDuration && <span className="form-error">{errors.borrowDuration}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description *</label>
              <textarea id="description" rows={5} className={`form-input form-textarea ${errors.description ? 'form-input--error' : ''}`}
                placeholder="Describe the item: condition, usage history, what's included…"
                value={form.description} onChange={set('description')} />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </div>
          </div>

          {/* ── Images ──────────────────────────────────────────── */}
          <div className="create-form__section">
            <h3 className="create-form__section-title">Photos</h3>
            <label className="image-upload-zone">
              <ImagePlus size={28} />
              <span>Click to upload photos (up to 4)</span>
              <input type="file" accept="image/*" multiple onChange={handleImages} className="image-upload-zone__input" />
            </label>
            {previewUrls.length > 0 && (
              <div className="image-preview-row">
                {previewUrls.map((url, i) => (
                  <div key={i} className="image-preview">
                    <img src={url} alt={`Preview ${i + 1}`} />
                    <button type="button" className="image-preview__remove"
                      onClick={() => setPreviewUrls((p) => p.filter((_, j) => j !== i))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="create-form__submit-row">
            <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn--dark" disabled={loading}>
              {loading ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
