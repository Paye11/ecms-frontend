import { useState, useEffect } from "react"; // Add this import
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AdminDashboard.css';

function ChiefJusticeDashboard() {
  const [selectedCourt, setSelectedCourt] = useState('');
  const navigate = useNavigate();

  // Check if court is selected on component mount
  useEffect(() => {
    const court = localStorage.getItem("selectedCourt");
    if (!court) {
      navigate("/chief-justice/courts");
    } else {
      setSelectedCourt(court);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("selectedCourt");
    toast.success("You have been logged out");
    setTimeout(() => navigate("/"), 2000);
  };

  return (
    <div className="admin-dashboard-wrapper">
      <ToastContainer />
      <div className="admin-box">
        <div className="logout-container d-flex justify-content-between">
          <button 
            className="btn btn-sm btn-outline-danger"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              localStorage.removeItem("selectedCourt");
              navigate("/chief-justice/courts");
            }}
          >
            🔁 Change Court
          </button>
        </div>

        <h1 className="admin-heading">Chief Justice Dashboard</h1>
        
        {selectedCourt && (
          <div className="text-center mb-4">
            <h4>Currently Viewing Reports For:</h4>
            <h3 className="text-primary">📍 {selectedCourt}</h3>
          </div>
        )}

        <div className="admin-buttons">
          <button 
            className="admin-btn"
            onClick={() => navigate("/chief-justice/reports")}
          >
            📄 Return to Assignment Reports
          </button>
          <button 
  className="admin-btn"
  onClick={() => navigate("/chief-justice/jury-reports")}
>
  🏛 Jury Reports
</button>
          <button 
  className="admin-btn"
  onClick={() => navigate("/chief-justice/magistrate-reports")}
>
  📘 View Magistrate Reports
</button>
<button 
  className="admin-btn"
  onClick={() => navigate("/chief-justice/criminal-dockets")}
>
  ⚖️ Criminal Dockets
</button>

<button 
  className="admin-btn"
  onClick={() => navigate("/chief-justice/court-fees-reports")}
>
  💰 Court Costs, Fines & Fees
</button>
<button 
  className="admin-btn"
  onClick={() => navigate("/chief-justice/civil-dockets")}
>
  ⚖️ Civil Dockets
</button>
        </div>
         {/* Footer */}
        <div className="dashboard-footer">
          By: Bill P. Alex | Version 3.0
        </div>
      </div>
    </div>
  );
}

export default ChiefJusticeDashboard;