import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './features/auth'
import LoginPage from './pages/LoginPage'
import Layout from './layouts/Layout'
import HomePage from './pages/HomePage'
import IncomesPage from './pages/IncomesPage'
import ExpensesPage from './pages/ExpensesPage'
import PartnersPage from './pages/PartnersPage'
import EmployeesPage from './pages/EmployeesPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

function Private({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<HomePage />} />
        <Route path="incomes" element={<IncomesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
