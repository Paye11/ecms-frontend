import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CivilDocketForm() {
  const [form, setForm] = useState({
    term: '',
    year: new Date().getFullYear().toString(),
    judgeName: '',
    clerkName: '',
    court: '',
    cases: [],
    finalized: false,
    rejected: false,
    rejectionReason: ''
  });

  const [currentCase, setCurrentCase] = useState({
    plaintiff: '',
    defendant: '',
    action: '',
    dateFiled: '',
    amountDeposited: 0
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditingId(id);
      axios.get(`http://localhost:5000/api/civil-dockets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        setForm({
          ...res.data,
          cases: res.data.cases || []
        });
      }).catch(() => toast.error("Failed to load docket"));
    } else {
      setForm(prev => ({
        ...prev,
        court: user.circuitCourt || '',
        clerkName: user.username || ''
      }));
    }
  }, [location]);

  const handleCaseChange = (e) => {
    const { name, value } = e.target;
    setCurrentCase(prev => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addCaseToList = () => {
    if (!currentCase.defendant || !currentCase.action || !currentCase.dateFiled) {
      toast.error("Defendant, action, and date filed are required");
      return;
    }

    const updatedCases = [...form.cases];
    if (editingIndex !== null) {
      updatedCases[editingIndex] = currentCase;
      toast.success("Case updated");
    } else {
      updatedCases.push(currentCase);
      toast.success("Case added");
    }

    setForm({ ...form, cases: updatedCases });
    setCurrentCase({
      plaintiff: '',
      defendant: '',
      action: '',
      dateFiled: '',
      amountDeposited: 0
    });
    setEditingIndex(null);
  };

  const handleCaseEdit = (index) => {
    setCurrentCase(form.cases[index]);
    setEditingIndex(index);
  };

  const handleCaseDelete = (index) => {
    const updated = form.cases.filter((_, i) => i !== index);
    setForm({ ...form, cases: updated });
    toast.info("Case removed");
  };

  const handleSaveDraft = async () => {
    try {
      const payload = {
        ...form,
        finalized: false
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/civil-dockets/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Updated");
      } else {
        await axios.post("http://localhost:5000/api/civil-dockets", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Saved");
        navigate('/clerk/civil-dockets');
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to save draft");
    }
  };

  const handleFinalize = () => {
    if (form.cases.length === 0) {
      toast.error("Please add at least one case");
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
        await axios.put(`http://localhost:5000/api/civil-dockets/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(form.rejected ? "Docket Resubmitted" : "Docket Finalized");
        setForm(prev => ({ ...prev, finalized: true, rejected: false }));
      } else {
        const res = await axios.post("http://localhost:5000/api/civil-dockets", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Docket Finalized");
        navigate(`/clerk/civil-dockets?id=${res.data._id}`);
      }
    } catch (err) {
      console.error("Finalize error:", err);
      toast.error(err.response?.data?.error || "Failed to finalize docket");
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
    console.log('Uploading file:', selectedFile.name); // Debug log
    
    const res = await axios.post(
      '/api/civil-dockets/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('Upload response:', res.data); // Debug log
    
    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), res.data.file]
    }));
    toast.success("File uploaded successfully");
    setSelectedFile(null);
  } catch (err) {
    console.error('Upload error:', err);
    console.error('Error response:', err.response); // Debug log
    toast.error(err.response?.data?.error || "Failed to upload file");
  } finally {
    setUploading(false);
  }
};
  const handleFileDelete = async (fileUrl) => {
    try {
      await axios.delete(`/api/civil-dockets/delete-file`, {
        data: { url: fileUrl, docketId: editingId || form._id },
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
  if (form.cases.length === 0) {
    toast.warning("No cases to generate PDF");
    return;
  }

  const doc = new jsPDF();
  let y = 20;

  // Format date as "Jan. 1, 2025"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Header Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
  y += 7;
  doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
  y += 7;
  doc.text(`${form.court.toUpperCase()}`, 105, y, { align: "center" });
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.text("CIVIL CASES DOCKET", 105, y, { align: "center" });
  y += 15;

  // Court Information (centered term)
  doc.setFontSize(12);
  doc.text(`${form.term.toUpperCase()} TERM, A.D.${form.year}`, 105, y, { align: "center" });
  y += 7;
  doc.text(`BEFORE: ${form.judgeName.toUpperCase()}`, 20, y);
  y += 7;
  doc.text(`CLERK'S OFFICE: ${form.clerkName.toUpperCase()}`, 20, y);
  y += 15;

  // Prepare table data with proper "VERSUS" column
  const caseTableData = form.cases.map((c, index) => [
    index + 1,
    c.plaintiff || 'N/A',
    "VERSUS",
    c.defendant || 'N/A',
    c.action.toUpperCase(),
    formatDate(c.dateFiled)
  ]);

  // Cases Table with continuation header
  doc.autoTable({
    startY: y,
    head: [
      ["NO.", "PLAINTIFF (S)", "", "DEFENDANT (S)", "ACTION (S)", "DATE FILED"]
    ],
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
    },
    // Add continuation header to new pages
    didDrawPage: function(data) {
      // Skip the first page
      if (data.pageNumber > 1) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Civil Dockets Continued...", 20, 10);
      }
    }
  });

  doc.save(`CivilDocket-${form.term}-${form.year}.pdf`);
};
  return (
    <div className="container mt-4">
      <ToastContainer />
      <h3 className="text-center mb-4">CIVIL CASES DOCKET</h3>

      {form.rejected && (
        <div className="alert alert-danger">
          <strong>This docket was rejected:</strong> {form.rejectionReason}
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
              <label className="form-label">Clerk Name</label>
              <input
                name="clerkName"
                value={form.clerkName}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-12">
              <label className="form-label">Court</label>
              <input
                name="court"
                value={form.court}
                onChange={handleFormChange}
                className="form-control"
                disabled
              />
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">Add Case Details</div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-12">
                  <label className="form-label">Plaintiff</label>
                  <input
                    name="plaintiff"
                    value={currentCase.plaintiff}
                    onChange={handleCaseChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-12 mt-2">
                  <label className="form-label">Defendant</label>
                  <input
                    name="defendant"
                    value={currentCase.defendant}
                    onChange={handleCaseChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-8 mt-2">
                  <label className="form-label">Action</label>
                  <input
                    name="action"
                    value={currentCase.action}
                    onChange={handleCaseChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-4 mt-2">
                  <label className="form-label">Date Filed</label>
                  <input
                    type="date"
                    name="dateFiled"
                    value={currentCase.dateFiled}
                    onChange={handleCaseChange}
                    className="form-control"
                    disabled={form.finalized}
                  />
                </div>
                <div className="col-md-4 mt-2">
                  <label className="form-label">Amount Deposited</label>
                  <input
                    name="amountDeposited"
                    value={currentCase.amountDeposited}
                    onChange={handleCaseChange}
                    className="form-control"
                    type="number"
                    step="0.01"
                    disabled={form.finalized}
                  />
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-md-12">
                  <button
                    onClick={addCaseToList}
                    className="btn btn-primary"
                    disabled={form.finalized}
                  >
                    {editingIndex !== null ? "Update Case" : "Add Case"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <h5>Cases List</h5>
            {form.cases.length === 0 ? (
              <p>No cases added</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Plaintiff</th>
                      <th>Defendant</th>
                      <th>Action</th>
                      <th>Date Filed</th>
                      <th>Amount Deposited</th>
                      {!form.finalized && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {form.cases.map((c, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{c.plaintiff || 'N/A'}</td>
                        <td>{c.defendant || 'N/A'}</td>
                        <td>{c.action || 'N/A'}</td>
                        <td>{c.dateFiled ? new Date(c.dateFiled).toLocaleDateString() : 'N/A'}</td>
                        <td>${parseFloat(c.amountDeposited).toFixed(2)}</td>
                        {!form.finalized && (
                          <td>
                            <button 
                              className="btn btn-sm btn-warning me-1"
                              onClick={() => handleCaseEdit(i)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleCaseDelete(i)}
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
              onClick={() => navigate('/clerk/civil-dockets')}
            >
              Back to Dockets
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
                    disabled={form.finalized}
                  >
                    {form.rejected ? "Resubmit Docket" : "Finalize Docket"}
                  </button>
                </>
              )}
              <button 
                className="btn btn-info"
                onClick={generatePDF}
                disabled={form.cases.length === 0}
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
          Are you sure you want to {form.rejected ? 'resubmit' : 'finalize'} this docket? 
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