import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons';
import 'react-toastify/dist/ReactToastify.css';
import './Login.css';
import logo1 from '../assets/logo1.png';
import logo2 from '../assets/logo2.png';
import watermark from '../assets/watermark.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("Login Successful 🎉");

      const role = res.data.user.role;
      setTimeout(() => {
        if (role === "Court Admin") navigate('/admin/courts');
        else if (role === "Circuit Clerk") navigate("/clerk");
        else if (role === "Chief Justice") navigate('/chief-justice/courts');
      }, 1500);

    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="login-box">
        {/* Watermark covering entire form */}
        <div className="form-watermark">
          <img src={watermark} alt="Watermark" />
        </div>

        <div className="header-bar">
          <img src={logo1} alt="Logo 1" className="logo-side" />
          <h1 className="main-heading">Electronic Reporting System</h1>
          <img src={logo2} alt="Logo 2" className="logo-side" />
        </div>

        <h2 className="login-title">Login to Your Account</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">
              <FontAwesomeIcon icon={faUser} className="input-icon" /> 
              Username
            </label>
            <div className="password-input-container">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="login-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">
              <FontAwesomeIcon icon={faLock} className="input-icon" />
              Password
            </label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="login-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-indicator">
                <span className="spinner"></span>
                Logging in...
              </span>
            ) : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>By: <span className="footer-author">Bill P. Alex</span></p>
          <p>Version <span className="footer-version">3.0</span></p>
        </div>
      </div>
    </div>
  );
}

export default Login;