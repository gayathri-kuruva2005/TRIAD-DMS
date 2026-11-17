
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import UploadDocument from "./pages/UploadDocument";
import DocumentDetails from "./pages/DocumentDetails";
import AccessRequests from "./pages/AccessRequests";
import AdvancedSearch from "./pages/AdvancedSearch";
import AdminSettings from "./pages/AdminSettings";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Redirect home page to Dashboard */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Authentication Pages */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Documents Listing Page */}
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />

        {/* Protected Upload Document Page */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadDocument />
            </ProtectedRoute>
          }
        />

        {/* Protected Individual Document Details Page */}
        <Route
          path="/documents/:docId"
          element={
            <ProtectedRoute>
              <DocumentDetails />
            </ProtectedRoute>
          }
        />

        {/* Protected Access Requests Inbox */}
        <Route
          path="/access-requests"
          element={
            <ProtectedRoute>
              <AccessRequests />
            </ProtectedRoute>
          }
        />

        {/* Protected Advanced Search Page */}
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <AdvancedSearch />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Settings Page */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        {/* Redirect Unknown Routes */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
