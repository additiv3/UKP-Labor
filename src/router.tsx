import { Navigate, createHashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LogbookScreen } from './features/logbook/LogbookScreen';
import { EquipmentScreen } from './features/equipment/EquipmentScreen';
import { MaterialsScreen } from './features/materials/MaterialsScreen';
import { NotesScreen } from './features/notes/NotesScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { RouteError } from './components/RouteError';
import { PrintRoot } from './features/print/PrintScreens';

export const router = createHashRouter([
  // Druckansichten ohne Navigation (eigenes, helles Layout)
  { path: '/druck/*', element: <PrintRoot />, errorElement: <RouteError /> },
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/logbuch" replace /> },
      { path: 'logbuch/*', element: <LogbookScreen /> },
      {
        path: 'rechner/*',
        // KaTeX + uPlot nur bei Bedarf laden (Service Worker cacht trotzdem alles für offline).
        lazy: () => import('./features/calculator/CalculatorRoot').then((m) => ({ Component: m.CalculatorRoot })),
      },
      { path: 'anlagen/*', element: <EquipmentScreen /> },
      { path: 'material/*', element: <MaterialsScreen /> },
      { path: 'notizen/*', element: <NotesScreen /> },
      { path: 'einstellungen', element: <SettingsScreen /> },
      { path: '*', element: <Navigate to="/logbuch" replace /> },
    ],
  },
]);
