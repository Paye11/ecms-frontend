import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // ✅ correct import

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" />;
  }

  try {
const decoded = jwtDecode(token);

    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.clear();
      return <Navigate to="/" />;
    }

    // Check if user role matches required role
    if (decoded.role !== allowedRole) {
      return <Navigate to="/" />;
    }

    return children;
  } catch (error) {
    return <Navigate to="/" />;
  }
}

export default ProtectedRoute;
