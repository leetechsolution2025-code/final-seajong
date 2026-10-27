import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import App from './App';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

import { ToastProvider } from './components/ui/Toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DepartmentProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DepartmentProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
