import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function ChiefMagistrateReports() {
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
        `http://localhost:5000/api/magistrate-reports/chief/all?court=${encodeURIComponent(selectedCourt)}`,
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
      await axios.patch(`http://localhost:5000/api/magistrate-reports/chief/view/${id}`, {}, {
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
        `http://localhost:5000/api/magistrate-reports/chief/reject/${rejectModal.reportId}`,
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

  const generateCombinedPDF = () => {
    const validReports = reports.filter(report => !report.rejected);
    if (validReports.length === 0) {
      toast.warning("No valid reports to download");
      return;
    }

    const doc = new jsPDF();
    let y = 20;

    validReports.forEach((report, index) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
      y += 7;
      doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
      y += 7;
      doc.text("EIGHTH JUDICIAL CIRCUIT COURT", 105, y, { align: "center" });
      y += 7;
      doc.text("SANNIQUELLIE NIMBA COUNTY", 105, y, { align: "center" });
      y += 7;
      doc.text(`QUARTERLY REPORT, ${report.term}, A.D.${report.year}`, 105, y, { align: "center" });
      y += 15;

      const courts = {};
      report.deposits.forEach(deposit => {
        if (!courts[deposit.court]) {
          courts[deposit.court] = { usdDeposits: [], lrdDeposits: [] };
        }
        if (deposit.currency === 'USD') {
          courts[deposit.court].usdDeposits.push(deposit);
        } else {
          courts[deposit.court].lrdDeposits.push(deposit);
        }
      });

      Object.entries(courts).forEach(([courtName, courtData], courtIndex) => {
        doc.setFontSize(12);
        doc.text(`${courtIndex + 1}.${courtName} CITY MAGISTERIAL COURT:`, 20, y);
        y += 10;

        const { usdDeposits, lrdDeposits } = courtData;
        const tableData = [];
        const maxLength = Math.max(usdDeposits.length, lrdDeposits.length);

        for (let i = 0; i < maxLength; i++) {
          tableData.push([
            i + 1,
            usdDeposits[i]?.payeeName || lrdDeposits[i]?.payeeName || '',
            usdDeposits[i] ? `USD$${usdDeposits[i].amountDeposited}` : '',
            lrdDeposits[i] ? `LD $${lrdDeposits[i].amountDeposited}` : '',
            (usdDeposits[i] || lrdDeposits[i])?.bankName || '',
            (usdDeposits[i] || lrdDeposits[i])?.cbaNo || '',
            (usdDeposits[i] || lrdDeposits[i])?.bankSlipNo || ''
          ]);
        }

        const usdTotal = usdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);
        const lrdTotal = lrdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);

        tableData.push([
          '',
          { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `US$${usdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `LD$${lrdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          '',
          ''
        ]);

        doc.autoTable({
          startY: y,
          head: [
            [
              { content: "NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: "NAME OF PAYEES", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: "AMOUNT DEPOSITED", colSpan: 2, styles: { halign: 'center' } },
              { content: "BANK", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: "CBA NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: "BANK SLIP NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
            ],
            [
              "USD", "LRD", "", "", "", ""
            ]
          ],
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
            fontStyle: 'bold',
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 14 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 35 }
          },
          didParseCell: (data) => {
            if (data.column.index === 2 || data.column.index === 3) {
              data.cell.styles.halign = 'right';
            }
          }
        });

        y = doc.lastAutoTable.finalY + 15;
      });

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

    doc.save(`Chief_Magistrate_Reports_${selectedCourt}.pdf`);
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
    doc.text("EIGHTH JUDICIAL CIRCUIT COURT", 105, y, { align: "center" });
    y += 7;
    doc.text("SANNIQUELLIE NIMBA COUNTY", 105, y, { align: "center" });
    y += 7;
    doc.text(`QUARTERLY REPORT, ${report.term}, A.D.${report.year}`, 105, y, { align: "center" });
    y += 15;

    const courts = {};
    report.deposits.forEach(deposit => {
      if (!courts[deposit.court]) {
        courts[deposit.court] = { usdDeposits: [], lrdDeposits: [] };
      }
      if (deposit.currency === 'USD') {
        courts[deposit.court].usdDeposits.push(deposit);
      } else {
        courts[deposit.court].lrdDeposits.push(deposit);
      }
    });

    Object.entries(courts).forEach(([courtName, courtData], courtIndex) => {
      doc.setFontSize(12);
      doc.text(`${courtIndex + 1}.${courtName} CITY MAGISTERIAL COURT:`, 20, y);
      y += 10;

      const { usdDeposits, lrdDeposits } = courtData;
      const tableData = [];
      const maxLength = Math.max(usdDeposits.length, lrdDeposits.length);

      for (let i = 0; i < maxLength; i++) {
        tableData.push([
          i + 1,
          usdDeposits[i]?.payeeName || lrdDeposits[i]?.payeeName || '',
          usdDeposits[i] ? `USD$${usdDeposits[i].amountDeposited}` : '',
          lrdDeposits[i] ? `LD $${lrdDeposits[i].amountDeposited}` : '',
          (usdDeposits[i] || lrdDeposits[i])?.bankName || '',
          (usdDeposits[i] || lrdDeposits[i])?.cbaNo || '',
          (usdDeposits[i] || lrdDeposits[i])?.bankSlipNo || ''
        ]);
      }

      const usdTotal = usdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);
      const lrdTotal = lrdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);

      tableData.push([
        '',
        { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `US$${usdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `LD$${lrdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        '',
        ''
      ]);

      doc.autoTable({
        startY: y,
        head: [
          [
            { content: "NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: "NAME OF PAYEES", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: "AMOUNT DEPOSITED", colSpan: 2, styles: { halign: 'center' } },
            { content: "BANK", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: "CBA NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: "BANK SLIP NO.", rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
          ],
          [
            "USD", "LRD", "", "", "", ""
          ]
        ],
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
          fontStyle: 'bold',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 35 }
        },
        didParseCell: (data) => {
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.halign = 'right';
          }
        }
      });

      y = doc.lastAutoTable.finalY + 15;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`Chief_Magistrate_Report_${report.term}_${report.year}.pdf`);
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">Chief Justice Magistrate Reports - {selectedCourt}</h2>
      
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
              <th>Magistrate</th>
              <th>Court</th>
              <th>Submitted By</th>
              <th>Deposits</th>
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
                  <td>{report.magistrateName}</td>
                  <td>{report.magisterialCourt}</td>
                  <td>{report.submittedBy?.username || 'Unknown'}</td>
                  <td>{report.deposits.length}</td>
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
                <div className="col-md-4">
                  <strong>Term:</strong> {viewModal.report.term}
                </div>
                <div className="col-md-4">
                  <strong>Year:</strong> {viewModal.report.year}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Magistrate:</strong> {viewModal.report.magistrateName}
                </div>
                <div className="col-md-6">
                  <strong>Court:</strong> {viewModal.report.magisterialCourt}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Submitted By:</strong> {viewModal.report.submittedBy?.username || 'Unknown'}
                </div>
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

              <h5 className="mt-4">Deposits ({viewModal.report.deposits.length})</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Payee</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Bank</th>
                      <th>CBA No.</th>
                      <th>Slip No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewModal.report.deposits.map((deposit, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{deposit.payeeName}</td>
                        <td>{deposit.amountDeposited}</td>
                        <td>{deposit.currency}</td>
                        <td>{deposit.bankName}</td>
                        <td>{deposit.cbaNo}</td>
                        <td>{deposit.bankSlipNo}</td>
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
          <Button variant="secondary" onClick={() => setViewModal({ show: false, report: null })}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}