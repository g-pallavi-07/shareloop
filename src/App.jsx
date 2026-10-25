import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AboutPage from './pages/AboutPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import HomePage from './pages/HomePage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import ListingDetailPage from './pages/ListingDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CreateListingPage from './pages/CreateListingPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import HowItWorksPage from './pages/HowItWorksPage.jsx';
import { FavoritesProvider, AuthProvider, ToastProvider } from './context/AppContext.jsx';

function NotFoundPage() {
  return (
    <div className="empty-state" style={{ minHeight: '60vh', justifyContent: 'center' }}>
      <div className="empty-state__icon">🗺️</div>
      <h3 className="empty-state__heading">Page not found</h3>
      <p className="empty-state__body">This page doesn't exist or has moved.</p>
      <a href="/" className="btn btn--dark">Go Home</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/listing/:id" element={<ListingDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/create-listing" element={<CreateListingPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
