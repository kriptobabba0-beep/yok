import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './utils/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TopEarners from './pages/TopEarners';
import WalletDetail from './pages/WalletDetail';
import HighStakes from './pages/HighStakes';
import Snipers from './pages/Snipers';
import TrendingMarkets from './pages/TrendingMarkets';
import NewMarkets from './pages/NewMarkets';
import WalletTracker from './pages/WalletTracker';
import MarketLeaders from './pages/MarketLeaders';

export default function App() {
  return (
    <AppProvider>
      <div className="noise-overlay" />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/top-earners" element={<TopEarners />} />
          <Route path="/wallet/:address" element={<WalletDetail />} />
          <Route path="/high-stakes" element={<HighStakes />} />
          <Route path="/snipers" element={<Snipers />} />
          <Route path="/trending" element={<TrendingMarkets />} />
          <Route path="/new-markets" element={<NewMarkets />} />
          <Route path="/tracker" element={<WalletTracker />} />
          <Route path="/leaders" element={<MarketLeaders />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
