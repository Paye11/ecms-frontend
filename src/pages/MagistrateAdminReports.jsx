import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import 'react-toastify/dist/ReactToastify.css';

function MagistrateAdminReports() {
  const [reports, setReports] = useState([]);
  const token = localStorage.getItem("token");
  const selectedCourt = localStorage.getItem("selectedCourt");

  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/magistrate-reports/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Filter reports by selected court and ensure submittedBy exists
      const filtered = res.data.filter(report => 
        report.magisterialCourt === selectedCourt && 
        report.submittedBy
      );
      
      setReports(filtered);
    } catch (err) {
      console.error("Error loading reports:", err);
      toast.error("❌ Failed to load reports");
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const markAsViewed = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/magistrate-reports/view/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("✅ Marked as Viewed");
      fetchReports();
    } catch (err) {
      toast.error("❌ Failed to mark");
    }
  };

  const handleCombinedPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    reports.forEach((report, index) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
      y += 8;
      doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
      y += 8;
      doc.text("EIGHTH JUDICIAL CIRCUIT COURT", 105, y, { align: "center" });
      y += 8;
      doc.text(`${report.magisterialCourt}, NIMBA COUNTY`, 105, y, { align: "center" });
      y += 8;
      
      doc.setFontSize(12);
      doc.text(`QUARTERLY REPORT, ${report.term}, A.D.${report.year}`, 105, y, { align: "center" });
      y += 8;
      
      doc.setFontSize(11);
      doc.text(`1.${report.magisterialCourt} CITY MAGISTERIAL COURT:`, 20, y);
      y += 8;
      
      // USD Deposits
      const usdDeposits = report.deposits.filter(d => d.currency === 'USD');
      const lrdDeposits = report.deposits.filter(d => d.currency === 'LRD');
      
      const tableBody = [
        ...usdDeposits.map((d, i) => [
          i + 1,
          d.payeeName,
          `USD$${d.amountDeposited}`,
          d.bankName,
          d.cbaNo,
          d.bankSlipNo
        ]),
        ...lrdDeposits.map((d, i) => [
          usdDeposits.length + i + 1,
          d.payeeName,
          `LD $${d.amountDeposited}`,
          d.bankName,
          d.cbaNo,
          d.bankSlipNo
        ])
      ];
      
      doc.autoTable({
        startY: y,
        head: [["NO.", "NAME OF PAYEES", "AMOUNT DEPOSITED", "BANK", "CBA NO.", "BANK SLIP NO."]],
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
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 50 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 30 }
        }
      });
      
      y = doc.lastAutoTable.finalY + 15;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`All-Magistrate-Reports-${selectedCourt}.pdf`);
  };

  const clearAllReports = async () => {
    if (!window.confirm("Are you sure you want to delete ALL magistrate reports?")) return;

    try {
      await axios.delete("http://localhost:5000/api/magistrate-reports/admin/clear-all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("🧹 All magistrate reports cleared");
      fetchReports();
    } catch (err) {
      toast.error("❌ Failed to clear reports");
    }
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="text-primary text-center mb-4">📥 Magistrate Reports - {selectedCourt}</h2>
      <div className="text-end mb-3">
        <button className="btn btn-success" onClick={handleCombinedPDF}>
          📄 Download All as PDF
        </button>
        <button className="btn btn-danger ms-3" onClick={clearAllReports}>
          🧹 Clear All Reports
        </button>
      </div>

      {reports.length === 0 ? (
        <p className="text-center">No magistrate reports submitted yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Clerk</th>
                <th>Term</th>
                <th>Magistrate</th>
                <th>Court</th>
                <th>Deposits</th>
                <th>Status</th>
                <th>Mark</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.submittedBy?.username || "-"}</td>
                  <td>{r.term}</td>
                  <td>{r.magistrateName}</td>
                  <td>{r.magisterialCourt}</td>
                  <td>{r.deposits?.length || 0}</td>
                  <td>{r.adminViewed ? "✅ Viewed" : "⏳ Pending"}</td>
                  <td>
                    {!r.adminViewed && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => markAsViewed(r._id)}
                      >
                        ✅ Mark as Viewed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MagistrateAdminReports;