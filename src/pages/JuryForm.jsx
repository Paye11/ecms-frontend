import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function JuryForm() {
  const [form, setForm] = useState({
    term: '',
    year: new Date().getFullYear().toString(),
    judgeName: '',
    juryType: '',
    cases: [],
    finalized: false
  });

  const [currentCase, setCurrentCase] = useState({
    caseCaption: 'GRAND JURY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    jurors: []
  });

  const [currentJuror, setCurrentJuror] = useState({
    jurorName: '',
    contactNo: '',
    daysAttended: '',
    amountPerDay: '6.00',
    jurorId: '',
    jurorType: 'Regular'
  });

  const [editingId, setEditingId] = useState(null);
  const [editingCaseIndex, setEditingCaseIndex] = useState(null);
  const [editingJurorIndex, setEditingJurorIndex] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const location = useLocation();

  const termOptions = ['February', 'May', 'August', 'November'];
  const juryTypeOptions = ['Grand Jury', 'Petit Jury'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditingId(id);
      axios.get(`http://localhost:5000/api/jury-reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        const data = res.data;
        setForm({
          ...data,
          cases: data.cases || []
        });
        
        // For Grand Jury, set the first case as currentCase if exists
        if (data.juryType === 'Grand Jury' && data.cases.length > 0) {
          setCurrentCase(data.cases[0]);
        }
      }).catch(() => toast.error("Failed to load report"));
    }
  }, [location]);

  const handleJurorChange = (e) => {
    setCurrentJuror({ ...currentJuror, [e.target.name]: e.target.value });
  };

  const handleCaseChange = (e) => {
    setCurrentCase({ ...currentCase, [e.target.name]: e.target.value });
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addJurorToCase = () => {
    if (!currentJuror.jurorName || !currentJuror.contactNo || 
        !currentJuror.daysAttended || !currentJuror.jurorId) {
      toast.error("All juror fields are required");
      return;
    }

    const updatedJurors = [...currentCase.jurors];
    if (editingJurorIndex !== null) {
      updatedJurors[editingJurorIndex] = currentJuror;
      toast.success("Juror updated");
    } else {
      updatedJurors.push(currentJuror);
      toast.success("Juror added");
    }

    setCurrentCase({ ...currentCase, jurors: updatedJurors });
    setCurrentJuror({
      jurorName: '',
      contactNo: '',
      daysAttended: '',
      amountPerDay: '6.00',
      jurorId: '',
      jurorType: 'Regular'
    });
    setEditingJurorIndex(null);
  };

  const handleJurorEdit = (index) => {
    setCurrentJuror(currentCase.jurors[index]);
    setEditingJurorIndex(index);
  };

  const handleJurorDelete = (index) => {
    const updated = currentCase.jurors.filter((_, i) => i !== index);
    setCurrentCase({ ...currentCase, jurors: updated });
    toast.info("Juror removed");
  };

  const addCaseToList = () => {
    if (!currentCase.caseCaption || !currentCase.startDate || !currentCase.endDate) {
      toast.error("Case caption and dates are required");
      return;
    }

    const updatedCases = [...form.cases];
    if (editingCaseIndex !== null) {
      updatedCases[editingCaseIndex] = currentCase;
      toast.success("Case updated");
    } else {
      updatedCases.push(currentCase);
      toast.success("Case added");
    }

    setForm({ ...form, cases: updatedCases });
    setCurrentCase({
      caseCaption: '',
      startDate: '',
      endDate: '',
      jurors: []
    });
    setEditingCaseIndex(null);
  };

  const handleCaseEdit = (index) => {
    setCurrentCase(form.cases[index]);
    setEditingCaseIndex(index);
  };

  const handleCaseDelete = (index) => {
    const updated = form.cases.filter((_, i) => i !== index);
    setForm({ ...form, cases: updated });
    toast.info("Case removed");
  };

  const handleSaveDraft = async () => {
    try {
      let casesToSave = [...form.cases];
      
      // For Grand Jury, ensure we save the currentCase (which contains jurors)
      if (form.juryType === 'Grand Jury' && currentCase.jurors.length > 0) {
        // Check if we already have a case for Grand Jury
        const grandJuryCaseIndex = casesToSave.findIndex(c => c.caseCaption === 'GRAND JURY');
        
        if (grandJuryCaseIndex >= 0) {
          // Update existing Grand Jury case
          casesToSave[grandJuryCaseIndex] = currentCase;
        } else {
          // Add new Grand Jury case with a default caption
          casesToSave.push({
            caseCaption: 'GRAND JURY',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            jurors: [...currentCase.jurors]
          });
        }
      }

      const payload = {
        term: form.term,
        year: form.year,
        judgeName: form.judgeName,
        juryType: form.juryType,
        cases: casesToSave,
        finalized: false
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/jury-reports/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Updated");
      } else {
        await axios.post("http://localhost:5000/api/jury-reports", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Draft Saved");
        navigate('/clerk/jury-reports');
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to save draft");
    }
  };

  const handleFinalize = () => {
    if (form.juryType === 'Petit Jury' && form.cases.length === 0) {
      toast.error("Please add at least one case");
      return;
    }

    if (form.juryType === 'Grand Jury' && currentCase.jurors.length === 0) {
      toast.error("Please add at least one juror");
      return;
    }

    setShowFinalizeModal(true);
  };

  const confirmFinalize = async () => {
    try {
      let casesToSave = [...form.cases];
      
      // For Grand Jury, ensure we save the currentCase (which contains jurors)
      if (form.juryType === 'Grand Jury' && currentCase.jurors.length > 0) {
        // Check if we already have a case for Grand Jury
        const grandJuryCaseIndex = casesToSave.findIndex(c => c.caseCaption === 'GRAND JURY');
        
        if (grandJuryCaseIndex >= 0) {
          // Update existing Grand Jury case
          casesToSave[grandJuryCaseIndex] = currentCase;
        } else {
          // Add new Grand Jury case with a default caption
          casesToSave.push({
            caseCaption: 'GRAND JURY',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            jurors: [...currentCase.jurors]
          });
        }
      }

      const payload = {
        term: form.term,
        year: form.year,
        judgeName: form.judgeName,
        juryType: form.juryType,
        cases: casesToSave,
        finalized: true
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/jury-reports/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Report Finalized");
        setForm(prev => ({ ...prev, finalized: true }));
      } else {
        const res = await axios.post("http://localhost:5000/api/jury-reports", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Report Finalized");
        navigate(`/clerk/jury-reports?id=${res.data._id}`);
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
        '/api/jury-reports/upload',
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

      await axios.delete('/api/jury-reports/delete-file', {
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
    const doc = new jsPDF();
    let y = 20;

    // Get user's court and county from user data
    const userCourt = user?.circuitCourt || "EIGHTH JUDICIAL CIRCUIT COURT";
    const userCounty = user?.county || "NIMBA COUNTY";

    // Determine which data to use for display
    const displayCases = form.juryType === 'Grand Jury' 
      ? [{
          caseCaption: 'GRAND JURY',
          startDate: form.year,
          endDate: form.year,
          jurors: currentCase.jurors
        }]
      : form.cases;

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    // Header section - now using dynamic court and county information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF LIBERIA", 105, y, { align: "center" });
    y += 7;
    doc.text("JUDICIAL BRANCH", 105, y, { align: "center" });
    y += 7;
    doc.text(userCourt.toUpperCase(), 105, y, { align: "center" });
    y += 7;
    doc.text(userCounty.toUpperCase(), 105, y, { align: "center" });
    y += 7;

    if (form.juryType === 'Grand Jury') {
      doc.text(`${form.juryType.toUpperCase()} ATTENDANCE RECORD & PAYROLL`, 105, y, { align: "center" });
      y += 7;
      doc.text(`TERM OF COURT: ${form.term} TERM, A.D.${form.year}`, 105, y, { align: "center" });
      y += 7;
      doc.text(`BEFORE HIS HONOR: ${form.judgeName.toUpperCase()}`, 105, y, { align: "center" });
      y += 15;

      const tableData = displayCases[0].jurors.map((juror, index) => [
        index + 1,
        juror.jurorId,
        juror.jurorName,
        juror.contactNo,
        `${juror.daysAttended} days`,
        `US$${parseFloat(juror.amountPerDay).toFixed(2)}`,
        `US$${(juror.daysAttended * juror.amountPerDay).toFixed(2)}`
      ]);

      const totalAmount = displayCases[0].jurors.reduce((sum, j) => sum + (j.daysAttended * j.amountPerDay), 0);

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

      // Add total outside the table
      y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: US$${totalAmount.toFixed(2)}`, 160, y, { align: "right" });

    } else if (form.juryType === 'Petit Jury') {
      doc.text("PETIT JURORS' ATTENDANCE RECORD & PAYROLL", 105, y, { align: "center" });
      y += 7;
      doc.text(`TERM OF COURT: ${form.term} TERM, A.D.${form.year}`, 105, y, { align: "center" });
      y += 15;

      displayCases.forEach((courtCase) => {
        doc.setFontSize(12);
        doc.text(`CASE CAPTION: ${courtCase.caseCaption}`, 20, y);
        y += 7;
        doc.text(`CASE START DATE: ${formatDate(courtCase.startDate)}`, 20, y);
        doc.text(`CASE END DATE: ${formatDate(courtCase.endDate)}`, 110, y);
        y += 10;
        doc.text(`BEFORE HIS HONOR: ${form.judgeName.toUpperCase()}`, 20, y);
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

    doc.save(`JuryReport-${form.term}-${form.year}.pdf`);
};
  return (
    <div className="container mt-4">
      <ToastContainer />
      <h3 className="text-center mb-4">JURY PAYROLL REPORT</h3>

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Jury Type</label>
              <select
                name="juryType"
                value={form.juryType}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              >
                <option value="">Select Jury Type</option>
                {juryTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
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
            <div className="col-md-4">
              <label className="form-label">Judge Name</label>
              <input
                name="judgeName"
                value={form.judgeName}
                onChange={handleFormChange}
                className="form-control"
                disabled={form.finalized}
              />
            </div>
          </div>

          {form.juryType && (
            <div className="card mt-3">
              <div className="card-header">
                {form.juryType === 'Petit Jury' ? 'Add Case Details' : 'Add Jury Details'}
              </div>
              <div className="card-body">
                {form.juryType === 'Petit Jury' ? (
                  <>
                    <div className="row">
                      <div className="col-md-8">
                        <label className="form-label">Case Caption</label>
                        <input
                          name="caseCaption"
                          value={currentCase.caseCaption}
                          onChange={handleCaseChange}
                          className="form-control"
                          placeholder="e.g. REPUBLIC OF LIBERIA VERSUS ANTHONY BARCUS AND JUNIOR FLAHN"
                          disabled={form.finalized}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={currentCase.startDate}
                          onChange={handleCaseChange}
                          className="form-control"
                          disabled={form.finalized}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          value={currentCase.endDate}
                          onChange={handleCaseChange}
                          className="form-control"
                          disabled={form.finalized}
                        />
                      </div>
                    </div>
                    <div className="row mt-2">
                      <div className="col-md-12">
                        <button
                          onClick={addCaseToList}
                          className="btn btn-primary"
                          disabled={form.finalized}
                        >
                          {editingCaseIndex !== null ? "Update Case" : "Add Case"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="row">
                    <div className="col-md-12">
                      <p>Grand Jury - No case details needed</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {form.juryType && (
            <div className="card mt-3">
              <div className="card-header">Add Juror Details</div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <label className="form-label">Juror Name</label>
                    <input
                      name="jurorName"
                      value={currentJuror.jurorName}
                      onChange={handleJurorChange}
                      className="form-control"
                      disabled={form.finalized}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Contact No.</label>
                    <input
                      name="contactNo"
                      value={currentJuror.contactNo}
                      onChange={handleJurorChange}
                      className="form-control"
                      disabled={form.finalized}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Days Attended</label>
                    <input
                      name="daysAttended"
                      value={currentJuror.daysAttended}
                      onChange={handleJurorChange}
                      className="form-control"
                      type="number"
                      disabled={form.finalized}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Amount Per Day</label>
                    <input
                      name="amountPerDay"
                      value={currentJuror.amountPerDay}
                      onChange={handleJurorChange}
                      className="form-control"
                      type="number"
                      step="0.01"
                      disabled={form.finalized}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Juror ID</label>
                    <input
                      name="jurorId"
                      value={currentJuror.jurorId}
                      onChange={handleJurorChange}
                      className="form-control"
                      disabled={form.finalized}
                    />
                  </div>
                  {form.juryType === 'Petit Jury' && (
                    <div className="col-md-1">
                      <label className="form-label">Type</label>
                      <select
                        name="jurorType"
                        value={currentJuror.jurorType}
                        onChange={handleJurorChange}
                        className="form-control"
                        disabled={form.finalized}
                      >
                        <option value="Regular">Regular</option>
                        <option value="Alternative">Alt</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="row mt-2">
                  <div className="col-md-12">
                    <button
                      onClick={addJurorToCase}
                      className="btn btn-primary"
                      disabled={form.finalized}
                    >
                      {editingJurorIndex !== null ? "Update Juror" : "Add Juror"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.juryType === 'Petit Jury' && currentCase.caseCaption && (
            <div className="mt-3">
              <h5>Current Jurors for {currentCase.caseCaption}</h5>
              {currentCase.jurors.length === 0 ? (
                <p>No jurors added</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Juror ID</th>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Days</th>
                        <th>Rate/Day</th>
                        <th>Amount Due</th>
                        {!form.finalized && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentCase.jurors.map((j, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{j.jurorId}</td>
                          <td>{j.jurorName}</td>
                          <td>{j.contactNo}</td>
                          <td>{j.daysAttended}</td>
                          <td>US${j.amountPerDay}</td>
                          <td>US${(j.daysAttended * j.amountPerDay).toFixed(2)}</td>
                          {!form.finalized && (
                            <td>
                              <button 
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => handleJurorEdit(i)}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleJurorDelete(i)}
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
          )}

          {form.juryType === 'Grand Jury' && (
            <div className="mt-3">
              <h5>Current Jurors</h5>
              {currentCase.jurors.length === 0 ? (
                <p>No jurors added</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Juror ID</th>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Days</th>
                        <th>Rate/Day</th>
                        <th>Amount Due</th>
                        {!form.finalized && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentCase.jurors.map((j, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{j.jurorId}</td>
                          <td>{j.jurorName}</td>
                          <td>{j.contactNo}</td>
                          <td>{j.daysAttended}</td>
                          <td>US${j.amountPerDay}</td>
                          <td>US${(j.daysAttended * j.amountPerDay).toFixed(2)}</td>
                          {!form.finalized && (
                            <td>
                              <button 
                                className="btn btn-sm btn-warning me-1"
                                onClick={() => handleJurorEdit(i)}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleJurorDelete(i)}
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
          )}

          {form.juryType === 'Petit Jury' && form.cases.length > 0 && (
            <div className="mt-3">
              <h5>All Cases</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Case Caption</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Jurors</th>
                      {!form.finalized && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {form.cases.map((c, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{c.caseCaption}</td>
                        <td>{c.startDate}</td>
                        <td>{c.endDate}</td>
                        <td>{c.jurors.length}</td>
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
            </div>
          )}

          <div className="d-flex justify-content-between mt-4">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/clerk/jury-reports')}
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
                  >
                    Finalize Report
                  </button>
                </>
              )}
              <button 
                className="btn btn-info"
                onClick={generatePDF}
                disabled={form.juryType === 'Petit Jury' ? 
                  form.cases.length === 0 || form.cases.some(c => c.jurors.length === 0) : 
                  currentCase.jurors.length === 0}
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