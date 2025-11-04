import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { MainPage } from './pages/MainPage';
import { Dashboard } from './pages/Dashboard';
import { AICompute } from './pages/AICompute';
import { DeveloperTools } from './pages/DeveloperTools';
import './styles/globals.css';
import './styles/main-page.css';
import './styles/dashboard.css';
import './styles/ai-compute.css';
import './styles/developer-tools.css';

function App() {
  const [currentPage, setCurrentPage] = useState('main');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
            <Dashboard />
          </Layout>
        );
      case 'ai-compute':
        return (
          <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
            <AICompute />
          </Layout>
        );
      case 'developer-tools':
        return (
          <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
            <DeveloperTools />
          </Layout>
        );
      default:
        return <MainPage onNavigate={setCurrentPage} />;
    }
  };

  return renderCurrentPage();
}

export default App;