import { Navigate, createHashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LogbookScreen } from './features/logbook/LogbookScreen';
import { EquipmentScreen } from './features/equipment/EquipmentScreen';
import { MaterialsScreen } from './features/materials/MaterialsScreen';
import { NotesScreen } from './features/notes/NotesScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { RouteError } from './components/RouteError';

export const router = createHashRouter([
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
        lazy: () => import('./features/calculator/CalculatorScreen').then((m) => ({ Component: m.CalculatorScreen })),
      },
      { path: 'anlagen/*', element: <EquipmentScreen /> },
      { path: 'material/*', element: <MaterialsScreen /> },
      { path: 'notizen/*', element: <NotesScreen /> },
      { path: 'einstellungen', element: <SettingsScreen /> },
      { path: '*', element: <Navigate to="/logbuch" replace /> },
    ],
  },
]);
