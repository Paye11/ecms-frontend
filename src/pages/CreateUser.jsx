import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function CreateUser() {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Circuit Clerk');
  const [court, setCourt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [availableCourts, setAvailableCourts] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/courts", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAvailableCourts(res.data); // backend courts will be an array of objects
      } catch (err) {
        toast.error("❌ Failed to load courts");
      }
    };

    fetchCourts();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/create', {
        username,
        role,
        circuitCourt: role === 'Circuit Clerk' ? court : null
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(`✅ User created!\nUsername: ${res.data.username}\nPassword: ${res.data.password}`);

      setTimeout(() => {
        navigate("/admin"); // redirect after success
      }, 2000);

    } catch (err) {
      toast.error(err.response?.data?.msg || "❌ Error creating user");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mt-5">
      <ToastContainer position="top-center" autoClose={3000} />
      <h2 className="mb-4 text-primary">Create New User</h2>

      <form onSubmit={handleSubmit} className="p-4 border rounded shadow bg-white" style={{ maxWidth: "500px" }}>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter a username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Role</label>
          <select 
            className="form-select" 
            value={role} 
            onChange={e => setRole(e.target.value)}
            required
          >
            <option value="Circuit Clerk">Circuit Clerk</option>
            <option value="Chief Justice">Chief Justice</option>
          </select>
        </div>

        {role === "Circuit Clerk" && (
          <div className="mb-3">
            <label className="form-label">Circuit Court</label>
            <select
              className="form-select"
              value={court}
              onChange={e => setCourt(e.target.value)}
              required
            >
              <option value="">Select a Circuit Court</option>
              {availableCourts.map((courtItem, index) => (
                <option key={index} value={courtItem.name}>
                  {courtItem.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="btn btn-success w-100" 
          type="submit"
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
}

export default CreateUser;
