import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./AdminCourtSelector.css";

export default function AdminCourtSelector() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtLocation, setNewCourtLocation] = useState("");
  const [newCourtPassword, setNewCourtPassword] = useState("");

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/courts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourts(res.data);
    } catch (err) {
      console.error("Failed to load courts:", err);
      toast.error("❌ Failed to load courts");
    }
  };

  const handleSelect = (court) => {
    localStorage.setItem("selectedCourt", court.name);
    navigate("/admin/dashboard");
  };

  const handleAddCourt = async () => {
    const name = newCourtName.trim();
    const location = newCourtLocation.trim();
    const password = newCourtPassword;
    if (!name || !location || !password) {
      toast.warn("Please fill all fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/courts",
        { name, location, password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNewCourtName("");
      setNewCourtLocation("");
      setNewCourtPassword("");
      
      // Force immediate data refresh
      await fetchCourts();

      // Close modal safely
      const modalElement = document.getElementById("addCourtModal");
      if (modalElement) {
        const bootstrapModal = window.bootstrap?.Modal?.getInstance(modalElement) 
          || new window.bootstrap.Modal(modalElement);
        bootstrapModal?.hide();
      }

      toast.success("✅ Court added successfully");
    } catch (err) {
      console.error("Add court error:", err);
      toast.error(err.response?.data?.error || "❌ Failed to add court");
    }
  };

  const handleDeleteCourt = async (courtId) => {
    if (!window.confirm("Are you sure you want to delete this court?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/courts/${courtId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchCourts();
      toast.success("Court deleted");
    } catch (err) {
      toast.error("❌ Failed to delete court");
    }
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
      <h5 className="text-white text-center mt-3">
        OFFICE OF THE COURT ADMINISTRATOR
      </h5>

      <div className="title-box text-center">
        CIRCUIT COURTS REPORT DASHBOARD
      </div>

      <div className="court-buttons">
        {courts.map((court) => (
          <div
            key={court._id}
            className="d-flex justify-content-between align-items-center court-row"
          >
            <button className="court-btn" onClick={() => handleSelect(court)}>
              {court.name}
            </button>
            <button
              className="btn btn-sm btn-danger ms-2"
              onClick={() => handleDeleteCourt(court._id)}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-4">
        <button
          className="btn btn-warning"
          data-bs-toggle="modal"
          data-bs-target="#addCourtModal"
        >
          ➕ Add More Courts
        </button>
      </div>

      {/* Modal */}
      <div
        className="modal fade"
        id="addCourtModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Court</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="form-control"
                placeholder="Enter new court name"
                value={newCourtName}
                onChange={(e) => setNewCourtName(e.target.value)}
              />
              <input
                type="text"
                className="form-control mt-3"
                placeholder="Enter court location"
                value={newCourtLocation}
                onChange={(e) => setNewCourtLocation(e.target.value)}
              />
              <input
                type="password"
                className="form-control mt-3"
                placeholder="Set court password"
                value={newCourtPassword}
                onChange={(e) => setNewCourtPassword(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddCourt}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-white mt-5 mb-3">
        <p>By Bill P. Alex<br />Version 3.0</p>
      </div>
    </div>
  );
}
