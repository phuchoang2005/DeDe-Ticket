import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './components/RequireAuth';

import HomePage from './pages/HomePage';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MyTicketsPage from './pages/MyTicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="events" element={<EventListPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="checkout/:id" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="tickets" element={<RequireAuth><MyTicketsPage /></RequireAuth>} />
            <Route path="tickets/:id" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
            <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
