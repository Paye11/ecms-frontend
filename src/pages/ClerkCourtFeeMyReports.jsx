import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ClerkCourtFeeMyReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/court-fees/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter(report => report.clerkCourt === user.circuitCourt);
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
        (report.court && report.court.toLowerCase().includes(term)) ||
        (report.term && report.term.toLowerCase().includes(term)) ||
        (report.year && report.year.toString().includes(term))
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

 const handleDownloadPDF = (report) => {
  if (!report.entries || report.entries.length === 0) {
    toast.warning("No entries to generate PDF");
    return;
  }

  const doc = new jsPDF();
  let y = 20;

  // Format date function (28 Jan. 2025 format)
  const formatDate = (date) => {
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

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
  const tableData = report.entries.map((entry, index) => [
    index + 1,
    entry.payeeName,
    entry.type,
    `US$${parseFloat(entry.amount).toFixed(2)}`,
    entry.bankName,
    entry.receiptNumber,
    formatDate(new Date(entry.date)) // Formatted date
  ]);

  // Calculate total amount
  const totalAmount = report.entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  // Add totals row to table data
  tableData.push([
    '',
    { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
    '',
    { content: `US$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
    '',
    '',
    ''
  ]);

  // Generate table
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
      0: { cellWidth: 15 },   // NO.
      1: { cellWidth: 40 },   // NAME
      2: { cellWidth: 20 },   // DESCRIPTION
      3: { cellWidth: 25 },   // AMOUNT
      4: { cellWidth: 25 },   // BANK
      5: { cellWidth: 25 },   // RECEIPT #
      6: { cellWidth: 25 }    // DATE
    },
    didParseCell: (data) => {
      // Right align amount column
      if (data.column.index === 3) {
        data.cell.styles.halign = 'right';
      }
      // Right align TOTAL text in footer
      if (data.row.index === tableData.length - 1 && data.column.index === 1) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // Save PDF
  doc.save(`CourtFeesReport-${report.term}-${report.year}.pdf`);
};

  const handleSubmitTo = async (id, recipient) => {
    try {
      await axios.patch(`http://localhost:5000/api/court-fees/submit/${id}`, 
        { recipient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Submitted to ${recipient}`);
      fetchReports();
    } catch (err) {
      toast.error("Submission failed");
    }
  };

  const handleResubmit = async (id) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/court-fees/resubmit/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Report ready for editing");
      fetchReports();
    } catch (err) {
      toast.error("Failed to resubmit report");
    }
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-center mb-4">My Court Fees Reports</h2>

      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by court, term, or year..."
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
            Showing {filteredReports.length} of {reports.length} reports
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
              <th>Entries</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">No reports found</td>
              </tr>
            ) : (
              filteredReports.map(report => (
                <tr key={report._id}>
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{report.court}</td>
                  <td>{report.entries.length}</td>
                  <td>
                    {report.finalized && !report.rejected && "Finalized"}
                    {report.rejected && (
                      <span className="text-danger">
                        Rejected: {report.rejectionReason}
                      </span>
                    )}
                    {report.adminViewed && " (Approved by Admin)"}
                    {report.chiefViewed && " (Approved by Chief)"}
                    {report.submittedToAdmin && !report.rejected && " (Submitted to Admin)"}
                    {report.submittedToChief && !report.rejected && " (Submitted to Chief)"}
                  </td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/clerk/court-fees?id=${report._id}`)}
                        disabled={report.finalized && !report.rejected}
                      >
                        {report.rejected ? "Edit" : report.finalized ? "View" : "Edit"}
                      </button>
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => handleDownloadPDF(report)}
                      >
                        PDF
                      </button>
                      {report.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResubmit(report._id)}
                        >
                          Resubmit
                        </button>
                      )}
                      {report.finalized && !report.submittedToAdmin && !report.rejected && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSubmitTo(report._id, 'admin')}
                        >
                          Submit to Admin
                        </button>
                      )}
                      {report.finalized && !report.submittedToChief && !report.rejected && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleSubmitTo(report._id, 'chief')}
                        >
                          Submit to Chief
                        </button>
                      )}
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
          onClick={() => navigate('/clerk/court-fees/form')}
        >
          Create New Report
        </button>
      </div>
    </div>
  );
}