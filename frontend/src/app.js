import React, { useState, useRef } from 'react';
import { Upload, Search, FileText, DownloadCloud, AlertCircle, CheckCircle, Loader, Eye, Trash2 } from 'lucide-react';

export default function DocumentApp() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    setIsProcessing(true);
    setUploadStatus(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        const newDoc = {
          id: data.document_id,
          filename: data.filename,
          uploadDate: new Date().toLocaleDateString(),
          size: (data.file_size / 1024).toFixed(2),
          status: 'processed',
          pages: data.pages,
          extractedText: `Document: ${data.filename}\nPages: ${data.pages}\nFile Size: ${(data.file_size / 1024).toFixed(2)} KB`,
          keywords: data.keywords
        };
        
        setDocuments(prev => [...prev, newDoc]);
      }
      
      setUploadStatus({ type: 'success', message: `${files.length} document(s) uploaded and processed successfully!` });
    } catch (error) {
      setUploadStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        if (selectedDoc?.id === id) setSelectedDoc(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleViewDoc = (doc) => {
    setSelectedDoc(doc);
    setActiveTab('viewer');
  };

  const handleDownload = (doc) => {
    const element = document.createElement('a');
    const file = new Blob([doc.extractedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${doc.filename.split('.')[0]}_extracted.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid #334155',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FileText style={{ width: '32px', height: '32px', color: '#60a5fa' }} />
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>DocuSearch</h1>
          </div>
          <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>Document Digitization & Search Engine</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {['upload', 'search', 'viewer'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab ? '#2563eb' : 'rgba(71, 85, 105, 0.5)',
                color: activeTab === tab ? 'white' : '#cbd5e1',
                transition: 'all 0.2s'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #64748b',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(55, 65, 81, 0.2)',
                marginBottom: '24px',
                transition: 'all 0.2s'
              }}
            >
              <Upload style={{ width: '48px', height: '48px', color: '#60a5fa', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: '0 0 8px 0' }}>Upload Documents</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>Drag and drop or click to select PDF, JPG, PNG, TIFF files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {uploadStatus && (
              <div style={{
                background: uploadStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: uploadStatus.type === 'success' ? '#86efac' : '#fca5a5',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '14px',
                border: uploadStatus.type === 'success' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {uploadStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {uploadStatus.message}
              </div>
            )}

            {isProcessing && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', background: 'rgba(55, 65, 81, 0.3)', borderRadius: '8px', color: '#cbd5e1' }}>
                <Loader style={{ width: '20px', height: '20px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                <span>Processing documents...</span>
              </div>
            )}

            {/* Documents List */}
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>Uploaded Documents ({documents.length})</h3>
              {documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No documents uploaded yet</div>
              ) : (
                <div>
                  {documents.map(doc => (
                    <div key={doc.id} style={{ background: 'rgba(71, 85, 105, 0.4)', padding: '16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: '600', color: 'white', margin: '0 0 8px 0' }}>{doc.filename}</h4>
                        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px 0' }}>{doc.pages} pages • {doc.size} KB • {doc.uploadDate}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {doc.keywords.slice(0, 3).map((kw, i) => (
                            <span key={i} style={{ background: 'rgba(37, 99, 235, 0.3)', color: '#93c5fd', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleViewDoc(doc)} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Eye size={20} /></button>
                        <button onClick={() => handleDownload(doc)} style={{ padding: '8px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><DownloadCloud size={20} /></button>
                        <button onClick={() => handleDelete(doc.id)} style={{ padding: '8px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Search documents by keyword, filename, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, padding: '12px 16px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: 'white', fontSize: '16px' }}
              />
              <button onClick={handleSearch} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={20} /> Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>Results ({searchResults.length})</h3>
                <div>
                  {searchResults.map(doc => (
                    <div key={doc.id} style={{ background: 'rgba(71, 85, 105, 0.4)', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                      <h4 style={{ fontWeight: '600', color: 'white', margin: '0 0 8px 0' }}>{doc.filename}</h4>
                      <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px 0' }}>Relevance: {doc.relevance?.toFixed(2)}</p>
                      <button onClick={() => handleViewDoc(doc)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>View Document</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No results found for "{searchQuery}"</div>
            )}
          </div>
        )}

        {/* Viewer Tab */}
        {activeTab === 'viewer' && (
          <div>
            {selectedDoc ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ background: 'rgba(71, 85, 105, 0.4)', padding: '24px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>Document Info</h3>
                  <div style={{ fontSize: '14px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#94a3b8', margin: 0 }}>Filename</p>
                      <p style={{ color: 'white', fontWeight: '500', margin: '4px 0 0 0' }}>{selectedDoc.filename}</p>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#94a3b8', margin: 0 }}>Pages</p>
                      <p style={{ color: 'white', fontWeight: '500', margin: '4px 0 0 0' }}>{selectedDoc.pages}</p>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#94a3b8', margin: 0 }}>Upload Date</p>
                      <p style={{ color: 'white', fontWeight: '500', margin: '4px 0 0 0' }}>{selectedDoc.uploadDate}</p>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#94a3b8', margin: 0 }}>File Size</p>
                      <p style={{ color: 'white', fontWeight: '500', margin: '4px 0 0 0' }}>{selectedDoc.size} KB</p>
                    </div>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 8px 0' }}>Keywords</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedDoc.keywords.map((kw, i) => (
                          <span key={i} style={{ background: 'rgba(37, 99, 235, 0.3)', color: '#93c5fd', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => handleDownload(selectedDoc)} style={{ width: '100%', marginTop: '16px', padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <DownloadCloud size={16} /> Download Text
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(71, 85, 105, 0.4)', padding: '24px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>Extracted Text</h3>
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', height: '396px', overflowY: 'auto', color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {selectedDoc.extractedText}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                Select a document from the Upload tab to view details
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
