import './ClerkDashboard.css';
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

function ClerkDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const circuitCourt = user?.circuitCourt || "Circuit Court";
  const courtLocation = "Sanniquellie City, Nimba County – Liberia";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    toast.success("You have been logged out", {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
    });

    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  return (
    <div className="clerk-dashboard-wrapper">
      <div className="dashboard-box">
        {/* Logout button */}
        <div className="logout-container d-flex justify-content-end">
          <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        {/* Court Info */}
        <h2 className="court-title">{circuitCourt}</h2>
        <p className="court-subtitle">{courtLocation}</p>
        <h3 className="ecms-title">ELECTRONIC REPORTING SYSTEM</h3>

        {/* Dashboard Label */}
        <div className="dashboard-heading">JUDGE DASHBOARD</div>

        {/* Buttons */}
        <div className="button-grid">
          <button className="dash-btn" onClick={() => navigate("/clerk/returns")}>
            Returns to Assignment
          </button>
          <button className="dash-btn" onClick={() => navigate("/clerk/jury")}>
            Jury Payroll
          </button>
          <button className="dash-btn" onClick={() => navigate("/clerk/magistrate")}>
            Magistrates Quarterly Report
          </button>
          <button className="dash-btn" onClick={() => navigate('/clerk/court-fees')}>
            Court's Cost, Fine and Fees
          </button>
          <button className="dash-btn" onClick={() => navigate("/clerk/criminal-docket")}>
            Criminal Docket
          </button>
          <button className="dash-btn" onClick={() => navigate("/clerk/civil-docket")}>
            Civil Docket
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

export default ClerkDashboard;