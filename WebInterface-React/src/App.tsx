import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContainer from './components/NotificationContainer';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { useNotifications } from './hooks/useNotifications';
import { setupGlobalErrorHandlers } from './hooks/useErrorHandler';
import './styles/global.css';

// Lazy load pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

const App: React.FC = () => {
  const notificationHook = useNotifications();

  useEffect(() => {
    // Setup global error handlers
    setupGlobalErrorHandlers(notificationHook.addNotification);
  }, [notificationHook.addNotification]);

  const PageLoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner 
        size="lg" 
        text="Loading page..." 
        color="primary"
      />
    </div>
  );

  return (
    <ErrorBoundary
      onError={() => {
        notificationHook.addNotification(
          'Application error occurred. Please try refreshing the page.',
          'error'
        );
      }}
    >
      <div className="App">
        <Router>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <ErrorBoundary>
                    <LandingPage />
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ErrorBoundary>
                    <DashboardPage notificationHook={notificationHook} />
                  </ErrorBoundary>
                } 
              />
            </Routes>
          </Suspense>
        </Router>
        <NotificationContainer {...notificationHook} />
      </div>
    </ErrorBoundary>
  );
};

export default App;