import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthScreen from './pages/AuthScreen'
import InputScreen from './pages/InputScreen'
import ReaderScreen from './pages/ReaderScreen'
import VocabScreen from './pages/VocabScreen'
import DashboardScreen from './pages/DashboardScreen'
import './App.css'

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-loading">Loading…</div>
    )
  }
  if (!token) return <Navigate to="/auth" replace />
  return children
}

function AuthRoute() {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-loading">Loading…</div>
    )
  }
  if (token) return <Navigate to="/input" replace />
  return <AuthScreen />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/input"
        element={
          <ProtectedRoute>
            <InputScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reader"
        element={
          <ProtectedRoute>
            <ReaderScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vocab"
        element={
          <ProtectedRoute>
            <VocabScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/input" replace />} />
      <Route path="*" element={<Navigate to="/input" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
