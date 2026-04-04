import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ClerkJuryMyReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/jury-reports/my", {
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
        (report.juryType && report.juryType.toLowerCase().includes(term)) ||
        (report.term && report.term.toLowerCase().includes(term)) ||
        (report.year && report.year.toString().includes(term))
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

  // ✅ UPDATED handleDownloadPDF() function for downloaded reports (view-only) with total row and date formatting

const handleDownloadPDF = (report) => {
  const doc = new jsPDF();
  let y = 20;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
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
  doc.text("EIGHTH JUDICIAL CIRCUIT COURT", 105, y, { align: "center" });
  y += 7;
  doc.text("SANNIQUELLIE NIMBA COUNTY", 105, y, { align: "center" });
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

      tableData.push([
        '',
        '',
        { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        '',
        '',
        { content: `US$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
      ]);

      doc.autoTable({
        startY: y,
        head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
        body: tableData,
        styles: { fontSize: 10, halign: 'center', valign: 'middle', cellPadding: 4, lineWidth: 0.1 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
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
    }
  }

  if (report.juryType === 'Petit Jury') {
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

      // Separate regular and alternative jurors
      const regularJurors = courtCase.jurors.filter(j => j.jurorType === 'Regular');
      const alternativeJurors = courtCase.jurors.filter(j => j.jurorType === 'Alternative');

      // Regular Jurors Table
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

        const regularTotal = regularJurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);

        regularTableData.push([
          '',
          '',
          { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          '',
          '',
          { content: `US$${regularTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        doc.autoTable({
          startY: y,
          head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
          body: regularTableData,
          styles: { fontSize: 10, halign: 'center', valign: 'middle', cellPadding: 4, lineWidth: 0.1 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
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

      // Alternative Jurors Table
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

        const alternativeTotal = alternativeJurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);

        alternativeTableData.push([
          '',
          '',
          { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          '',
          '',
          '',
          { content: `US$${alternativeTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        doc.autoTable({
          startY: y,
          head: [["NO.", "JURORS ID #", "NAMES", "CONTACT", "DAYS ATTENDED", "RATE PER DAY", "AMOUNT DUE"]],
          body: alternativeTableData,
          styles: { fontSize: 10, halign: 'center', valign: 'middle', cellPadding: 4, lineWidth: 0.1 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
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

      // Case total
      const caseTotal = courtCase.jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`CASE TOTAL: US$${caseTotal.toFixed(2)}`, 160, y, { align: "right" });
      y += 10;

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
  }

  doc.save(`JuryReport-${report.term}-${report.year}.pdf`);
};
  const handleSubmitTo = async (id, recipient) => {
    try {
      await axios.patch(`http://localhost:5000/api/jury-reports/submit/${id}`, 
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
        `http://localhost:5000/api/jury-reports/resubmit/${id}`,
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
      <h2 className="text-center mb-4">My Jury Payroll Reports</h2>

      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by jury type, term, or year..."
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
              <th>Jury Type</th>
              <th>Term</th>
              <th>Year</th>
              <th>Judge</th>
              <th>Cases/Jurors</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">No reports found</td>
              </tr>
            ) : (
              filteredReports.map(report => (
                <tr key={report._id}>
                  <td>{report.juryType}</td>
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{report.judgeName}</td>
                  <td>
                    {report.juryType === 'Grand Jury' ? 
                      `${report.cases[0]?.jurors.length || 0} jurors` : 
                      `${report.cases.length} cases`}
                  </td>
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
                        onClick={() => navigate(`/clerk/jury?id=${report._id}`)}
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
          onClick={() => navigate('/clerk/jury')}
        >
          Create New Report
        </button>
      </div>
    </div>
  );
}