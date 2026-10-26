import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <span className="logo-text logo-text--light">share<em>loop</em>.</span>
          </Link>
          <p className="footer__tagline">Good things deserve<br />another semester.</p>
          <p className="footer__copy">© 2024 SHARELOOP. MADE FOR CAMPUS LIFE.</p>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">EXPLORE</h4>
          <ul className="footer__links">
            <li><Link to="/marketplace">Marketplace</Link></li>
            <li><Link to="/marketplace?type=all">Categories</Link></li>
            <li><Link to="/marketplace?type=free">Free &amp; borrow</Link></li>
          </ul>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">NEED A HAND?</h4>
          <ul className="footer__links">
            <li><Link to="/how-it-works">How it works</Link></li>
            <li><Link to="/faq">Frequently asked</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">YOUR ACCOUNT</h4>
          <ul className="footer__links">
            <li><Link to="/login">Log in</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </div>

        <div className="footer__col">
          <h4 className="footer__heading">THE FINE PRINT</h4>
          <ul className="footer__links">
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms of use</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
