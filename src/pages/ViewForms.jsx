import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

function ViewForms() {
  const [forms, setForms] = useState([]);
  const token = localStorage.getItem("token");

  const fetchForms = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/returns/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load reports");
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleSendToAdmin = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/returns/send/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Sent to Admin ✅");
      fetchForms();
    } catch (err) {
      toast.error("Failed to send ❌");
    }
  };

  const handleDownloadPDF = (report) => {
    const doc = new jsPDF();
    doc.text("Returns to Assignment Report", 14, 15);

    doc.autoTable({
      startY: 25,
      head: [["Field", "Value"]],
      body: [
        ["Case Type", report.caseType],
        ["Title", report.title],
        ["Crime", (report.crime || []).join(", ")],
        ["Disposition", report.disposition],
        ["Trial Type", report.trialType],
        ["Additional Options", (report.additionalOptions || []).join(", ")],
        ["Submitted To Admin", report.submittedToAdmin ? "Yes" : "No"],
        ["Circuit Court", report.circuitCourt || "-"],
      ],
    });

    doc.save(`ReturnReport-${report._id}.pdf`);
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center text-primary mb-4">My Submitted Reports</h2>

      {forms.length === 0 ? (
        <p className="text-center">No submissions found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>Title</th>
                <th>Case Type</th>
                <th>Trial Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((report) => (
                <tr key={report._id}>
                  <td>{report.title}</td>
                  <td>{report.caseType}</td>
                  <td>{report.trialType}</td>
                  <td>{report.submittedToAdmin ? "Sent to Admin" : "Draft"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => handleDownloadPDF(report)}
                    >
                      📥 PDF
                    </button>

                    {!report.submittedToAdmin && (
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() =>
                          toast.info("Edit functionality will open pre-filled form")
                        }
                      >
                        ✏️ Edit
                      </button>
                    )}

                    {!report.submittedToAdmin && (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleSendToAdmin(report._id)}
                      >
                        📤 Send to Admin
                      </button>
                    )}
                    {/* 👉 PLACE THIS BLOCK HERE: */}
  {!report.submittedToAdmin && (
    <button
      className="btn btn-sm btn-warning"
      onClick={() => handleSendToAdmin(report._id)}
    >
      📤 Send to Admin
    </button>
  )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ViewForms;
