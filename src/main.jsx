import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1E1F25',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '10px',
            },
          }}
        />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
