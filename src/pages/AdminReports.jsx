import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const token = localStorage.getItem("token");
  const selectedCourt = localStorage.getItem("selectedCourt");

  const fetchReports = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/returns/admin/all?court=${encodeURIComponent(selectedCourt)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Filter reports by selected court and ensure submittedBy exists
      const filtered = res.data.filter(report => 
        report.circuitCourt === selectedCourt && 
        report.submittedBy // Only include reports with a submitter
      );
      
      setReports(filtered);
    } catch (err) {
      console.error("Error loading reports:", err);
      toast.error("❌ Failed to load reports");
    }
  };

  useEffect(() => {
    if (selectedCourt) {
      fetchReports();
    }
  }, [selectedCourt]);

  const markAsViewed = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/returns/view/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("✅ Report approved");
      fetchReports();
    } catch (err) {
      toast.error("❌ Failed to approve report");
    }
  };

  const handleReject = (report) => {
    setSelectedReport(report);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/returns/admin/reject/${selectedReport._id}`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Report rejected");
      fetchReports();
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err) {
      toast.error("❌ Failed to reject report");
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const generateCombinedPDF = () => {
    const validReports = reports.filter(report => !report.rejected);
    if (validReports.length === 0) {
      toast.warning("No valid reports to download");
      return;
    }

    const doc = new jsPDF('landscape');
    let y = 20;

    validReports.forEach((report, index) => {
      // Header Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("JUDICIARY BRANCH OF GOVERNMENT", doc.internal.pageSize.width / 2, y, { align: "center" });
      y += 8;
      doc.text("“RETURNS TO ASSIGNMENT”", doc.internal.pageSize.width / 2, y, { align: "center" });

      // Report Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      y += 8;
      doc.text(`COURT: ${report.circuitCourt || '-'}`, 14, y);
      y += 8;
      doc.text(`TERM: ${report.term || '-'} ${report.year || ''}`, 14, y);
      y += 8;
      doc.text(`JUDGE: ${report.judgeName || '-'}`, 14, y);
      y += 8;
      doc.text(`CLERK: ${report.submittedBy?.username || '-'}`, 14, y);
      y += 8;
      doc.text(`STATUS: ${report.adminViewed ? 'APPROVED' : 'PENDING'}`, 14, y);

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text(`Report #${index + 1}`, 14, y);
      y += 6;

      const caseType = report.cases?.[0]?.caseType?.toUpperCase() || 'CASES';
      doc.setFont("helvetica", "bold");
      doc.text(`SUMMARY CASE REPORTING FOR ${caseType} CASES:`, doc.internal.pageSize.width / 2, y, { align: "center" });

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
        startY: y + 5,
        head: [[
          "No.",
          "Case Title",
          report.cases?.[0]?.caseType === "Civil" ? "Action" : "Crime",
          "Disposition",
          "Jury Panel / Ref#",
          "Fees / Receipt",
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
        }
      });

      y = doc.lastAutoTable.finalY + 15;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`Admin_Returns_Reports_${selectedCourt}.pdf`);
  };

  const generateSinglePDF = (report) => {
    const doc = new jsPDF('landscape');
    let y = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUDICIARY BRANCH OF GOVERNMENT", doc.internal.pageSize.width / 2, y, { align: "center" });
    y += 8;
    doc.text("“RETURNS TO ASSIGNMENT”", doc.internal.pageSize.width / 2, y, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    y += 8;
    doc.text(`COURT: ${report.circuitCourt || '-'}`, 14, y);
    y += 8;
    doc.text(`TERM: ${report.term || '-'} ${report.year || ''}`, 14, y);
    y += 8;
    doc.text(`JUDGE: ${report.judgeName || '-'}`, 14, y);
    y += 8;
    doc.text(`CLERK: ${report.submittedBy?.username || '-'}`, 14, y);
    y += 8;
    doc.text(`STATUS: ${report.adminViewed ? 'APPROVED' : 'PENDING'}`, 14, y);

    y += 10;
    const caseType = report.cases?.[0]?.caseType?.toUpperCase() || 'CASES';
    doc.setFont("helvetica", "bold");
    doc.text(`SUMMARY CASE REPORTING FOR ${caseType} CASES:`, doc.internal.pageSize.width / 2, y, { align: "center" });

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
      startY: y + 5,
      head: [[
        "No.",
        "Case Title",
        report.cases?.[0]?.caseType === "Civil" ? "Action" : "Crime",
        "Disposition",
        "Jury Panel / Ref#",
        "Fees / Receipt",
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
      }
    });

    doc.save(`Returns_Report_${report.term}_${report.year}.pdf`);
  };

  const renderStatus = (report) => {
    if (report.rejected) return <span className="text-danger">Rejected</span>;
    if (report.adminViewed) return <span className="text-success">Approved</span>;
    return <span className="text-warning">Pending</span>;
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">Returns to Assignment - {selectedCourt}</h2>
      
      <div className="text-end mb-3">
        <button className="btn btn-success me-2" onClick={generateCombinedPDF}>
          Download All as PDF
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead className="table-dark">
            <tr>
              <th>#</th>
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
            {reports.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center">No reports found</td>
              </tr>
            ) : (
              reports.map((report, index) => (
                <tr key={report._id}>
                  <td>{index + 1}</td>
                  <td>{report.term || 'N/A'}</td>
                  <td>{report.year || 'N/A'}</td>
                  <td>{report.circuitCourt || 'N/A'}</td>
                  <td>{report.judgeName || 'N/A'}</td>
                  <td>{report.submittedBy?.username || 'Unknown'}</td>
                  <td>{report.cases?.length || 0}</td>
                  <td>{renderStatus(report)}</td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleViewReport(report)}
                      >
                        View
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => generateSinglePDF(report)}
                      >
                        PDF
                      </button>
                      {!report.adminViewed && !report.rejected && (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => markAsViewed(report._id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(report)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Report Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Report Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div>
              <div className="row mb-3">
                <div className="col-md-4">
                  <strong>Term:</strong> {selectedReport.term}
                </div>
                <div className="col-md-4">
                  <strong>Year:</strong> {selectedReport.year}
                </div>
                <div className="col-md-4">
                  <strong>Court:</strong> {selectedReport.circuitCourt}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Judge:</strong> {selectedReport.judgeName}
                </div>
                <div className="col-md-6">
                  <strong>Clerk:</strong> {selectedReport.submittedBy?.username || 'Unknown'}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Status:</strong> {renderStatus(selectedReport)}
                </div>
                <div className="col-md-6">
                  <strong>Cases Count:</strong> {selectedReport.cases?.length || 0}
                </div>
              </div>
              {selectedReport.rejected && (
                <div className="alert alert-danger">
                  <strong>Rejection Reason:</strong> {selectedReport.rejectionReason}
                </div>
              )}

              <h5 className="mt-4">Cases ({selectedReport.cases?.length || 0})</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Case Title</th>
                      <th>Type</th>
                      <th>{selectedReport.cases?.[0]?.caseType === "Civil" ? "Action" : "Crime"}</th>
                      <th>Disposition</th>
                      <th>Jury Info</th>
                      <th>Fees/Receipt</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.cases || []).map((c, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{c.caseTitle || 'N/A'}</td>
                        <td>{c.caseType || 'N/A'}</td>
                        <td>{c.crimeOrAction || 'N/A'}</td>
                        <td>{c.disposition || 'N/A'}</td>
                        <td>{c.juryInfo || 'N/A'}</td>
                        <td>{c.costFineAmount || 'N/A'}</td>
                        <td>{c.remarks || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedReport.attachments?.length > 0 && (
                <div className="mt-4">
                  <h5>Attachments:</h5>
                  <ul className="list-group">
                    {selectedReport.attachments.map((file, index) => (
                      <li key={index} className="list-group-item">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          {file.originalname}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Reason for Rejection</label>
            <textarea
              className="form-control"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for rejection..."
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmReject}>
            Confirm Reject
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}