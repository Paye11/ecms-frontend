import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./AdminCourtSelector.css"; // Reuse same styling

export default function ChiefJusticeCourtSelector() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/courts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourts(res.data.map((court) => court.name));
    } catch (err) {
      toast.error("❌ Failed to load courts");
    }
  };

  const handleSelect = (courtName) => {
    localStorage.setItem("selectedCourt", courtName);
    navigate("/chief-justice/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("selectedCourt");
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
    <div className="court-dashboard">
      {/* Added logout button at top right */}
      <div className="logout-container d-flex justify-content-end">
        <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      <h2 className="text-white text-center mt-4">
        JUDICIARY BRANCH OF GOVERNMENT
      </h2>
      <h4 className="text-white text-center">
        TEMPLE OF JUSTICE - Monrovia, Liberia
      </h4>
      <h5 className="text-white text-center mt-3">OFFICE OF THE CHIEF JUSTICE</h5>

      <div className="title-box text-center">
        CIRCUIT COURTS REPORT DASHBOARD
      </div>

      <div className="court-buttons">
        {courts.map((court, i) => (
          <div key={i} className="d-flex justify-content-center court-row">
            <button className="court-btn" onClick={() => handleSelect(court)}>
              {court}
            </button>
          </div>
        ))}
      </div>
      
      <div className="text-center text-white mt-5 mb-3">
        <p>By Bill P. Alex<br />Version 3.0</p>
      </div>
    </div>
  );
}