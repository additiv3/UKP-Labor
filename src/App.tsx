import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeSync } from './components/useThemeSync';

export function App() {
  useThemeSync();
  return <RouterProvider router={router} />;
}
