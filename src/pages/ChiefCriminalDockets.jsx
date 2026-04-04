import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function ChiefCriminalDockets() {
  const [dockets, setDockets] = useState([]);
  const [rejectModal, setRejectModal] = useState({
    show: false,
    docketId: null,
    reason: ''
  });
  const [viewModal, setViewModal] = useState({
    show: false,
    docket: null
  });
  const token = localStorage.getItem("token");
  const selectedCourt = localStorage.getItem("selectedCourt");
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedCourt) {
      toast.error("Please select a court");
      navigate("/chief/courts");
      return;
    }
    fetchDockets();
  }, [selectedCourt]);

  const fetchDockets = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/criminal-dockets/chief/all?court=${encodeURIComponent(selectedCourt)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDockets(res.data);
    } catch (err) {
      toast.error("Failed to load dockets");
    }
  };

  const markAsViewed = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/criminal-dockets/chief/view/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Docket approved");
      fetchDockets();
    } catch (err) {
      toast.error("Failed to approve docket");
    }
  };

  const handleReject = (id) => {
    setRejectModal({
      show: true,
      docketId: id,
      reason: ''
    });
  };

  const confirmReject = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/criminal-dockets/chief/reject/${rejectModal.docketId}`,
        { reason: rejectModal.reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Docket rejected");
      fetchDockets();
    } catch (err) {
      toast.error("Failed to reject docket");
    } finally {
      setRejectModal({ show: false, docketId: null, reason: '' });
    }
  };

  const handleViewDocket = (docket) => {
    setViewModal({
      show: true,
      docket
    });
  };

// Date formatting function (using the same one from civil dockets)
const formatDate = (date) => {
  try {
    // If date is already a Date object or can be converted to one
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    const day = dateObj.getDate();
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    console.error("Date formatting error:", e);
    return 'N/A';
  }
};

const generateCombinedPDF = () => {
  const validDockets = dockets.filter(docket => !docket.rejected);
  if (validDockets.length === 0) {
    toast.warning("No valid dockets to download");
    return;
  }

  const doc = new jsPDF();
  let y = 20;

  validDockets.forEach((docket, index) => {
    // Header Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
    y += 7;
    doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
    y += 7;
    doc.text(`${(docket.court || '').toUpperCase()}`, 105, y, { align: "center" });
    y += 10;

    // Title
    doc.setFontSize(16);
    doc.text("CRIMINAL CASES DOCKET", 105, y, { align: "center" });
    y += 15;

    // Court Information
    doc.setFontSize(12);
    doc.text(`${(docket.term || '').toUpperCase()} TERM, A.D.${docket.year || ''}`, 105, y, { align: "center" });
    y += 7;
    doc.text(`BEFORE: ${(docket.judgeName || '').toUpperCase()}`, 20, y);
    y += 7;
    doc.text(`CLERK'S OFFICE: ${(docket.clerkName || '').toUpperCase()}`, 20, y);
    y += 15;

    // Prepare table data
    const caseTableData = (docket.cases || []).map((c, i) => [
      i + 1,
      c.plaintiff || 'N/A',
      "VERSUS",
      c.defendant || 'N/A',
      (c.crime || 'N/A').toUpperCase(),
      formatDate(c.dateFiled)
    ]);

    // Cases Table
    doc.autoTable({
      startY: y,
      head: [["NO.", "PLAINTIFF (S)", "", "DEFENDANT (S)", "CRIME (S)", "DATE FILED"]],
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

    y = doc.lastAutoTable.finalY + 15;

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Docket #${index + 1} - Submitted by: ${docket.submittedBy?.username || 'Unknown'}`, 20, y);
    y += 10;

    // Add separator if not last report
    if (index < validDockets.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);
      y += 20;
    }

    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`Chief_Criminal_Dockets_${selectedCourt}.pdf`);
};

const generateSinglePDF = (docket) => {
  const doc = new jsPDF();
  let y = 20;

  // Header Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
  y += 7;
  doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
  y += 7;
  doc.text(`${(docket.court || '').toUpperCase()}`, 105, y, { align: "center" });
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.text("CRIMINAL CASES DOCKET", 105, y, { align: "center" });
  y += 15;

  // Court Information
  doc.setFontSize(12);
  doc.text(`${(docket.term || '').toUpperCase()} TERM, A.D.${docket.year || ''}`, 105, y, { align: "center" });
  y += 7;
  doc.text(`BEFORE: ${(docket.judgeName || '').toUpperCase()}`, 20, y);
  y += 7;
  doc.text(`CLERK'S OFFICE: ${(docket.clerkName || '').toUpperCase()}`, 20, y);
  y += 15;

  // Prepare table data
  const caseTableData = (docket.cases || []).map((c, i) => [
    i + 1,
    c.plaintiff || 'N/A',
    "VERSUS",
    c.defendant || 'N/A',
    (c.crime || 'N/A').toUpperCase(),
    formatDate(c.dateFiled)
  ]);

  // Cases Table
  doc.autoTable({
    startY: y,
    head: [["NO.", "PLAINTIFF (S)", "", "DEFENDANT (S)", "CRIME (S)", "DATE FILED"]],
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

  y = doc.lastAutoTable.finalY + 15;

  // Footer
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Submitted by: ${docket.submittedBy?.username || 'Unknown'}`, 20, y);

  doc.save(`Chief_CriminalDocket_${docket.term || ''}_${docket.year || ''}.pdf`);
};

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">Chief Justice Criminal Dockets - {selectedCourt}</h2>
      
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
              <th>Submitted By</th>
              <th>Cases</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dockets.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center">No dockets found</td>
              </tr>
            ) : (
              dockets.map((docket, index) => (
                <tr key={docket._id}>
                  <td>{index + 1}</td>
                  <td>{docket.term}</td>
                  <td>{docket.year}</td>
                  <td>{docket.court}</td>
                  <td>{docket.judgeName}</td>
                  <td>{docket.clerkName}</td>
                  <td>{docket.submittedBy?.username || 'Unknown'}</td>
                  <td>{docket.cases.length}</td>
                  <td>
                    {docket.rejected ? (
                      <span className="text-danger">Rejected</span>
                    ) : docket.chiefViewed ? (
                      <span className="text-success">Approved</span>
                    ) : (
                      <span className="text-warning">Pending</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleViewDocket(docket)}
                      >
                        View
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => generateSinglePDF(docket)}
                      >
                        PDF
                      </button>
                      {!docket.chiefViewed && !docket.rejected && (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => markAsViewed(docket._id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(docket._id)}
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
      <Modal show={rejectModal.show} onHide={() => setRejectModal({ show: false, docketId: null, reason: '' })}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Docket</Modal.Title>
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
          <Button variant="secondary" onClick={() => setRejectModal({ show: false, docketId: null, reason: '' })}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmReject}>
            Confirm Reject
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Docket Modal */}
      <Modal show={viewModal.show} onHide={() => setViewModal({ show: false, docket: null })} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Docket Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewModal.docket && (
            <div>
              <div className="row mb-3">
                <div className="col-md-4">
                  <strong>Term:</strong> {viewModal.docket.term}
                </div>
                <div className="col-md-4">
                  <strong>Year:</strong> {viewModal.docket.year}
                </div>
                <div className="col-md-4">
                  <strong>Court:</strong> {viewModal.docket.court}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Judge:</strong> {viewModal.docket.judgeName}
                </div>
                <div className="col-md-6">
                  <strong>Clerk:</strong> {viewModal.docket.clerkName}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Submitted By:</strong> {viewModal.docket.submittedBy?.username || 'Unknown'}
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong> {viewModal.docket.rejected ? (
                    <span className="text-danger">Rejected</span>
                  ) : viewModal.docket.chiefViewed ? (
                    <span className="text-success">Approved</span>
                  ) : (
                    <span className="text-warning">Pending</span>
                  )}
                </div>
              </div>
              {viewModal.docket.rejectionReason && (
                <div className="alert alert-danger">
                  <strong>Rejection Reason:</strong> {viewModal.docket.rejectionReason}
                </div>
              )}

              <h5 className="mt-4">Cases ({viewModal.docket.cases.length})</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Plaintiff</th>
                      <th>Defendant</th>
                      <th>Crime</th>
                      <th>Date Filed</th>
                      <th>Amount Deposited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewModal.docket.cases.map((c, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{c.plaintiff}</td>
                        <td>{c.defendant}</td>
                        <td>{c.crime}</td>
                        <td>{new Date(c.dateFiled).toLocaleDateString()}</td>
                        <td>${parseFloat(c.amountDeposited).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
{viewModal.docket.attachments?.length > 0 && (
      <div className="mt-4">
        <h5>Attachments:</h5>
        <ul className="list-group">
          {viewModal.docket.attachments.map((file, index) => (
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
          <Button variant="secondary" onClick={() => setViewModal({ show: false, docket: null })}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}