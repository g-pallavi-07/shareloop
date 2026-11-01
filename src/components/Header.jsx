
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  Menu,
  X,
  Bell,
  CheckCheck,
  ShoppingBag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useFavorites, useAuth } from '../context/AppContext.jsx';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api.js';

function formatNotificationTime(date) {
  if (!date) return '';

  const notificationDate = new Date(date);

  if (Number.isNaN(notificationDate.getTime())) return '';

  return notificationDate.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'request_received':
      return <ShoppingBag size={18} />;
    case 'request_accepted':
      return <CheckCircle2 size={18} />;
    case 'request_rejected':
      return <XCircle size={18} />;
    default:
      return <Bell size={18} />;
  }
}

export default function Header() {
  const { count } = useFavorites();
  const { isLoggedIn, user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const navigate = useNavigate();

  const refreshNotifications = useCallback(async () => {
    if (!isLoggedIn) return;

    setNotificationsLoading(true);

    try {
      const items = await getNotifications();
      setNotifications(items);
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('shareloop:error', { detail: error.message })
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setNotificationsOpen(false);
    }
  }, [isLoggedIn, refreshNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  function handleSearch(e) {
    e.preventDefault();

    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  async function handleNotificationClick(notification) {
  // Mark it as read if it hasn't been read already.
  if (!notification.is_read) {
    try {
      await markNotificationAsRead(notification.notification_id);

      setNotifications((previous) =>
        previous.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, is_read: 1 }
            : item
        )
      );
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('shareloop:error', { detail: error.message })
      );
    }
  }

  // Navigate to the exact request.
  const orderId = notification.order_id;
  const type = notification.notification_type;

  if (orderId && type === 'request_received') {
    navigate(
      `/dashboard?tab=received&requestId=${encodeURIComponent(orderId)}`
    );
  } else if (
    orderId &&
    ['request_accepted', 'request_rejected'].includes(type)
  ) {
    navigate(
      `/dashboard?tab=sent&requestId=${encodeURIComponent(orderId)}`
    );
  }

  setNotificationsOpen(false);
  setMenuOpen(false);
}

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: 1 }))
      );
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('shareloop:error', { detail: error.message })
      );
    }
  }

  async function toggleNotifications() {
    const shouldOpen = !notificationsOpen;
    setNotificationsOpen(shouldOpen);

    if (shouldOpen) {
      await refreshNotifications();
    }
  }

  return (
    <header className="header">
      <div className="header__inner container">
        <Link to="/" className="header__logo">
          <span className="logo-text">share<em>loop</em>.</span>
        </Link>

        <nav
          className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}
          aria-label="Main navigation"
        >
          <Link
            to="/marketplace"
            className="header__nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Marketplace
          </Link>

          <Link
            to="/categories"
            className="header__nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Categories
          </Link>

          <Link
            to="/how-it-works"
            className="header__nav-link"
            onClick={() => setMenuOpen(false)}
          >
            How It Works
          </Link>

          {isLoggedIn && (
            <Link
              to="/dashboard"
              className="header__nav-link"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          )}

          {!isLoggedIn && (
            <>
              <Link
                to="/login"
                className="header__nav-link header__nav-link--mobile-only"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>

              <Link
                to="/register"
                className="header__nav-link header__nav-link--mobile-only"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </nav>

        <div className="header__actions">
          <button
            className="header__icon-btn"
            aria-label="Search"
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search size={20} />
          </button>

          <Link
            to="/favorites"
            className="header__icon-btn header__icon-btn--relative"
            aria-label={`Favourites (${count})`}
          >
            <Heart size={20} />
            {count > 0 && (
              <span className="header__badge">{count}</span>
            )}
          </Link>

          {isLoggedIn && (
            <div className="header__notifications">
              <button
                className="header__icon-btn header__icon-btn--relative"
                aria-label={`Notifications (${unreadCount} unread)`}
                aria-expanded={notificationsOpen}
                onClick={toggleNotifications}
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="header__badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown__header">
                    <div>
                      <h3>Notifications</h3>
                      <span>
                        {unreadCount > 0
                          ? `${unreadCount} unread`
                          : 'You are all caught up'}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        className="notification-mark-all"
                        onClick={handleMarkAllAsRead}
                      >
                        <CheckCheck size={15} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notification-dropdown__list">
                    {notificationsLoading ? (
                      <p className="notification-empty">
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={25} />
                        <p>No notifications yet</p>
                        <span>
                          Updates about your requests will appear here.
                        </span>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.notification_id}
                          className={`notification-item ${
                            !notification.is_read
                              ? 'notification-item--unread'
                              : ''
                          }`}
                          onClick={() =>
                            handleNotificationClick(notification)
                          }
                        >
                          <span
                            className={`notification-item__icon notification-item__icon--${notification.notification_type}`}
                          >
                            {getNotificationIcon(
                              notification.notification_type
                            )}
                          </span>

                          <span className="notification-item__content">
                            <span className="notification-item__message">
                              {notification.message}
                            </span>

                            <span className="notification-item__time">
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </span>
                          </span>

                          {!notification.is_read && (
                            <span className="notification-item__dot" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoggedIn ? (
            <div className="header__user">
              <button
                className="header__user-btn"
                onClick={logout}
                title="Log out"
              >
                {user?.name?.split(' ')[0]}
              </button>
            </div>
          ) : (
            <Link to="/login" className="header__desktop-login">
              Log in
            </Link>
          )}

          <Link to="/create-listing" className="btn btn--dark header__cta">
            List an Item <span className="btn-arrow">→</span>
          </Link>

          <button
            className="header__mobile-menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((value) => !value)}
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

            <button type="submit" className="btn btn--dark">
              Search
            </button>

            <button
              type="button"
              className="header__icon-btn"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
