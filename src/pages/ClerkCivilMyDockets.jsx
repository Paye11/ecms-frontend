import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import 'jspdf-autotable';

export default function ClerkCivilMyDockets() {
  const [dockets, setDockets] = useState([]);
  const [filteredDockets, setFilteredDockets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchDockets = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/civil-dockets/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter by court and also exclude dockets marked as removed by clerk
      const filtered = res.data.filter(docket => 
        docket.court === user.circuitCourt && !docket.removedByClerk
      );
      setDockets(filtered);
      setFilteredDockets(filtered);
    } catch (err) {
      toast.error("❌ Failed to load dockets");
    }
  };

  useEffect(() => {
    fetchDockets();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDockets(dockets);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = dockets.filter(docket =>
        (docket.court && docket.court.toLowerCase().includes(term)) ||
        (docket.term && docket.term.toLowerCase().includes(term)) ||
        (docket.year && docket.year.toString().includes(term)) ||
        (docket.judgeName && docket.judgeName.toLowerCase().includes(term))
      );
      setFilteredDockets(filtered);
    }
  }, [searchTerm, dockets]);

  const handleDownloadPDF = (docket) => {
    const doc = new jsPDF();
    let y = 20;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    // Header Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
    y += 7;
    doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
    y += 7;
    doc.text(`${docket.court.toUpperCase()}`, 105, y, { align: "center" });
    y += 10;

    // Title
    doc.setFontSize(16);
    doc.text("CIVIL CASES DOCKET", 105, y, { align: "center" });
    y += 15;

    // Court Information
    doc.setFontSize(12);
    doc.text(`${docket.term.toUpperCase()} TERM, A.D.${docket.year}`, 105, y, { align: "center" });
    y += 7;
    doc.text(`BEFORE: ${docket.judgeName.toUpperCase()}`, 20, y);
    y += 7;
    doc.text(`CLERK'S OFFICE: ${docket.clerkName.toUpperCase()}`, 20, y);
    y += 15;

    // Prepare table data
    const caseTableData = docket.cases.map((c, index) => [
        index + 1,
        c.plaintiff,
        "VERSUS",
        c.defendant,
        c.action.toUpperCase(),
        formatDate(c.dateFiled)
    ]);

    // Cases Table
    doc.autoTable({
        startY: y,
        head: [
            ["NO.", "PLAINTIFF (S)", "", "DEFENDANT (S)", "ACTION (S)", "DATE FILED"]
        ],
        body: caseTableData,
        styles: {
            fontSize: 10,
            halign: 'center',
            valign: 'middle',
            cellPadding: 4,
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 35, halign: 'center' },
            4: { cellWidth: 40 },
            5: { cellWidth: 30 }
        },
        didDrawCell: (data) => {
            if (data.column.index === 2 && data.cell.section === 'head') {
                data.cell.text = "";
            }
        }
    });

    doc.save(`CivilDocket-${docket.term}-${docket.year}.pdf`);
  };

  const handleSubmitTo = async (id, recipient) => {
    try {
      await axios.patch(`http://localhost:5000/api/civil-dockets/submit/${id}`, 
        { recipient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Submitted to ${recipient}`);
      fetchDockets();
    } catch (err) {
      toast.error("Submission failed");
    }
  };

  const handleResubmit = async (id) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/civil-dockets/resubmit/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Docket ready for editing");
      fetchDockets();
    } catch (err) {
      toast.error("Failed to resubmit docket");
    }
  };

  const handleRemoveDocket = async (id) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/civil-dockets/remove/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Docket removed from your view");
      fetchDockets();
    } catch (err) {
      toast.error("Failed to remove docket");
    }
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">My Civil Dockets</h2>

      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by court, term, year, or judge..."
            className="form-control"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setSearchTerm("")}
            disabled={!searchTerm}
          >
            Clear
          </button>
        </div>
        {searchTerm && (
          <small className="text-muted">
            Showing {filteredDockets.length} of {dockets.length} dockets
          </small>
        )}
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead className="table-dark">
            <tr>
              <th>Term</th>
              <th>Year</th>
              <th>Court</th>
              <th>Judge</th>
              <th>Clerk</th>
              <th>Cases</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDockets.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">No dockets found</td>
              </tr>
            ) : (
              filteredDockets.map(docket => (
                <tr key={docket._id}>
                  <td>{docket.term}</td>
                  <td>{docket.year}</td>
                  <td>{docket.court}</td>
                  <td>{docket.judgeName}</td>
                  <td>{docket.clerkName}</td>
                  <td>{docket.cases.length}</td>
                  <td>
                    {docket.finalized && !docket.rejected && "Finalized"}
                    {docket.rejected && (
                      <span className="text-danger">
                        Rejected: {docket.rejectionReason}
                      </span>
                    )}
                    {docket.adminViewed && " (Approved by Admin)"}
                    {docket.chiefViewed && " (Approved by Chief)"}
                    {docket.submittedToAdmin && !docket.rejected && " (Submitted to Admin)"}
                    {docket.submittedToChief && !docket.rejected && " (Submitted to Chief)"}
                  </td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/clerk/civil-docket?id=${docket._id}`)}
                        disabled={docket.finalized && !docket.rejected}
                      >
                        {docket.rejected ? "Edit" : docket.finalized ? "View" : "Edit"}
                      </button>
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => handleDownloadPDF(docket)}
                      >
                        PDF
                      </button>
                      {docket.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResubmit(docket._id)}
                        >
                          Resubmit
                        </button>
                      )}
                      {docket.finalized && !docket.submittedToAdmin && !docket.rejected && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSubmitTo(docket._id, 'admin')}
                        >
                          Submit to Admin
                        </button>
                      )}
                      {docket.finalized && !docket.submittedToChief && !docket.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleSubmitTo(docket._id, 'chief')}
                        >
                          Submit to Chief
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveDocket(docket._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-end mt-3">
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/clerk/civil-docket')}
        >
          Create New Docket
        </button>
      </div>
    </div>
  );
}