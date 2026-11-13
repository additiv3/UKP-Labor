import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistence } from './data/persist';
import { getDeviceId } from './data/repos/settings';
import './styles/global.css';

void requestPersistence();
// Geräte-ID beim ersten Start anlegen (Schreibzugriff, darf nicht in useLiveQuery passieren).
void getDeviceId();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
