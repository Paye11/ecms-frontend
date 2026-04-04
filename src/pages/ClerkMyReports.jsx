import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function ClerkMyReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/returns/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter(report =>
        report.circuitCourt === user.circuitCourt && !report.removedByClerk
      );
      setReports(filtered);
      setFilteredReports(filtered);
    } catch (err) {
      toast.error("❌ Failed to load reports");
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredReports(reports);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = reports.filter(report =>
        (report.term && report.term.toLowerCase().includes(term)) ||
        (report.circuitCourt && report.circuitCourt.toLowerCase().includes(term)) ||
        (report.year && report.year.toString().includes(term))
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

  const handleDownloadPDF = (report) => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUDICIARY BRANCH OF GOVERNMENT", doc.internal.pageSize.width / 2, 20, { align: "center" });
    doc.text("“RETURNS TO ASSIGNMENT”", doc.internal.pageSize.width / 2, 28, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`COURT: ${report.circuitCourt || '-'}`, 14, 36);
    doc.text(`TERM: ${report.term || '-'} ${report.year || ''}`, 14, 44);
    doc.text(`JUDGE: ${report.judgeName || '-'}`, 14, 52);
    doc.text(`CLERK: ${user.username || '-'}`, 14, 60);

    const caseType = report.cases?.[0]?.caseType?.toUpperCase() || 'CASES';
    const dynamicLabel = caseType === "CIVIL" ? "ACTION" : "CRIME";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`SUMMARY CASE REPORTING FOR ${caseType} CASES:`, doc.internal.pageSize.width / 2, 68, { align: "center" });

    const tableBody = report.cases.map((c, i) => {
      const juryParts = (c.juryInfo || '').split(',');
      const feeParts = (c.costFineAmount || '').split(',');

      const juryColumn = c.caseType === "Civil"
        ? `${juryParts[0] || 'NONE'} | ${juryParts[1] || 'NONE'}`
        : `${juryParts[0] || 'NONE'}`;

      return [
        i + 1,
        c.caseTitle || "-",
        c.crimeOrAction || "-",
        c.disposition || "-",
        juryColumn,
        feeParts.join(' ') || '-',
        c.remarks || "-"
      ];
    });

    doc.autoTable({
      startY: 74,
      head: [[
        "No.",
        "Case Title",
        dynamicLabel,
        "Disposition",
        "Jury Panel / Grand Jury / Petit Jury / Ref#",
        "Costs/Fees/Fines/ Amount and Receipt#",
        "Remarks"
      ]],
      body: tableBody,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      headStyles: {
        fillColor: [30, 80, 200],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 50 },
        5: { halign: 'center', cellWidth: 40 },
        6: { halign: 'center', cellWidth: 50 }
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'wrap'
    });

    doc.save(`ReturnsReport-${report.term}-${report.year}.pdf`);
  };

  const handleEdit = (id) => {
    navigate(`/clerk/returns?id=${id}`);
  };

  const handleSubmitTo = async (id, recipient) => {
    try {
      await axios.patch(`http://localhost:5000/api/returns/submit/${id}`,
        { recipient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`📤 Submitted to ${recipient === 'admin' ? 'Admin' : 'Chief Justice'}`);
      fetchReports();
    } catch (err) {
      toast.error("❌ Submission failed");
    }
  };

  const handleResubmit = async (id) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/returns/resubmit/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Report ready for editing");
      fetchReports();
    } catch (err) {
      toast.error("❌ Failed to resubmit report");
    }
  };

  const handleRemoveReport = async (id) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/returns/remove/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("🗑️ Report removed from your view");
      fetchReports();
    } catch (err) {
      toast.error("❌ Failed to remove report");
    }
  };

  const showRejectionDetails = (report) => {
    setSelectedReport(report);
    setShowRejectionModal(true);
  };

  const renderStatus = (r) => {
    if (r.rejected) return (
      <span className="text-danger" onClick={() => showRejectionDetails(r)} style={{cursor: 'pointer'}}>
        Rejected ❌
      </span>
    );
    if (r.adminViewed && r.chiefViewed) return "Approved by Both ✅";
    if (r.adminViewed) return "Approved by Admin ✅";
    if (r.chiefViewed) return "Approved by Chief ✅";
    if (r.submittedToAdmin && r.submittedToChief) return "Submitted to Both 📤";
    if (r.submittedToAdmin) return "Submitted to Admin 📤";
    if (r.submittedToChief) return "Submitted to Chief 📤";
    if (r.finalized) return "Finalized 🔒";
    return "Draft 📝";
  };

  return (
    <div className="container mt-5">
      <ToastContainer />
      <h2 className="text-center text-primary mb-4">📋 My Submitted Reports</h2>

      <div className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search by term, court name, or year..."
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
            Showing {filteredReports.length} of {reports.length} reports
          </small>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <p className="text-center">
          {searchTerm ? "No matching reports found" : "No reports submitted yet."}
        </p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>Term</th>
                <th>Year</th>
                <th>Judge</th>
                <th>Cases Count</th>
                <th>Court</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r) => (
                <tr key={r._id}>
                  <td>{r.term || "-"}</td>
                  <td>{r.year || "-"}</td>
                  <td>{r.judgeName || "-"}</td>
                  <td>{r.cases?.length || 0}</td>
                  <td>{r.circuitCourt || "-"}</td>
                  <td>{renderStatus(r)}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(r._id)}
                        disabled={r.finalized && !r.rejected}
                      >
                        {r.rejected ? "Edit" : r.finalized ? "View" : "Edit"}
                      </button>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleDownloadPDF(r)}
                      >
                        📄 PDF
                      </button>
                      {r.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResubmit(r._id)}
                        >
                          Resubmit
                        </button>
                      )}
                      {r.finalized && !r.submittedToAdmin && !r.rejected && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSubmitTo(r._id, 'admin')}
                        >
                          Submit to Admin
                        </button>
                      )}
                      {r.finalized && !r.submittedToChief && !r.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleSubmitTo(r._id, 'chief')}
                        >
                          Submit to Chief
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveReport(r._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-end mt-3">
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/clerk/returns')}
        >
          Create New Report
        </button>
      </div>

      {/* Rejection Details Modal */}
      <Modal show={showRejectionModal} onHide={() => setShowRejectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rejection Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <p><strong>Term:</strong> {selectedReport.term} {selectedReport.year}</p>
              <p><strong>Court:</strong> {selectedReport.circuitCourt}</p>
              <p><strong>Judge:</strong> {selectedReport.judgeName}</p>
              <div className="alert alert-danger">
                <strong>Rejection Reason:</strong> {selectedReport.rejectionReason}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectionModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}