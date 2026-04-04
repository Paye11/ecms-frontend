import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function ChiefJuryReports() {
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
      navigate("/chief/courts");
      return;
    }
    fetchReports();
  }, [selectedCourt]);

  const fetchReports = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/jury-reports/chief/all?court=${encodeURIComponent(selectedCourt)}`,
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
      await axios.patch(`http://localhost:5000/api/jury-reports/chief/view/${id}`, {}, {
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
        `http://localhost:5000/api/jury-reports/chief/reject/${rejectModal.reportId}`,
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
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
      // Header section with dynamic court name
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
      y += 7;
      doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
      y += 7;
      doc.text(selectedCourt.toUpperCase(), 105, y, { align: "center" });
      y += 7;
      doc.text("NIMBA COUNTY", 105, y, { align: "center" });
      y += 7;
      
      if (report.juryType === 'Grand Jury') {
        doc.text(`${report.juryType.toUpperCase()} ATTENDANCE RECORD & PAYROLL`, 105, y, { align: "center" });
        y += 7;
        doc.text(`TERM OF COURT: ${report.term} TERM, A.D.${report.year}`, 105, y, { align: "center" });
        y += 7;
        doc.text(`BEFORE HIS HONOR: ${report.judgeName.toUpperCase()}`, 105, y, { align: "center" });
        y += 15;

        if (report.cases.length > 0) {
          const jurors = report.cases[0].jurors;
          const tableData = jurors.map((juror, jurorIndex) => [
            jurorIndex + 1,
            juror.jurorId,
            juror.jurorName,
            juror.contactNo,
            `${juror.daysAttended} days`,
            `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
            `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
          ]);

          const totalAmount = jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);

          doc.autoTable({
            startY: y,
            head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
            body: tableData,
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
              fontStyle: 'bold' 
            },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: 25 },
              2: { cellWidth: 40 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 25 },
              6: { cellWidth: 25 }
            },
            didParseCell: (data) => {
              if (data.column.index >= 5) {
                data.cell.styles.halign = 'right';
              }
            }
          });

          y = doc.lastAutoTable.finalY + 10;
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`TOTAL: US$${totalAmount.toFixed(2)}`, 160, y, { align: "right" });
        }
      } else {
        doc.text("PETIT JURORS' ATTENDANCE RECORD & PAYROLL", 105, y, { align: "center" });
        y += 7;
        doc.text(`TERM OF COURT: ${report.term} TERM, A.D.${report.year}`, 105, y, { align: "center" });
        y += 15;

        report.cases.forEach((courtCase) => {
          doc.setFontSize(12);
          doc.text(`CASE CAPTION: ${courtCase.caseCaption}`, 20, y);
          y += 7;
          doc.text(`CASE START DATE: ${formatDate(courtCase.startDate)}`, 20, y);
          doc.text(`CASE END DATE: ${formatDate(courtCase.endDate)}`, 110, y);
          y += 10;
          doc.text(`BEFORE HIS HONOR: ${report.judgeName.toUpperCase()}`, 20, y);
          y += 10;

          const regularJurors = courtCase.jurors.filter(j => j.jurorType === 'Regular');
          const alternativeJurors = courtCase.jurors.filter(j => j.jurorType === 'Alternative');

          if (regularJurors.length > 0) {
            doc.setFontSize(11);
            doc.text("REGULAR JURORS", 20, y);
            y += 5;

            const regularTableData = regularJurors.map((juror, index) => [
              index + 1,
              juror.jurorId,
              juror.jurorName,
              juror.contactNo,
              `${juror.daysAttended} days`,
              `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
              `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
            ]);

            doc.autoTable({
              startY: y,
              head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
              body: regularTableData,
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
                fontStyle: 'bold' 
              },
              columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 40 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 }
              },
              didParseCell: (data) => {
                if (data.column.index >= 5) {
                  data.cell.styles.halign = 'right';
                }
              }
            });

            y = doc.lastAutoTable.finalY + 10;
          }

          if (alternativeJurors.length > 0) {
            doc.setFontSize(11);
            doc.text("ALTERNATIVE JURORS", 20, y);
            y += 5;

            const alternativeTableData = alternativeJurors.map((juror, index) => [
              index + 1,
              juror.jurorId,
              juror.jurorName,
              juror.contactNo,
              `${juror.daysAttended} days`,
              `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
              `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
            ]);

            doc.autoTable({
              startY: y,
              head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
              body: alternativeTableData,
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
                fontStyle: 'bold' 
              },
              columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 40 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 }
              },
              didParseCell: (data) => {
                if (data.column.index >= 5) {
                  data.cell.styles.halign = 'right';
                }
              }
            });

            y = doc.lastAutoTable.finalY + 15;
          }

          const caseTotal = courtCase.jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`CASE TOTAL: US$${caseTotal.toFixed(2)}`, 160, y, { align: "right" });
          y += 10;
        });
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Report #${index + 1} - Submitted by: ${report.submittedBy?.username || 'Unknown'}`, 20, y);
      y += 10;

      if (index < validReports.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 20;
      }

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`Chief_Jury_Reports_${selectedCourt}.pdf`);
  };

  const generateSinglePDF = (report) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
    y += 7;
    doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
    y += 7;
    doc.text(selectedCourt.toUpperCase(), 105, y, { align: "center" });
    y += 7;
    doc.text("NIMBA COUNTY", 105, y, { align: "center" });
    y += 7;
    
    if (report.juryType === 'Grand Jury') {
      doc.text(`${report.juryType.toUpperCase()} ATTENDANCE RECORD & PAYROLL`, 105, y, { align: "center" });
      y += 7;
      doc.text(`TERM OF COURT: ${report.term} TERM, A.D.${report.year}`, 105, y, { align: "center" });
      y += 7;
      doc.text(`BEFORE HIS HONOR: ${report.judgeName.toUpperCase()}`, 105, y, { align: "center" });
      y += 15;

      if (report.cases.length > 0) {
        const jurors = report.cases[0].jurors;
        const tableData = jurors.map((juror, index) => [
          index + 1,
          juror.jurorId,
          juror.jurorName,
          juror.contactNo,
          `${juror.daysAttended} days`,
          `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
          `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
        ]);

        const totalAmount = jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);

        doc.autoTable({
          startY: y,
          head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
          body: tableData,
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
            fontStyle: 'bold' 
          },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 25 }
          },
          didParseCell: (data) => {
            if (data.column.index >= 5) {
              data.cell.styles.halign = 'right';
            }
          }
        });

        y = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL: US$${totalAmount.toFixed(2)}`, 160, y, { align: "right" });
      }
    } else {
      doc.text("PETIT JURORS' ATTENDANCE RECORD & PAYROLL", 105, y, { align: "center" });
      y += 7;
      doc.text(`TERM OF COURT: ${report.term} TERM, A.D.${report.year}`, 105, y, { align: "center" });
      y += 15;

      report.cases.forEach((courtCase) => {
        doc.setFontSize(12);
        doc.text(`CASE CAPTION: ${courtCase.caseCaption}`, 20, y);
        y += 7;
        doc.text(`CASE START DATE: ${formatDate(courtCase.startDate)}`, 20, y);
        doc.text(`CASE END DATE: ${formatDate(courtCase.endDate)}`, 110, y);
        y += 10;
        doc.text(`BEFORE HIS HONOR: ${report.judgeName.toUpperCase()}`, 20, y);
        y += 10;

        const regularJurors = courtCase.jurors.filter(j => j.jurorType === 'Regular');
        const alternativeJurors = courtCase.jurors.filter(j => j.jurorType === 'Alternative');

        if (regularJurors.length > 0) {
          doc.setFontSize(11);
          doc.text("REGULAR JURORS", 20, y);
          y += 5;

          const regularTableData = regularJurors.map((juror, index) => [
            index + 1,
            juror.jurorId,
            juror.jurorName,
            juror.contactNo,
            `${juror.daysAttended} days`,
            `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
            `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
          ]);

          doc.autoTable({
            startY: y,
            head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
            body: regularTableData,
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
              fontStyle: 'bold' 
            },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: 25 },
              2: { cellWidth: 40 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 25 },
              6: { cellWidth: 25 }
            },
            didParseCell: (data) => {
              if (data.column.index >= 5) {
                data.cell.styles.halign = 'right';
              }
            }
          });

          y = doc.lastAutoTable.finalY + 10;
        }

        if (alternativeJurors.length > 0) {
          doc.setFontSize(11);
          doc.text("ALTERNATIVE JURORS", 20, y);
          y += 5;

          const alternativeTableData = alternativeJurors.map((juror, index) => [
            index + 1,
            juror.jurorId,
            juror.jurorName,
            juror.contactNo,
            `${juror.daysAttended} days`,
            `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
            `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
          ]);

          doc.autoTable({
            startY: y,
            head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
            body: alternativeTableData,
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
              fontStyle: 'bold' 
            },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: 25 },
              2: { cellWidth: 40 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 25 },
              6: { cellWidth: 25 }
            },
            didParseCell: (data) => {
              if (data.column.index >= 5) {
                data.cell.styles.halign = 'right';
              }
            }
          });

          y = doc.lastAutoTable.finalY + 15;
        }

        const caseTotal = courtCase.jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`CASE TOTAL: US$${caseTotal.toFixed(2)}`, 160, y, { align: "right" });
        y += 10;
      });
    }

    doc.save(`Chief_Jury_Report_${report.term}_${report.year}.pdf`);
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">Chief Justice Jury Reports - {selectedCourt}</h2>
      
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
              <th>Jury Type</th>
              <th>Term</th>
              <th>Year</th>
              <th>Judge</th>
              <th>Submitted By</th>
              <th>Cases/Jurors</th>
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
                  <td>{report.juryType}</td>
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{report.judgeName}</td>
                  <td>{report.submittedBy?.username || 'Unknown'}</td>
                  <td>
                    {report.juryType === 'Grand Jury' ? 
                      `${report.cases[0]?.jurors.length || 0} jurors` : 
                      `${report.cases.length} cases`}
                  </td>
                  <td>
                    {report.rejected ? (
                      <span className="text-danger">Rejected</span>
                    ) : report.chiefViewed ? (
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
                      {!report.chiefViewed && !report.rejected && (
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
                <div className="col-md-3">
                  <strong>Jury Type:</strong> {viewModal.report.juryType}
                </div>
                <div className="col-md-3">
                  <strong>Term:</strong> {viewModal.report.term}
                </div>
                <div className="col-md-3">
                  <strong>Year:</strong> {viewModal.report.year}
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
                  ) : viewModal.report.chiefViewed ? (
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

              <h5 className="mt-4">
                {viewModal.report.juryType === 'Grand Jury' ? 
                  `Jurors (${viewModal.report.cases[0]?.jurors.length || 0})` : 
                  `Cases (${viewModal.report.cases.length})`}
              </h5>

              {viewModal.report.juryType === 'Grand Jury' ? (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Juror ID</th>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Days Attended</th>
                        <th>Rate/Day</th>
                        <th>Amount Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewModal.report.cases[0]?.jurors.map((juror, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{juror.jurorId}</td>
                          <td>{juror.jurorName}</td>
                          <td>{juror.contactNo}</td>
                          <td>{juror.daysAttended}</td>
                          <td>US${juror.amountPerDay}</td>
                          <td>US${(juror.daysAttended * juror.amountPerDay).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                viewModal.report.cases.map((courtCase, caseIndex) => (
                  <div key={caseIndex} className="mb-4">
                    <h6>Case {caseIndex + 1}: {courtCase.caseCaption}</h6>
                    <p>
                      <strong>Dates:</strong> {courtCase.startDate} to {courtCase.endDate}
                    </p>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Juror ID</th>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Days</th>
                            <th>Rate/Day</th>
                            <th>Amount Due</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courtCase.jurors.map((juror, jurorIndex) => (
                            <tr key={jurorIndex}>
                              <td>{jurorIndex + 1}</td>
                              <td>{juror.jurorId}</td>
                              <td>{juror.jurorName}</td>
                              <td>{juror.contactNo}</td>
                              <td>{juror.daysAttended}</td>
                              <td>US${juror.amountPerDay}</td>
                              <td>US${(juror.daysAttended * juror.amountPerDay).toFixed(2)}</td>
                              <td>{juror.jurorType}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}

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