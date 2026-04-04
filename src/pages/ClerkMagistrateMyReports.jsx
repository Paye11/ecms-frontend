import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ClerkMagistrateMyReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/magistrate-reports/my", {
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
        (report.magisterialCourt && report.magisterialCourt.toLowerCase().includes(term)) ||
        (report.term && report.term.toLowerCase().includes(term)) ||
        (report.year && report.year.toString().includes(term))
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

  const handleDownloadPDF = (report) => {
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
        { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'center' } },
        { content: `US$${usdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: `LD$${lrdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'center' } },
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

    doc.save(`MagistrateReport-${report.term}-${report.year}.pdf`);
  };

  const handleSubmitTo = async (id, recipient) => {
    try {
      await axios.patch(`http://localhost:5000/api/magistrate-reports/submit/${id}`, 
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
        `http://localhost:5000/api/magistrate-reports/resubmit/${id}`,
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
      <h2 className="text-center mb-4">My Magistrate Reports</h2>

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
              <th>Magistrate</th>
              <th>Court</th>
              <th>Deposits</th>
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
                  <td>{report.term}</td>
                  <td>{report.year}</td>
                  <td>{report.magistrateName}</td>
                  <td>{report.magisterialCourt}</td>
                  <td>{report.deposits.length}</td>
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
                        onClick={() => navigate(`/clerk/magistrate?id=${report._id}`)}
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
          onClick={() => navigate('/clerk/magistrate')}
        >
          Create New Report
        </button>
      </div>
    </div>
  );
}