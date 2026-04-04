import { useParams } from 'react-router-dom';

const PDFViewer = () => {
  const { filename } = useParams();
  
  return (
    <div style={{ height: '100vh' }}>
      <iframe 
        src={`http://localhost:5000/uploads/civil-dockets/${filename}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="PDF Viewer"
      />
    </div>
  );
};

export default PDFViewer;