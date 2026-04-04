import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReturnsAssignment() {
  const [form, setForm] = useState({
    term: '',
    year: new Date().getFullYear().toString(),
    judgeName: '',
    circuitCourt: '',
    cases: [],
    finalized: false,
    rejected: false,
    rejectionReason: '',
    submittedToAdmin: false,
    submittedToChief: false
  });

  const [currentCase, setCurrentCase] = useState({
    caseType: 'Criminal',
    caseTitle: '',
    crimeOrAction: '',
    disposition: '',
    juryInfo: '',
    costFineAmount: '',
    remarks: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitRecipient, setSubmitRecipient] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const location = useLocation();

  const termOptions = [
    'February Term',
    'May Term',
    'August Term',
    'November Term'
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditingId(id);
      axios.get(`http://localhost:5000/api/returns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        setForm({
          ...res.data,
          cases: res.data.cases || [],
          attachments: res.data.attachments || []
        });

        if (res.data.cases?.[0]) {
          setCurrentCase(prev => ({
            ...prev,
            caseType: res.data.cases[0].caseType
          }));
        }
      }).catch(() => toast.error("❌ Failed to load report"));
    } else {
      setForm(prev => ({
        ...prev,
        circuitCourt: user.circuitCourt,
        submittedBy: user._id
      }));
    }
  }, [location]);

  const handleChange = (e) => {
    setCurrentCase((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addCaseToList = () => {
    if (!currentCase.caseTitle || !currentCase.crimeOrAction) {
      toast.error("❌ Case Title and Crime/Action required");
      return;
    }

    const updatedCases = [...form.cases];

    if (editingIndex !== null) {
      updatedCases[editingIndex] = currentCase;
      toast.success("✅ Case updated");
    } else {
      updatedCases.push(currentCase);
      toast.success("✅ Case added");
    }

    setForm({ ...form, cases: updatedCases });
    setCurrentCase({
      caseType: currentCase.caseType,
      caseTitle: '',
      crimeOrAction: '',
      disposition: '',
      juryInfo: '',
      costFineAmount: '',
      remarks: ''
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
    toast.info("🗑️ Case removed");
  };

  const handleSaveDraft = async () => {
    try {
      const payload = { 
        ...form,
        submittedBy: user._id,
        circuitCourt: user.circuitCourt 
      };
      
      if (editingId) {
        await axios.put(`http://localhost:5000/api/returns/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("✅ Draft Updated");
      } else {
        await axios.post("http://localhost:5000/api/returns", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("✅ Draft Saved");
        navigate('/clerk/my-reports');
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      toast.error("❌ Failed to save draft");
    }
  };

  const handleFinalize = () => {
    if (form.cases.length === 0) {
      toast.error("❌ Please add at least one case");
      return;
    }
    setShowFinalizeModal(true);
  };

  const confirmFinalize = async () => {
    try {
      const payload = { 
        ...form, 
        finalized: true,
        circuitCourt: user.circuitCourt,
        submittedBy: user._id
      };
      
      if (editingId) {
        await axios.put(`http://localhost:5000/api/returns/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("✅ Report Finalized");
        setForm(prev => ({ ...prev, finalized: true }));
      } else {
        const res = await axios.post("http://localhost:5000/api/returns", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("✅ Report Finalized");
        navigate(`/clerk/returns?id=${res.data._id}`);
      }
    } catch (err) {
      toast.error("❌ Failed to finalize report");
    } finally {
      setShowFinalizeModal(false);
    }
  };

  const handleSubmitTo = (recipient) => {
    setSubmitRecipient(recipient);
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/returns/submit/${editingId}`,
        { recipient: submitRecipient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`✅ Submitted to ${submitRecipient === 'admin' ? 'Admin' : 'Chief Justice'}`);
      fetchReport();
    } catch (err) {
      toast.error("❌ Submission failed");
    } finally {
      setShowSubmitModal(false);
    }
  };

  const handleResubmit = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/returns/resubmit/${editingId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Report ready for editing");
      fetchReport();
    } catch (err) {
      toast.error("❌ Failed to resubmit report");
    }
  };

  const fetchReport = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/returns/${editingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm({
        ...res.data,
        cases: res.data.cases || [],
        attachments: res.data.attachments || []
      });
    } catch (err) {
      toast.error("❌ Failed to load report");
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.warning("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('reportId', editingId);

    try {
      setUploading(true);
      const res = await axios.post(
        'http://localhost:5000/api/returns/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setForm(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), res.data.file]
      }));
      toast.success("✅ File uploaded successfully");
      setSelectedFile(null);
    } catch (err) {
      toast.error("❌ Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileUrl) => {
    try {
      await axios.delete('http://localhost:5000/api/returns/delete-file', {
        data: { url: fileUrl, reportId: editingId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setForm(prev => ({
        ...prev,
        attachments: prev.attachments.filter(file => file.url !== fileUrl)
      }));
      toast.success("✅ File deleted successfully");
    } catch (err) {
      toast.error("❌ Failed to delete file");
    }
  };

  const generatePDF = () => {
    if (form.cases.length === 0) {
      toast.warning("No cases to generate PDF");
      return;
    }

    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUDICIARY BRANCH OF GOVERNMENT", doc.internal.pageSize.width / 2, 20, { align: "center" });
    doc.text("“RETURNS TO ASSIGNMENT”", doc.internal.pageSize.width / 2, 28, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`COURT: ${form.circuitCourt || '-'}`, 14, 36);
    doc.text(`TERM: ${form.term || '-'} ${form.year || ''}`, 14, 44);
    doc.text(`JUDGE: ${form.judgeName || '-'}`, 14, 52);
    doc.text(`CLERK: ${user.username || '-'}`, 14, 60);

    const caseType = form.cases?.[0]?.caseType?.toUpperCase() || 'CASES';
    const dynamicLabel = caseType === "CIVIL" ? "ACTION" : "CRIME";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`SUMMARY CASE REPORTING FOR ${caseType} CASES:`, doc.internal.pageSize.width / 2, 68, { align: "center" });

    const tableBody = form.cases.map((c, i) => {
      const juryParts = (c.juryInfo || '').split(',');
      const feeParts = (c.costFineAmount || '').split(',');

      const juryColumn = c.caseType === "Civil"
        ? `${juryParts[0] || 'NONE'} | ${juryParts[1] || 'NONE'}`
        : `${juryParts[0] || 'NONE'}`;

      return [
        i + 1,
        c.caseTitle || "-",
        c.crimeOrAction || "-",
        c.disposition || "-",
        juryColumn,
        feeParts.join(' ') || '-',
        c.remarks || "-"
      ];
    });

    doc.autoTable({
      startY: 74,
      head: [[
        "No.",
        "Case Title",
        dynamicLabel,
        "Disposition",
        "Jury Panel / Grand Jury / Petit Jury / Ref#",
        "Costs/Fees/Fines/ Amount and Receipt#",
        "Remarks"
      ]],
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
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 50 },
        5: { halign: 'center', cellWidth: 40 },
        6: { halign: 'center', cellWidth: 50 }
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'wrap'
    });

    doc.save(`ReturnsReport-${form.term}-${form.year}.pdf`);
  };

  const isCivil = currentCase.caseType === "Civil";
  const caseLabel = isCivil ? "Action" : "Crime";

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h3 className="text-center text-primary mb-4">Returns to Assignment</h3>

      {form.rejected && (
        <div className="alert alert-danger">
          <strong>This report was rejected:</strong> {form.rejectionReason}
          <br />
          Please make the necessary changes and resubmit.
        </div>
      )}

      <form className="border p-4 bg-light rounded">
        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label"><strong>Term</strong></label>
            <select
              name="term"
              value={form.term}
              onChange={handleFormChange}
              className="form-control"
              required
              disabled={form.finalized && !form.rejected}
            >
              <option value="">Select Term</option>
              {termOptions.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label"><strong>Year</strong></label>
            <input
              type="number"
              name="year"
              value={form.year}
              onChange={handleFormChange}
              className="form-control"
              placeholder="Year"
              required
              disabled={form.finalized && !form.rejected}
              min="2000"
              max="2100"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label"><strong>Judge Name</strong></label>
            <input
              name="judgeName"
              value={form.judgeName}
              onChange={handleFormChange}
              className="form-control"
              placeholder="Judge Name"
              required
              disabled={form.finalized && !form.rejected}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Court</strong></label>
          <input
            name="circuitCourt"
            value={form.circuitCourt || user.circuitCourt}
            onChange={handleFormChange}
            className="form-control"
            disabled
          />
        </div>

        <h5 className="text-secondary">➕ Add Case Details</h5>

        <div className="mb-3">
          <label className="form-label"><strong>Case Type</strong></label>
          <select
            name="caseType"
            value={currentCase.caseType}
            onChange={handleChange}
            className="form-control"
            disabled={form.finalized && !form.rejected}
          >
            <option value="Criminal">Criminal</option>
            <option value="Civil">Civil</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Case Title</strong></label>
          <input
            name="caseTitle"
            value={currentCase.caseTitle}
            onChange={handleChange}
            className="form-control"
            placeholder="Case Title"
            disabled={form.finalized && !form.rejected}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>{caseLabel}</strong></label>
          <textarea
            name="crimeOrAction"
            value={currentCase.crimeOrAction}
            onChange={handleChange}
            className="form-control"
            placeholder={`Enter ${caseLabel}`}
            disabled={form.finalized && !form.rejected}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Disposition</strong></label>
          <textarea
            name="disposition"
            value={currentCase.disposition}
            onChange={handleChange}
            className="form-control"
            placeholder="Enter Disposition"
            disabled={form.finalized && !form.rejected}
          />
        </div>

        {isCivil ? (
          <>
            <div className="mb-3">
              <label className="form-label"><strong>Jury Panel</strong></label>
              <input
                name="juryPanel"
                onChange={(e) =>
                  setCurrentCase((prev) => ({
                    ...prev,
                    juryInfo: `${e.target.value},${prev.juryInfo?.split(',')[1] || ''}`
                  }))
                }
                className="form-control"
                placeholder="Enter Jury Panel"
                disabled={form.finalized && !form.rejected}
              />
            </div>
            <div className="mb-3">
              <label className="form-label"><strong>Reference #</strong></label>
              <input
                name="juryRef"
                onChange={(e) =>
                  setCurrentCase((prev) => ({
                    ...prev,
                    juryInfo: `${prev.juryInfo?.split(',')[0] || ''},${e.target.value}`
                  }))
                }
                className="form-control"
                placeholder="Enter Reference #"
                disabled={form.finalized && !form.rejected}
              />
            </div>
          </>
        ) : (
          <div className="mb-3">
            <label className="form-label"><strong>Jury Info</strong></label>
            <input
              name="juryInfo"
              value={currentCase.juryInfo}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter Jury Info"
              disabled={form.finalized && !form.rejected}
            />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label"><strong>Fees/Fines/Receipt #</strong></label>
          <input
            name="costFineAmount"
            value={currentCase.costFineAmount}
            onChange={handleChange}
            className="form-control"
            placeholder="Enter Fees/Fines/Receipt"
            disabled={form.finalized && !form.rejected}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Remarks</strong></label>
          <textarea
            name="remarks"
            value={currentCase.remarks}
            onChange={handleChange}
            className="form-control"
            placeholder="Enter Remarks"
            disabled={form.finalized && !form.rejected}
          />
        </div>

        <div className="d-flex justify-content-center mb-4">
          <button
            type="button"
            onClick={addCaseToList}
            className="btn btn-outline-primary"
            disabled={form.finalized && !form.rejected}
          >
            {editingIndex !== null ? "Update Case" : "Add Another Case"}
          </button>
        </div>

        <h6 className="text-muted">📋 Current Cases in Report</h6>
        {form.cases?.length === 0 ? (
          <p>No cases added yet.</p>
        ) : (
          <ul className="list-group mb-3">
            {form.cases.map((c, i) => (
              <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{c.caseTitle}</strong> — {c.caseType} | {c.crimeOrAction}
                </div>
                {(!form.finalized || form.rejected) && (
                  <div className="btn-group btn-group-sm">
                    <button 
                      className="btn btn-warning" 
                      onClick={() => handleCaseEdit(i)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleCaseDelete(i)}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* File Attachments Section */}
        <div className="card mt-3">
          <div className="card-header">Attachments</div>
          <div className="card-body">
            <div className="mb-3">
              <input
                type="file"
                className="form-control"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                disabled={form.finalized && !form.rejected}
              />
              <button
                className="btn btn-secondary mt-2"
                onClick={handleFileUpload}
                disabled={!selectedFile || (form.finalized && !form.rejected) || uploading}
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
                      >
                        {file.originalname}
                      </a>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleFileDelete(file.url)}
                        disabled={form.finalized && !form.rejected}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="d-flex gap-3 justify-content-center mt-4">
          {!form.finalized && (
            <>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveDraft}
              >
                💾 Save Draft
              </button>
              
              <button
                type="button"
                className="btn btn-success"
                onClick={handleFinalize}
              >
                🔒 Finalize Report
              </button>
            </>
          )}

          {form.rejected && (
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleResubmit}
            >
              🔄 Resubmit Report
            </button>
          )}

          {form.finalized && !form.rejected && (
            <>
              {!form.submittedToAdmin && (
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={() => handleSubmitTo('admin')}
                >
                  📤 Submit to Admin
                </button>
              )}

              {!form.submittedToChief && (
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={() => handleSubmitTo('chief')}
                >
                  ⚖️ Submit to Chief
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/clerk/my-reports')}
          >
            📄 View My Reports
          </button>

          <button
            type="button"
            className="btn btn-info"
            onClick={generatePDF}
            disabled={form.cases.length === 0}
          >
            📄 Generate PDF
          </button>
        </div>
      </form>

      {/* Finalize Modal */}
      <Modal show={showFinalizeModal} onHide={() => setShowFinalizeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Finalization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to finalize this report? Once finalized, you won't be able to edit it.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFinalizeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmFinalize}>
            Finalize Report
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Submit Modal */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to submit this report to {submitRecipient === 'admin' ? 'Admin' : 'Chief Justice'}?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmSubmit}>
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}