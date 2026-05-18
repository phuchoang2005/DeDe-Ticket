import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';

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
import AdminEventsListPage from './pages/admin/AdminEventsListPage';
import AdminEventEditorPage from './pages/admin/AdminEventEditorPage';
import AdminVenueEditorPage from './pages/admin/AdminVenueEditorPage';
import AnalyticsDashboardPage from './pages/admin/AnalyticsDashboardPage';

const adminRoles = ['ADMIN', 'ORGANIZER'];

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
            <Route path="admin/events" element={<RequireRole roles={adminRoles}><AdminEventsListPage /></RequireRole>} />
            <Route path="admin/events/:id" element={<RequireRole roles={adminRoles}><AdminEventEditorPage /></RequireRole>} />
            <Route path="admin/events/:id/venue" element={<RequireRole roles={adminRoles}><AdminVenueEditorPage /></RequireRole>} />
            <Route path="admin/analytics" element={<RequireRole roles={adminRoles}><AnalyticsDashboardPage /></RequireRole>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
