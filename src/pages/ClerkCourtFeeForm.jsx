import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ClerkCourtFeeForm() {
  const [form, setForm] = useState({
    term: '',
    year: new Date().getFullYear().toString(),
    judgeName: '',
    court: '',
    entries: [],
    finalized: false,
    rejected: false,
    rejectionReason: ''
  });

  const [currentEntry, setCurrentEntry] = useState({
    payeeName: '',
    amount: '',
    bankName: '',
    receiptNumber: '',
    type: 'Fine',
    date: new Date().toISOString().split('T')[0]
  });

  const [editingId, setEditingId] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

   const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
  

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const location = useLocation();

  const termOptions = ['February', 'May', 'August', 'November'];
  const typeOptions = ['Fine', 'Fee', 'Cost'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditingId(id);
      axios.get(`http://localhost:5000/api/court-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        setForm({
          ...res.data,
          entries: res.data.entries || []
        });
      }).catch(() => toast.error("Failed to load report"));
    } else {
      setForm(prev => ({
        ...prev,
        court: user.circuitCourt || ''
      }));
    }
  }, [location]);

  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    setCurrentEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addEntryToList = () => {
    if (!currentEntry.payeeName || !currentEntry.amount || 
        !currentEntry.bankName || !currentEntry.receiptNumber) {
      toast.error("All entry fields are required");
      return;
    }

    const updatedEntries = [...form.entries];
    if (editingIndex !== null) {
      updatedEntries[editingIndex] = currentEntry;
      toast.success("Entry updated");
    } else {
      updatedEntries.push(currentEntry);
      toast.success("Entry added");
    }

    setForm({ ...form, entries: updatedEntries });
    setCurrentEntry({
      payeeName: '',
      amount: '',
      bankName: '',
      receiptNumber: '',
      type: 'Fine',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingIndex(null);
  };

  const handleEntryEdit = (index) => {
    setCurrentEntry(form.entries[index]);
    setEditingIndex(index);
  };

  const handleEntryDelete = (index) => {
    const updated = form.entries.filter((_, i) => i !== index);
    setForm({ ...form, entries: updated });
    toast.info("Entry removed");
  };

  const handleSaveDraft = async () => {
    try {
      const payload = {
        ...form,
        finalized: false
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/court-fees/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Updated");
      } else {
        await axios.post("http://localhost:5000/api/court-fees", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Saved");
        navigate('/clerk/court-fees');
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to save draft");
    }
  };

  const handleFinalize = () => {
    if (form.entries.length === 0) {
      toast.error("Please add at least one entry");
      return;
    }
    setShowFinalizeModal(true);
  };

  const confirmFinalize = async () => {
    try {
      const payload = {
        ...form,
        finalized: true,
        rejected: false,
        rejectionReason: ''
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/court-fees/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(form.rejected ? "Report Resubmitted" : "Report Finalized");
        setForm(prev => ({ ...prev, finalized: true, rejected: false }));
      } else {
        const res = await axios.post("http://localhost:5000/api/court-fees", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Report Finalized");
        navigate(`/clerk/court-fees?id=${res.data._id}`);
      }
    } catch (err) {
      console.error("Finalize error:", err);
      toast.error(err.response?.data?.error || "Failed to finalize report");
    } finally {
      setShowFinalizeModal(false);
    }
  };







 const handleFileUpload = async () => {
  if (!selectedFile) {
    toast.warning("Please select a file first");
    return;
  }

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('docketId', editingId || form._id);

  try {
    setUploading(true);
    
    const res = await axios.post(
      '/api/court-fees/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      }
    );

    const uploadedFile = {
      ...res.data.file,
      url: res.data.file.url.startsWith('http') 
        ? res.data.file.url 
        : `${window.location.origin}${res.data.file.url}`
    };

    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), uploadedFile]
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
    const relativeUrl = fileUrl.startsWith('http')
      ? new URL(fileUrl).pathname
      : fileUrl;

    await axios.delete('/api/court-fees/delete-file', {
      data: { 
        url: relativeUrl, 
        docketId: editingId || form._id 
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter(file => file.url !== fileUrl)
    }));
    toast.success("File deleted successfully");
  } catch (err) {
    toast.error(err.response?.data?.error || "Failed to delete file");
  }
};






  const generatePDF = () => {
  if (form.entries.length === 0) {
    toast.warning("No entries to generate PDF");
    return;
  }

  const doc = new jsPDF();
  let y = 20;

  // Format date function
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
  doc.text(`COURT: ${form.court.toUpperCase()}`, 20, y);
  y += 7;
  doc.text(`TERM: ${form.term} A.D. ${form.year}`, 20, y);
  y += 10;

  // Prepare table data
  const tableData = form.entries.map((entry, index) => [
    index + 1,
    entry.payeeName,
    entry.type,
    `US$${parseFloat(entry.amount).toFixed(2)}`,
    entry.bankName,
    entry.receiptNumber,
    formatDate(new Date(entry.date)) // Formatted date
  ]);

  // Calculate total amount
  const totalAmount = form.entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

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
  doc.save(`CourtFeesReport-${form.term}-${form.year}.pdf`);
};
  return (
    <div className="container mt-4">
      <ToastContainer />
      <h3 className="text-center mb-4">COURT COSTS, FINES AND FEES</h3>

      {form.rejected && (
        <div className="alert alert-danger">
          <strong>This report was rejected:</strong> {form.rejectionReason}
          <br />
          Please make the necessary changes and resubmit.
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
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
              <label className="form-label">Judge Name</label>
              <input
                name="judgeName"
                value={form.judgeName}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Court</label>
              <input
                name="court"
                value={form.court}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">Add Entry Details</div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Payee Name</label>
                  <input
                    name="payeeName"
                    value={currentEntry.payeeName}
                    onChange={handleEntryChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Amount (USD)</label>
                  <input
                    name="amount"
                    value={currentEntry.amount}
                    onChange={handleEntryChange}
                    className="form-control"
                    type="number"
                    step="0.01"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Bank Name</label>
                  <input
                    name="bankName"
                    value={currentEntry.bankName}
                    onChange={handleEntryChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Receipt #</label>
                  <input
                    name="receiptNumber"
                    value={currentEntry.receiptNumber}
                    onChange={handleEntryChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Type</label>
                  <select
                    name="type"
                    value={currentEntry.type}
                    onChange={handleEntryChange}
                    className="form-control"
                    disabled={form.finalized}
                  >
                    {typeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={currentEntry.date}
                    onChange={handleEntryChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    onClick={addEntryToList}
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
            <h5>Entries List</h5>
            {form.entries.length === 0 ? (
              <p>No entries added</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Payee Name</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Bank</th>
                      <th>Receipt #</th>
                      <th>Date</th>
                      {!form.finalized && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {form.entries.map((entry, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{entry.payeeName}</td>
                        <td>{entry.type}</td>
                        <td>US${parseFloat(entry.amount).toFixed(2)}</td>
                        <td>{entry.bankName}</td>
                        <td>{entry.receiptNumber}</td>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        {!form.finalized && (
                          <td>
                            <button 
                              className="btn btn-sm btn-warning me-1"
                              onClick={() => handleEntryEdit(i)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleEntryDelete(i)}
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
  onClick={() => navigate('/clerk/court-fees-reports')}
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
                      {form.attachments.map((file, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <a 
                            href={file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            {file.originalname}
                          </a>
                          {!form.finalized && (
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleFileDelete(file.url)}
                            >
                              Delete
                            </button>
                          )}
                        </li>
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
                    disabled={form.finalized}
                  >
                    {form.rejected ? "Resubmit Report" : "Finalize Report"}
                  </button>
                </>
              )}
              <button 
                className="btn btn-info"
                onClick={generatePDF}
                disabled={form.entries.length === 0}
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showFinalizeModal} onHide={() => setShowFinalizeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm {form.rejected ? 'Resubmission' : 'Finalization'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to {form.rejected ? 'resubmit' : 'finalize'} this report? 
          {form.rejected ? ' It will be sent for review again.' : ' Once finalized, you cannot edit it.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFinalizeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmFinalize}>
            {form.rejected ? 'Resubmit' : 'Finalize'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}