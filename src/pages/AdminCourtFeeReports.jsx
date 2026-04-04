import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function AdminCourtFeeReports() {
  const [reports, setReports] = useState([]);
  const [rejectModal, setRejectModal] = useState({
    show: false,
    reportId: null,
    reason: ''
  });
  const [viewModal, setViewModal] = useState({
    show: false,
    report: null
  });
  const token = localStorage.getItem("token");
  const selectedCourt = localStorage.getItem("selectedCourt");
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedCourt) {
      toast.error("Please select a court");
      navigate("/admin/courts");
      return;
    }
    fetchReports();
  }, [selectedCourt]);

  const fetchReports = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/court-fees/admin/all?court=${encodeURIComponent(selectedCourt)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReports(res.data);
    } catch (err) {
      toast.error("Failed to load reports");
    }
  };

  const markAsViewed = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/court-fees/admin/view/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Report approved");
      fetchReports();
    } catch (err) {
      toast.error("Failed to approve report");
    }
  };

  const handleReject = (id) => {
    setRejectModal({
      show: true,
      reportId: id,
      reason: ''
    });
  };

  const confirmReject = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/court-fees/admin/reject/${rejectModal.reportId}`,
        { reason: rejectModal.reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Report rejected");
      fetchReports();
    } catch (err) {
      toast.error("Failed to reject report");
    } finally {
      setRejectModal({ show: false, reportId: null, reason: '' });
    }
  };

  const handleViewReport = (report) => {
    setViewModal({
      show: true,
      report
    });
  };

  const formatDate = (date) => {
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const generateCombinedPDF = () => {
  const validReports = reports.filter(report => !report.rejected);
  if (validReports.length === 0) {
    toast.warning("No valid reports to download");
    return;
  }

  const doc = new jsPDF();
  let y = 20;

  validReports.forEach((report, index) => {
    // Header section for each report
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
    y += 7;
    doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
    y += 7;
    doc.text("REPORT ON COURT'S COSTS, FEES AND FINES", 105, y, { align: "center" });
    y += 15;

    // Court and term info
    doc.setFontSize(12);
    doc.text(`COURT: ${report.court.toUpperCase()}`, 20, y);
    y += 7;
    doc.text(`TERM: ${report.term} A.D. ${report.year}`, 20, y);
    y += 10;

    // Prepare table data with formatted dates
    const tableData = report.entries.map((entry, i) => [
      i + 1,
      entry.payeeName,
      entry.type,
      `US$${parseFloat(entry.amount).toFixed(2)}`,
      entry.bankName,
      entry.receiptNumber,
      formatDate(new Date(entry.date))
    ]);

    // Calculate total amount
    const totalAmount = report.entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Generate table with footer
    doc.autoTable({
      startY: y,
      head: [
        [
          "NO.",
          "NAME",
          "DESCRIPTION",
          "AMOUNT",
          "BANK",
          "RECEIPT #",
          "DATE"
        ]
      ],
      body: tableData,
      foot: [
        [
          '',
          { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          { content: `US$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          '',
          ''
        ]
      ],
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
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 }
      },
      didParseCell: (data) => {
        if (data.column.index === 3) { // Amount column
          data.cell.styles.halign = 'right';
        }
        if (data.section === 'foot' && data.column.index === 1) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Footer info for each report
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Report #${index + 1} - Submitted by: ${report.submittedBy?.username || 'Unknown'}`, 20, y);
    y += 10;

    // Add separator if not last report
    if (index < validReports.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);
      y += 20;
    }

    // Add new page if needed
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`All_Court_Fees_Reports_${selectedCourt}.pdf`);
};

const generateSinglePDF = (report) => {
  const doc = new jsPDF();
  let y = 20;

  // Header section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
  y += 7;
  doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
  y += 7;
  doc.text("REPORT ON COURT'S COSTS, FEES AND FINES", 105, y, { align: "center" });
  y += 15;

  // Court and term info
  doc.setFontSize(12);
  doc.text(`COURT: ${report.court.toUpperCase()}`, 20, y);
  y += 7;
  doc.text(`TERM: ${report.term} A.D. ${report.year}`, 20, y);
  y += 10;

  // Prepare table data with formatted dates
  const tableData = report.entries.map((entry, i) => [
    i + 1,
    entry.payeeName,
    entry.type,
    `US$${parseFloat(entry.amount).toFixed(2)}`,
    entry.bankName,
    entry.receiptNumber,
    formatDate(new Date(entry.date))
  ]);

  // Calculate total amount
  const totalAmount = report.entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Generate table with footer
  doc.autoTable({
    startY: y,
    head: [
      [
        "NO.",
        "NAME",
        "DESCRIPTION",
        "AMOUNT",
        "BANK",
        "RECEIPT #",
        "DATE"
      ]
    ],
    body: tableData,
    foot: [
      [
        '',
        { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        { content: `US$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        '',
        ''
      ]
    ],
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
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.column.index === 3) { // Amount column
        data.cell.styles.halign = 'right';
      }
      if (data.section === 'foot' && data.column.index === 1) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // Footer info
  y = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Submitted by: ${report.submittedBy?.username || 'Unknown'}`, 20, y);

  doc.save(`Court_Fees_Report_${report.term}_${report.year}.pdf`);
};

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">Court Fees Reports - {selectedCourt}</h2>
      
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
              <th>Submitted By</th>
              <th>Entries</th>
              <th>Status</th>
              <th>Action</th>
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
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{report.court}</td>
                  <td>{report.judgeName}</td>
                  <td>{report.submittedBy?.username || 'Unknown'}</td>
                  <td>{report.entries.length}</td>
                  <td>
                    {report.rejected ? (
                      <span className="text-danger">Rejected</span>
                    ) : report.adminViewed ? (
                      <span className="text-success">Approved</span>
                    ) : (
                      <span className="text-warning">Pending</span>
                    )}
                  </td>
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
                            onClick={() => handleReject(report._id)}
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

      {/* Reject Modal */}
      <Modal show={rejectModal.show} onHide={() => setRejectModal({ show: false, reportId: null, reason: '' })}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Reason for Rejection</label>
            <textarea
              className="form-control"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              placeholder="Enter reason for rejection..."
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRejectModal({ show: false, reportId: null, reason: '' })}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmReject}>
            Confirm Reject
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Report Modal */}
      <Modal show={viewModal.show} onHide={() => setViewModal({ show: false, report: null })} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Report Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewModal.report && (
            <div>
              <div className="row mb-3">
                <div className="col-md-4">
                  <strong>Term:</strong> {viewModal.report.term}
                </div>
                <div className="col-md-4">
                  <strong>Year:</strong> {viewModal.report.year}
                </div>
                <div className="col-md-4">
                  <strong>Court:</strong> {viewModal.report.court}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Judge:</strong> {viewModal.report.judgeName}
                </div>
                <div className="col-md-6">
                  <strong>Submitted By:</strong> {viewModal.report.submittedBy?.username || 'Unknown'}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Status:</strong> {viewModal.report.rejected ? (
                    <span className="text-danger">Rejected</span>
                  ) : viewModal.report.adminViewed ? (
                    <span className="text-success">Approved</span>
                  ) : (
                    <span className="text-warning">Pending</span>
                  )}
                </div>
              </div>
              {viewModal.report.rejectionReason && (
                <div className="alert alert-danger">
                  <strong>Rejection Reason:</strong> {viewModal.report.rejectionReason}
                </div>
              )}

              <h5 className="mt-4">Entries ({viewModal.report.entries.length})</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Payee Name</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Bank</th>
                      <th>Receipt #</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewModal.report.entries.map((entry, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{entry.payeeName}</td>
                        <td>{entry.type}</td>
                        <td>US${parseFloat(entry.amount).toFixed(2)}</td>
                        <td>{entry.bankName}</td>
                        <td>{entry.receiptNumber}</td>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


{viewModal.report?.attachments?.length > 0 && (
  <div className="mt-4">
    <h5>Attachments:</h5>
    <ul className="list-group">
      {viewModal.report.attachments.map((file, index) => (
        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
          <a 
            href={file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
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
          <Button variant="secondary" onClick={() => setViewModal({ show: false, report: null })}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}