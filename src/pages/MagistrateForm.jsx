import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MagistrateForm() {
  const [form, setForm] = useState({
    term: '',
    year: new Date().getFullYear().toString(),
    magistrateName: '',
    deposits: [],
    finalized: false
  });

  const [currentDeposit, setCurrentDeposit] = useState({
    payeeName: '',
    amountDeposited: '',
    bankName: 'MC2',
    bankSlipNo: '',
    cbaNo: '',
    currency: 'USD',
    court: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [lastUsedCourt, setLastUsedCourt] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const location = useLocation();

  const termOptions = ['February Term', 'May Term', 'August Term', 'November Term'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditingId(id);
      axios.get(`http://localhost:5000/api/magistrate-reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        setForm({
          ...res.data,
          deposits: res.data.deposits || []
        });
        // Set last used court from existing deposits
        if (res.data.deposits.length > 0) {
          setLastUsedCourt(res.data.deposits[0].court);
          setCurrentDeposit(prev => ({
            ...prev,
            court: res.data.deposits[0].court
          }));
        }
      }).catch(() => toast.error("Failed to load report"));
    }
  }, [location]);

  const handleDepositChange = (e) => {
    setCurrentDeposit({ ...currentDeposit, [e.target.name]: e.target.value });
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addDepositToList = () => {
    if (!currentDeposit.payeeName || !currentDeposit.amountDeposited || 
        !currentDeposit.bankSlipNo || !currentDeposit.cbaNo || !currentDeposit.court) {
      toast.error("All deposit fields are required");
      return;
    }

    // Update last used court if this is the first deposit or if court was changed
    if (form.deposits.length === 0 || currentDeposit.court !== lastUsedCourt) {
      setLastUsedCourt(currentDeposit.court);
    }

    const updatedDeposits = [...form.deposits];
    if (editingIndex !== null) {
      updatedDeposits[editingIndex] = currentDeposit;
      toast.success("Deposit updated");
    } else {
      updatedDeposits.push(currentDeposit);
      toast.success("Deposit added");
    }

    setForm({ ...form, deposits: updatedDeposits });
    setCurrentDeposit({
      payeeName: '',
      amountDeposited: '',
      bankName: 'MC2',
      bankSlipNo: '',
      cbaNo: '',
      currency: 'USD',
      court: lastUsedCourt // Auto-fill with last used court
    });
    setEditingIndex(null);
  };

  const handleDepositEdit = (index) => {
    setCurrentDeposit(form.deposits[index]);
    setEditingIndex(index);
  };

  const handleDepositDelete = (index) => {
    const updated = form.deposits.filter((_, i) => i !== index);
    setForm({ ...form, deposits: updated });
    toast.info("Deposit removed");
  };

  const handleSaveDraft = async () => {
    try {
      const payload = {
        term: form.term,
        year: form.year,
        magistrateName: form.magistrateName,
        deposits: form.deposits,
        finalized: false
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/magistrate-reports/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Updated");
      } else {
        await axios.post("http://localhost:5000/api/magistrate-reports", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Saved");
        navigate('/clerk/magistrate-reports');
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to save draft");
    }
  };

  const handleFinalize = () => {
    if (form.deposits.length === 0) {
      toast.error("Please add at least one deposit");
      return;
    }
    setShowFinalizeModal(true);
  };

  const confirmFinalize = async () => {
    try {
      const payload = {
        term: form.term,
        year: form.year,
        magistrateName: form.magistrateName,
        deposits: form.deposits,
        finalized: true
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/magistrate-reports/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Report Finalized");
        setForm(prev => ({ ...prev, finalized: true }));
      } else {
        const res = await axios.post("http://localhost:5000/api/magistrate-reports", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Report Finalized");
        navigate(`/clerk/magistrate-reports?id=${res.data._id}`);
      }
    } catch (err) {
      console.error("Finalize error:", err);
      toast.error(err.response?.data?.error || "Failed to finalize report");
    } finally {
      setShowFinalizeModal(false);
    }
  };

const [uploading, setUploading] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);
const handleFileUpload = async () => {
  if (!selectedFile) {
    toast.warning("Please select a file first");
    return;
  }

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('reportId', editingId || form._id);

  try {
    setUploading(true);
    const res = await axios.post(
      `/api/magistrate-reports/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      }
    );

    console.log('Upload response:', res);

    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), res.data.file]
    }));
    toast.success("File uploaded successfully");
    setSelectedFile(null);
  } catch (err) {
    console.error('Upload error:', err);
    toast.error(err.response?.data?.error || "Failed to upload file");
  } finally {
    setUploading(false);
  }
};
const handleFileDelete = async (fileUrl) => {
  try {
    await axios.delete(`/api/magistrate-reports/delete-file`, {
      data: { url: fileUrl, reportId: editingId || form._id },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter(file => file.url !== fileUrl)
    }));
    toast.success("File deleted successfully");
  } catch (err) {
    toast.error("Failed to delete file");
  }
};


  

  const generatePDF = () => {
    const doc = new jsPDF();
    let y = 20;

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
    doc.text(`QUARTERLY REPORT, ${form.term}, A.D.${form.year}`, 105, y, { align: "center" });
    y += 15;

    // Group deposits by court
    const courts = {};
    form.deposits.forEach(deposit => {
      if (!courts[deposit.court]) {
        courts[deposit.court] = { usdDeposits: [], lrdDeposits: [] };
      }
      if (deposit.currency === 'USD') {
        courts[deposit.court].usdDeposits.push(deposit);
      } else {
        courts[deposit.court].lrdDeposits.push(deposit);
      }
    });

    // Generate section for each court
    Object.entries(courts).forEach(([courtName, courtData], courtIndex) => {
      // Court title
      doc.setFontSize(12);
      doc.text(`${courtIndex + 1}.${courtName} CITY MAGISTERIAL COURT:`, 20, y);
      y += 10;

      const { usdDeposits, lrdDeposits } = courtData;

      // Create table data
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

      // Calculate totals
      const usdTotal = usdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);
      const lrdTotal = lrdDeposits.reduce((sum, d) => sum + parseFloat(d.amountDeposited), 0);

      // Add totals row
      tableData.push([
        '',
        { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `US$${usdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `LD$${lrdTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        '',
        ''
      ]);

      // Generate table
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
          0: { cellWidth: 14 },   // NO.
          1: { cellWidth: 40 },   // NAME
          2: { cellWidth: 25 },   // USD
          3: { cellWidth: 25 },   // LRD
          4: { cellWidth: 25 },   // BANK
          5: { cellWidth: 25 },   // CBA NO.
          6: { cellWidth: 35 }    // BANK SLIP NO.
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

    doc.save(`MagistrateReport-${form.term}-${form.year}.pdf`);
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h3 className="text-center mb-4">QUARTERLY REPORT FROM MAGISTERIAL COURT</h3>

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Term</label>
              <select
                name="term"
                value={form.term}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              >
                <option value="">Select Term</option>
                {termOptions.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Year</label>
              <input
                type="text"
                name="year"
                value={form.year}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Magistrate Name</label>
              <input
                name="magistrateName"
                value={form.magistrateName}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">Add Deposit Details</div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Magisterial Court</label>
                  <input
                    name="court"
                    value={currentDeposit.court}
                    onChange={handleDepositChange}
                    className="form-control"
                    placeholder="Enter court name (e.g. SANNIQUELLIE)"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Name of Payee</label>
                  <input
                    name="payeeName"
                    value={currentDeposit.payeeName}
                    onChange={handleDepositChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Amount</label>
                  <input
                    name="amountDeposited"
                    value={currentDeposit.amountDeposited}
                    onChange={handleDepositChange}
                    className="form-control"
                    type="number"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Currency</label>
                  <select
                    name="currency"
                    value={currentDeposit.currency}
                    onChange={handleDepositChange}
                    className="form-control"
                    disabled={form.finalized}
                  >
                    <option value="USD">USD</option>
                    <option value="LRD">LRD</option>
                  </select>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-md-3">
                  <label className="form-label">Bank Name</label>
                  <input
                    name="bankName"
                    value={currentDeposit.bankName}
                    onChange={handleDepositChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Bank Slip No.</label>
                  <input
                    name="bankSlipNo"
                    value={currentDeposit.bankSlipNo}
                    onChange={handleDepositChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">CBA No.</label>
                  <input
                    name="cbaNo"
                    value={currentDeposit.cbaNo}
                    onChange={handleDepositChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    onClick={addDepositToList}
                    className="btn btn-primary"
                    disabled={form.finalized}
                  >
                    {editingIndex !== null ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <h5>Current Deposits</h5>
            {form.deposits.length === 0 ? (
              <p>No deposits added</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Court</th>
                      <th>Payee</th>
                      <th>Amount</th>
                      <th>Bank</th>
                      <th>Bank Slip No.</th>
                      <th>CBA No.</th>
                      {!form.finalized && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {form.deposits.map((d, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{d.court}</td>
                        <td>{d.payeeName}</td>
                        <td>{d.currency} {d.amountDeposited}</td>
                        <td>{d.bankName}</td>
                        <td>{d.bankSlipNo}</td>
                        <td>{d.cbaNo}</td>
                        {!form.finalized && (
                          <td>
                            <button 
                              className="btn btn-sm btn-warning me-1"
                              onClick={() => handleDepositEdit(i)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDepositDelete(i)}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-between mt-4">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/clerk/magistrate-reports')}
            >
              Back to Reports
            </button>


            <div className="card mt-3">
  <div className="card-header">Attachments</div>
  <div className="card-body">
    <div className="mb-3">
      <input
        type="file"
        className="form-control"
        onChange={(e) => setSelectedFile(e.target.files[0])}
        disabled={form.finalized}
      />
      <button
        className="btn btn-secondary mt-2"
        onClick={handleFileUpload}
        disabled={!selectedFile || form.finalized || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>

    {form.attachments?.length > 0 && (
            <div className="mt-3">
              <h6>Uploaded Files:</h6>
              <ul className="list-group">
                {form.attachments?.map((file) => (
  <div key={file.url}>
    <a 
      href={file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {file.originalname}
    </a>
    <button onClick={() => handleFileDelete(file.url)}>Delete</button>
  </div>
))}
              </ul>
            </div>
          )}
  </div>
</div>
            <div>
              {!form.finalized && (
                <>
                  <button 
                    className="btn btn-primary me-2"
                    onClick={handleSaveDraft}
                  >
                    Save Draft
                  </button>
                  <button 
                    className="btn btn-success me-2"
                    onClick={handleFinalize}
                  >
                    Finalize Report
                  </button>
                </>
              )}
              <button 
                className="btn btn-info"
                onClick={generatePDF}
                disabled={form.deposits.length === 0}
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showFinalizeModal} onHide={() => setShowFinalizeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Finalization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to finalize this report? Once finalized, you cannot edit it.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFinalizeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmFinalize}>
            Finalize
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}