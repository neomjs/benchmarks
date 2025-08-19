import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerLicense } from '@syncfusion/ej2-base';
import { syncfusionLicenseKey } from '../license.js';
import './index.css';
import App from './App.jsx';

// Registering Syncfusion license key
registerLicense(syncfusionLicenseKey);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)