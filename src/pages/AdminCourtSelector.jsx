import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./AdminCourtSelector.css";

export default function AdminCourtSelector() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [newCourt, setNewCourt] = useState("");

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
    navigate("/admin/dashboard");
  };

  const handleAddCourt = async () => {
    if (!newCourt.trim()) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/courts",
        { name: newCourt.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewCourt("");
      fetchCourts();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addCourtModal")
      );
      modal.hide();
    } catch (err) {
      toast.error("❌ Failed to add court");
    }
  };

  const handleDeleteCourt = async (index) => {
    if (!window.confirm("Are you sure you want to delete this court?")) return;

    try {
      const token = localStorage.getItem("token");
      const courtToDelete = courts[index];

      // Fetch all courts to get the MongoDB ID
      const res = await axios.get("http://localhost:5000/api/courts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const target = res.data.find((c) => c.name === courtToDelete);

      if (!target) return toast.error("Court not found!");

      await axios.delete(`http://localhost:5000/api/courts/${target._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchCourts();
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
        {courts.map((court, i) => (
          <div
            key={i}
            className="d-flex justify-content-between align-items-center court-row"
          >
            <button className="court-btn" onClick={() => handleSelect(court)}>
              {court}
            </button>
            <button
              className="btn btn-sm btn-danger ms-2"
              onClick={() => handleDeleteCourt(i)}
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
                value={newCourt}
                onChange={(e) => setNewCourt(e.target.value)}
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