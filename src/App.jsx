import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import JobSearch from './pages/public/JobSearch';
import JobDetails from './pages/public/JobDetails';
import ForEmployers from './pages/public/ForEmployers';
import BlogList from './pages/public/BlogList';
import BlogDetail from './pages/public/BlogDetail';
import ComingSoon from './pages/public/ComingSoon';

import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateProfile from './pages/candidate/Profile';
import CandidateApplications from './pages/candidate/Applications';
import SavedJobs from './pages/candidate/SavedJobs';

import EmployerDashboard from './pages/employer/Dashboard';
import JobForm from './pages/employer/JobForm';
import ManageJobs from './pages/employer/ManageJobs';
import JobApplicants from './pages/employer/JobApplicants';
import CompanyProfile from './pages/employer/CompanyProfile';
import CandidateSearch from './pages/employer/CandidateSearch';
import EmployerAnalytics from './pages/employer/Analytics';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminEmployers from './pages/admin/Employers';
import AdminJobs from './pages/admin/Jobs';
import AdminCMS from './pages/admin/CMS';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';

import Messages from './pages/shared/Messages';
import Notifications from './pages/shared/Notifications';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#161d33', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
        }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/jobs" element={<JobSearch />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/employers" element={<ForEmployers />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />

          {/* Candidate */}
          <Route path="/candidate/dashboard" element={
            <ProtectedRoute allowedRoles={['candidate']}><CandidateDashboard /></ProtectedRoute>
          } />
          <Route path="/candidate/profile" element={
            <ProtectedRoute allowedRoles={['candidate']}><CandidateProfile /></ProtectedRoute>
          } />
          <Route path="/candidate/applications" element={
            <ProtectedRoute allowedRoles={['candidate']}><CandidateApplications /></ProtectedRoute>
          } />
          <Route path="/candidate/saved" element={
            <ProtectedRoute allowedRoles={['candidate']}><SavedJobs /></ProtectedRoute>
          } />
          <Route path="/candidate/messages" element={
            <ProtectedRoute allowedRoles={['candidate']}><Messages role="candidate" /></ProtectedRoute>
          } />
          <Route path="/candidate/notifications" element={
            <ProtectedRoute allowedRoles={['candidate']}><Notifications role="candidate" /></ProtectedRoute>
          } />

          {/* Employer */}
          <Route path="/employer/dashboard" element={
            <ProtectedRoute allowedRoles={['employer']}><EmployerDashboard /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/new" element={
            <ProtectedRoute allowedRoles={['employer']}><JobForm /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:id/edit" element={
            <ProtectedRoute allowedRoles={['employer']}><JobForm /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:id/applicants" element={
            <ProtectedRoute allowedRoles={['employer']}><JobApplicants /></ProtectedRoute>
          } />
          <Route path="/employer/jobs" element={
            <ProtectedRoute allowedRoles={['employer']}><ManageJobs /></ProtectedRoute>
          } />
          <Route path="/employer/candidates" element={
            <ProtectedRoute allowedRoles={['employer']}><CandidateSearch /></ProtectedRoute>
          } />
          <Route path="/employer/company" element={
            <ProtectedRoute allowedRoles={['employer']}><CompanyProfile /></ProtectedRoute>
          } />
          <Route path="/employer/analytics" element={
            <ProtectedRoute allowedRoles={['employer']}><EmployerAnalytics /></ProtectedRoute>
          } />
          <Route path="/employer/messages" element={
            <ProtectedRoute allowedRoles={['employer']}><Messages role="employer" /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/employers" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminEmployers /></ProtectedRoute>
          } />
          <Route path="/admin/jobs" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminJobs /></ProtectedRoute>
          } />
          <Route path="/admin/cms" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminCMS /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>
          } />

          <Route path="*" element={<ComingSoon title="Page" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
