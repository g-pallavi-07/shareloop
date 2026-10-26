import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useFavorites } from '../context/AppContext.jsx';
import { useAuth } from '../context/AppContext.jsx';

export default function Header() {
  const { count } = useFavorites();
  const { isLoggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  return (
    <header className="header">
      <div className="header__inner container">
        <Link to="/" className="header__logo">
          <span className="logo-text">share<em>loop</em>.</span>
        </Link>

        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`} aria-label="Main navigation">
          <Link to="/marketplace" className="header__nav-link" onClick={() => setMenuOpen(false)}>Marketplace</Link>
          <Link to="/categories" className="header__nav-link" onClick={() => setMenuOpen(false)}>Categories</Link>
          <Link to="/how-it-works" className="header__nav-link" onClick={() => setMenuOpen(false)}>How It Works</Link>
          <Link to="/about" className="header__nav-link" onClick={() => setMenuOpen(false)}>About</Link>
          {isLoggedIn && (
            <Link to="/dashboard" className="header__nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          )}
          {!isLoggedIn && (
            <>
              <Link to="/login" className="header__nav-link header__nav-link--mobile-only" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/register" className="header__nav-link header__nav-link--mobile-only" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </nav>

        <div className="header__actions">
          <button
            className="header__icon-btn"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={20} />
          </button>

          <Link to="/favorites" className="header__icon-btn header__icon-btn--relative" aria-label={`Favourites (${count})`}>
            <Heart size={20} />
            {count > 0 && <span className="header__badge">{count}</span>}
          </Link>

          {isLoggedIn ? (
            <div className="header__user">
              <button className="header__user-btn" onClick={logout} title="Log out">
                {user?.name?.split(' ')[0]}
              </button>
            </div>
          ) : (
            <Link to="/login" className="header__desktop-login">Log in</Link>
          )}

          <Link to="/create-listing" className="btn btn--dark header__cta">
            List an Item <span className="btn-arrow">→</span>
          </Link>

          <button
            className="header__mobile-menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="header__search-bar">
          <form className="header__search-form container" onSubmit={handleSearch}>
            <Search size={18} className="header__search-icon" />
            <input
              autoFocus
              type="search"
              placeholder="Search for items, textbooks, gadgets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header__search-input"
            />
            <button type="submit" className="btn btn--dark">Search</button>
            <button type="button" className="header__icon-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
