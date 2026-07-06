import { RouterProvider } from 'react-router-dom';
import { DataProvider } from './shared/contexts/DataContext.jsx';
import { AuthProvider } from './shared/contexts/AuthContext.jsx';
import { NotificationProvider } from './shared/contexts/NotificationContext.jsx';
import router from './router.jsx';

/**
 * Root Application Component
 * Wraps the app with DataContext, AuthContext, NotificationContext providers
 * and renders RouterProvider with the router configuration.
 * Handles data initialization on mount via DataProvider.
 * @module App
 */
export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AuthProvider>
    </DataProvider>
  );
}