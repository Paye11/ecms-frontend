import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import axios from 'axios';
import PDFViewer from './components/PDFViewer';



// Import all components
import Login from './pages/Login.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ClerkDashboard from './pages/ClerkDashboard.jsx'
import JusticeDashboard from './pages/JusticeDashboard.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import CreateUser from './pages/CreateUser.jsx'
import ClerkMyReports from './pages/ClerkMyReports.jsx'
import ReturnsAssignment from './pages/ReturnsAssignment.jsx'
import AdminReports from './pages/AdminReports.jsx'
import AdminCourtSelector from './pages/AdminCourtSelector.jsx'
import ChiefJusticeDashboard from './pages/ChiefJusticeDashboard.jsx'
import ChiefJusticeCourtSelector from './pages/ChiefJusticeSelector.jsx'
import ChiefReports from './pages/ChiefReports.jsx'

// Magistrate Report Components
import MagistrateForm from './pages/MagistrateForm.jsx'
import ClerkMagistrateMyReports from './pages/ClerkMagistrateMyReports.jsx'
import AdminMagistrateReports from './pages/AdminMagistrateReports.jsx'
import ChiefMagistrateReports from './pages/ChiefMagistrateReports.jsx'

// Jury Payroll Components
import JuryForm from './pages/JuryForm.jsx'
import ClerkJuryMyReports from './pages/ClerkJuryMyReports.jsx'
import AdminJuryReports from './pages/AdminJuryReports.jsx'
import ChiefJuryReports from './pages/ChiefJuryReports.jsx'

// Criminal Docket Components
import CriminalDocketForm from './pages/CriminalDocketForm.jsx'
import ClerkCriminalMyDockets from './pages/ClerkCriminalMyDockets.jsx'
import AdminCriminalDockets from './pages/AdminCriminalDockets.jsx'
import ChiefCriminalDockets from './pages/ChiefCriminalDockets.jsx'

// Civil Docket Components
import CivilDocketForm from './pages/CivilDocketForm.jsx'
import ClerkCivilMyDockets from './pages/ClerkCivilMyDockets.jsx'
import AdminCivilDockets from './pages/AdminCivilDockets.jsx'
import ChiefCivilDockets from './pages/ChiefCivilDockets.jsx'

// Court Fees, Fines and Costs Components
import ClerkCourtFeeForm from './pages/ClerkCourtFeeForm.jsx'
import ClerkCourtFeeMyReports from './pages/ClerkCourtFeeMyReports.jsx'
import AdminCourtFeeReports from './pages/AdminCourtFeeReports.jsx'
import ChiefCourtFeeReports from './pages/ChiefCourtFeeReports.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/create" element={
        <ProtectedRoute allowedRole="Court Admin">
          <CreateUser />
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminReports />
        </ProtectedRoute>
      } />
      <Route path="/admin/magistrate-reports" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminMagistrateReports />
        </ProtectedRoute>
      } />
      <Route path="/admin/jury-reports" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminJuryReports />
        </ProtectedRoute>
      } />
      <Route path="/admin/criminal-dockets" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminCriminalDockets />
        </ProtectedRoute>
      } />

<Route path="/admin/civil-dockets" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminCivilDockets />
        </ProtectedRoute>
      } />

      <Route path="/admin/court-fees-reports" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminCourtFeeReports />
        </ProtectedRoute>
      } />
      <Route path="/admin/courts" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminCourtSelector />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRole="Court Admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Clerk Routes */}
      <Route path="/clerk" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkDashboard />
        </ProtectedRoute>
      } />
      <Route path="/clerk/returns" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ReturnsAssignment />
        </ProtectedRoute>
      } />
      <Route path="/clerk/my-reports" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkMyReports />
        </ProtectedRoute>
      } />
      <Route path="/clerk/magistrate" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <MagistrateForm />
        </ProtectedRoute>
      } />
      <Route path="/clerk/magistrate-reports" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkMagistrateMyReports />
        </ProtectedRoute>
      } />
      <Route path="/clerk/jury" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <JuryForm />
        </ProtectedRoute>
      } />
      <Route path="/clerk/jury-reports" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkJuryMyReports />
        </ProtectedRoute>
      } />
      <Route path="/clerk/criminal-docket" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <CriminalDocketForm />
        </ProtectedRoute>
      } />
      <Route path="/clerk/criminal-dockets" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkCriminalMyDockets />
        </ProtectedRoute>
      } />
      <Route path="/clerk/civil-docket" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <CivilDocketForm />
        </ProtectedRoute>
      } />
      <Route path="/clerk/civil-dockets" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkCivilMyDockets />
        </ProtectedRoute>
      } />
      <Route path="/clerk/court-fees" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkCourtFeeForm />
        </ProtectedRoute>
      } />
      <Route path="/clerk/court-fees-reports" element={
        <ProtectedRoute allowedRole="Circuit Clerk">
          <ClerkCourtFeeMyReports />
        </ProtectedRoute>
      } />


<Route path="/clerk/court-fees/form/:id?" element={
  <ProtectedRoute allowedRole="Circuit Clerk">
    <ClerkCourtFeeForm />
  </ProtectedRoute>
} />







      {/* Chief Justice Routes */}
      <Route path="/chief-justice/dashboard" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefJusticeDashboard />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/courts" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefJusticeCourtSelector />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/reports" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefReports />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/magistrate-reports" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefMagistrateReports />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/jury-reports" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefJuryReports />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/criminal-dockets" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefCriminalDockets />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/civil-dockets" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefCivilDockets />
        </ProtectedRoute>
      } />
      <Route path="/chief-justice/court-fees-reports" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <ChiefCourtFeeReports />
        </ProtectedRoute>
      } />

      {/* Justice Routes (if needed) */}
      <Route path="/justice" element={
        <ProtectedRoute allowedRole="Chief Justice">
          <JusticeDashboard />
        </ProtectedRoute>
      } />





<Route path="/view-pdf/:filename" element={<PDFViewer />} />

    </Routes>
  </BrowserRouter>
)