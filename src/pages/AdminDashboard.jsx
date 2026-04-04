import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from 'bootstrap/js/dist/modal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AdminDashboard.css';

function AdminDashboard() {
  const [page, setPage] = useState("home");
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Redirect if no court is selected
  useEffect(() => {
    const court = localStorage.getItem("selectedCourt");
    if (!court) {
      navigate("/admin/courts");
    } else {
      setSelectedCourt(court);
    }
  }, [navigate]);

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

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    if (page === 'view') fetchUsers();
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/auth/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert("Failed to delete user.");
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    const modalElement = document.getElementById('editUserModal');
    const modal = new Modal(modalElement);
    modal.show();
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`http://localhost:5000/api/auth/user/${editUser._id}`, {
        username: editUsername,
        password: editPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      document.getElementById('closeEditModal').click();
    } catch (err) {
      alert("Update failed.");
    }
  };

  const filteredUsers = users.filter(user =>
    (user.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <ToastContainer />
      {page === "home" && (
        <div className="admin-dashboard-wrapper">
          <div className="admin-box">
            <div className="logout-container d-flex justify-content-between">
              <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
                🚪 Logout
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                localStorage.removeItem("selectedCourt");
                navigate("/admin/courts");
              }}>
                🔁 Change Court
              </button>
            </div>

            <h1 className="admin-heading">Electronic Reporting System</h1>

            {selectedCourt && (
              <div className="text-center mb-3">
                <h5 className="text-primary">📍 {selectedCourt}</h5>
              </div>
            )}

            <div className="admin-buttons">
              <button className="admin-btn" onClick={() => setPage("create")}>
                ➕ Create User
              </button>
              <button className="admin-btn" onClick={() => setPage("view")}>
                👁 View Users
              </button>
              <button className="admin-btn" onClick={() => navigate("/admin/reports")}>
                📄 View Return to Assignment Reports
              </button>
<button className="admin-btn" onClick={() => navigate("/admin/jury-reports")}>
  🏛 Jury Reports
</button>
              <button className="admin-btn" onClick={() => navigate("/admin/magistrate-reports")}>
  📘 Magistrate Reports
</button>
<button className="admin-btn" onClick={() => navigate("/admin/criminal-dockets")}>
  ⚖️ Criminal Dockets
</button>
<button className="admin-btn" onClick={() => navigate("/admin/court-fees-reports")}>
  💰 Court Costs, Fines & Fees
</button>
<button className="admin-btn" onClick={() => navigate("/admin/civil-dockets")}>
  ⚖️ Civil Dockets
</button>

            </div>
             {/* Footer */}
        <div className="dashboard-footer">
          By: Bill P. Alex | Version 3.0
        </div>
            
          </div>
          
        </div>
      )}


      {page === "create" && (
        window.location.href = "/admin/create"
      )}

      {page === "view" && (
        <div className="container mt-5">
          <h1 className="text-primary mb-3">Manage Users</h1>
          <button className="btn btn-secondary mb-3" onClick={() => setPage("home")}>
            ← Back to Dashboard
          </button>

          <input
            type="text"
            placeholder="Search by username..."
            className="form-control mb-4"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Circuit Court</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">No users found</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                      <td>{user.circuitCourt || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-warning me-2" onClick={() => openEditModal(user)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user._id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Modal */}
          <div className="modal fade" id="editUserModal" tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit User</h5>
                  <button type="button" className="btn-close" id="closeEditModal" data-bs-dismiss="modal"></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label>Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label>New Password (optional)</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Leave blank to keep unchanged"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  <button type="button" className="btn btn-primary" onClick={handleUpdate}>Update User</button>
                </div>
              </div>
            </div>
            
          </div>
          
        </div>
      )}
    </>
  );
}

export default AdminDashboard;
