import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "./api";
import AuthPage from "./AuthPage";
import "./App.css";

// ── ICONS ─────────────────────────────────────────────────────────
const Icon = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  File:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Trash:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Eye:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  X:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Docs:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Stats:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  User:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Up:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  Down:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

const FILE_COLORS = { pdf:"#e74c3c", docx:"#2980b9", pptx:"#e67e22", png:"#27ae60", jpg:"#27ae60", jpeg:"#27ae60", txt:"#8e44ad", default:"#7f8c8d" };
const fileColor = (t) => FILE_COLORS[t] || FILE_COLORS.default;
const fmtSize   = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const fmtDate   = (s) => s ? new Date(s).toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"}) : "";

// ── UPLOAD AREA ───────────────────────────────────────────────────
function UploadArea({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles]       = useState([]);
  const [uploading, setUploading] = useState(false);

  const processFiles = (fileList) => {
    const valid = Array.from(fileList).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["pdf","png","jpg","jpeg","bmp","tiff","webp","docx","pptx","txt"].includes(ext);
    });
    setFiles(prev => [...prev, ...valid.map(f => ({file:f, progress:0, status:"pending", id:Math.random()}))]);
  };

  const uploadAll = async () => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status !== "pending") continue;
      try {
        const res = await api.uploadDocument(item.file, (p) =>
          setFiles(prev => prev.map((f,j) => j===i ? {...f, progress:p} : f))
        );
        setFiles(prev => prev.map((f,j) => j===i ? {...f, status:res.error?"error":"done", progress:100, message:res.message||res.error} : f));
        if (!res.error) onUploadComplete && onUploadComplete();
      } catch(e) {
        setFiles(prev => prev.map((f,j) => j===i ? {...f, status:"error", message:e.message} : f));
      }
    }
    setUploading(false);
  };

  return (
    <div className="upload-area">
      <div className={`drop-zone ${dragging?"drag-over":""}`}
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);processFiles(e.dataTransfer.files)}}
        onClick={()=>document.getElementById("file-input").click()}
      >
        <div className="drop-icon"><Icon.Upload /></div>
        <p className="drop-title">Drop files here or <span>browse</span></p>
        <p className="drop-sub">PDF, PNG, JPG, DOCX, PPTX, TXT — any scanned document</p>
        <input id="file-input" type="file" multiple
          accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.webp,.docx,.pptx,.txt"
          style={{display:"none"}} onChange={e=>processFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="upload-list">
          {files.map((item,i) => (
            <div key={item.id} className={`upload-item ${item.status}`}>
              <div className="upload-item-info">
                <span className="badge" style={{background:fileColor(item.file.name.split(".").pop())}}>
                  {item.file.name.split(".").pop().toUpperCase()}
                </span>
                <span className="upload-name">{item.file.name}</span>
                <span className="upload-size">{fmtSize(item.file.size)}</span>
              </div>
              {item.status==="pending" && <div className="progress-bar"><div style={{width:`${item.progress}%`}}/></div>}
              {item.status==="done"    && <span className="status-ok">✓ Indexed</span>}
              {item.status==="error"   && <span className="status-err">✗ {item.message}</span>}
              <button className="btn-icon" onClick={()=>setFiles(prev=>prev.filter((_,j)=>j!==i))}><Icon.X /></button>
            </div>
          ))}
          <div className="upload-actions">
            <button className="btn-ghost" onClick={()=>setFiles([])}>Clear all</button>
            <button className="btn-primary" onClick={uploadAll} disabled={uploading||files.every(f=>f.status!=="pending")}>
              {uploading ? "Uploading…" : `Upload ${files.filter(f=>f.status==="pending").length} file(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GLOBAL SEARCH BAR ─────────────────────────────────────────────
function SearchBar({ onSearch, loading }) {
  const [q, setQ] = useState("");
  const submit = (e) => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); };
  return (
    <form className="search-bar" onSubmit={submit}>
      <div className="search-input-wrap">
        <span className="search-icon"><Icon.Search /></span>
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search document contents, keywords, phrases…" className="search-input"/>
        {q && <button type="button" className="clear-search" onClick={()=>{setQ("");onSearch("");}}><Icon.X /></button>}
      </div>
      <button type="submit" className="btn-primary" disabled={loading||!q.trim()}>
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

// ── DOC CARD ──────────────────────────────────────────────────────
function DocCard({ doc, highlight, onView, onDelete }) {
  const ext = doc.file_type || doc.filename?.split(".").pop() || "file";
  const hl  = (text) => {
    if (!highlight || !text) return text;
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
    return text.split(re).map((p,i) => re.test(p) ? <mark key={i}>{p}</mark> : p);
  };
  return (
    <div className="doc-card">
      <div className="doc-card-header">
        <div className="doc-type-badge" style={{background:fileColor(ext)}}>{ext.toUpperCase()}</div>
        <div className="doc-card-actions">
          <button className="btn-icon" title="View text" onClick={()=>onView(doc)}><Icon.Eye /></button>
          <button className="btn-icon danger" title="Delete" onClick={()=>onDelete(doc)}><Icon.Trash /></button>
        </div>
      </div>
      <div className="doc-card-body">
        <h3 className="doc-name" title={doc.filename}>{hl(doc.filename)}</h3>
        {doc.snippet && <p className="doc-snippet">{hl(doc.snippet)}</p>}
        <div className="doc-meta">
          <span><Icon.File />{doc.word_count?.toLocaleString()||0} words</span>
          {doc.file_size && <span>{fmtSize(doc.file_size)}</span>}
          <span>{fmtDate(doc.uploaded_at)}</span>
        </div>
        {doc.keywords && (
          <div className="doc-keywords">
            {doc.keywords.slice(0,6).map(k=><span key={k} className="kw-chip">{k}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TEXT MODAL WITH IN-DOCUMENT SEARCH + ORIGINAL FILE VIEW ─────
function TextModal({ doc, globalQuery, onClose }) {
  const [text, setText]           = useState("");
  const [loading, setLoading]     = useState(true);
  const [docSearch, setDocSearch] = useState("");
  const [matchIdx, setMatchIdx]   = useState(0);
  const [matches, setMatches]     = useState([]);
  const [view, setView]           = useState("text"); // "text" | "file"
  const [fileData, setFileData]   = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const textRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getDocumentText(doc.doc_id||doc._id).then(r => {
      setText(r.text || "");
      setLoading(false);
    });
  }, [doc]);

  const loadFile = async () => {
    if (fileData) { setView("file"); return; }

    // Check token exists before attempting fetch
    const token = localStorage.getItem("ds_token");
    if (!token) {
      alert("Session expired — please log out and log back in.");
      return;
    }

    setFileLoading(true);
    setView("file");
    try {
      const r = await api.getDocumentFile(doc.doc_id||doc._id);
      if (r.error) {
        console.error("File fetch error:", r.error);
        setFileData({ error: r.error });
      } else {
        setFileData(r);
      }
    } catch(e) {
      console.error("File fetch failed:", e);
      setFileData({ error: "Could not load file. Check the backend is running." });
    }
    setFileLoading(false);
  };

  const ext = (doc.file_type || doc.filename?.split(".").pop() || "").toLowerCase();
  const isImage = ["png","jpg","jpeg","bmp","tiff","webp"].includes(ext);
  const isPdf   = ext === "pdf";

  // Build match positions whenever docSearch or text changes
  useEffect(() => {
    if (!docSearch.trim() || !text) { setMatches([]); setMatchIdx(0); return; }
    const re = new RegExp(docSearch.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "gi");
    const found = [];
    let m;
    while ((m = re.exec(text)) !== null) found.push(m.index);
    setMatches(found);
    setMatchIdx(0);
  }, [docSearch, text]);

  // Scroll current match into view
  useEffect(() => {
    if (matches.length === 0 || !textRef.current) return;
    const marks = textRef.current.querySelectorAll("mark.doc-match");
    if (marks[matchIdx]) {
      marks[matchIdx].scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [matchIdx, matches]);

  const navigate = (dir) => {
    setMatchIdx(i => (i + dir + matches.length) % matches.length);
  };

  const renderText = () => {
    const query = docSearch.trim() || globalQuery;
    if (!query || !text) return <span>{text}</span>;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
    const parts = text.split(re);
    let count = 0;
    return parts.map((part, i) => {
      if (re.test(part)) {
        const isCurrent = docSearch.trim() && count === matchIdx;
        count++;
        return <mark key={i} className={`doc-match${isCurrent ? " current-match" : ""}`}>{part}</mark>;
      }
      return part;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2><Icon.Docs />{doc.filename}</h2>
          <button className="btn-icon" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-meta">
          <span className="badge" style={{background:fileColor(doc.file_type)}}>{doc.file_type?.toUpperCase()}</span>
          <span>{doc.word_count?.toLocaleString()} words</span>
          <span>{fmtDate(doc.uploaded_at)}</span>
        </div>

        {/* ── VIEW TABS ── */}
        <div className="modal-tabs">
          <button className={`modal-tab ${view==="text"?"active":""}`} onClick={() => setView("text")}>
            <Icon.Docs /> Extracted Text
          </button>
          <button className={`modal-tab ${view==="file"?"active":""}`} onClick={loadFile}>
            <Icon.Eye /> Original File
          </button>
        </div>

        {/* ── IN-DOCUMENT SEARCH (only on text view) ── */}
        {view === "text" && (
          <div className="doc-search-bar">
            <div className="doc-search-input-wrap">
              <span className="search-icon"><Icon.Search /></span>
              <input
                ref={inputRef}
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") navigate(e.shiftKey ? -1 : 1);
                  if (e.key === "Escape") setDocSearch("");
                }}
                placeholder="Search within this document…"
                className="doc-search-input"
              />
              {docSearch && (
                <button className="clear-search" onClick={() => setDocSearch("")}><Icon.X /></button>
              )}
            </div>
            {docSearch.trim() && (
              <div className="doc-search-nav">
                <span className="match-count">
                  {matches.length === 0 ? "No matches" : `${matchIdx + 1} / ${matches.length}`}
                </span>
                <button className="btn-icon" onClick={() => navigate(-1)} disabled={matches.length === 0} title="Previous"><Icon.Up /></button>
                <button className="btn-icon" onClick={() => navigate(1)}  disabled={matches.length === 0} title="Next"><Icon.Down /></button>
              </div>
            )}
          </div>
        )}

        <div className="modal-body">
          {view === "text" ? (
            loading
              ? <div className="spinner"/>
              : <pre ref={textRef} className="extracted-text">{renderText()}</pre>
          ) : (
            fileLoading
              ? <div className="spinner"/>
              : fileData?.file_data
                ? isImage
                  ? <div className="file-preview-wrap">
                      <img
                        src={`data:image/${ext};base64,${fileData.file_data}`}
                        alt={doc.filename}
                        className="file-preview-img"
                      />
                    </div>
                  : isPdf
                    ? <iframe
                        src={`data:application/pdf;base64,${fileData.file_data}`}
                        className="file-preview-pdf"
                        title={doc.filename}
                      />
                    : <div className="file-preview-unsupported">
                        <Icon.File />
                        <p>Preview not available for <strong>.{ext}</strong> files.</p>
                        <p className="muted">Only images and PDFs can be previewed directly.</p>
                      </div>
                : <div className="file-preview-unsupported">
                    <Icon.File />
                    <p>{fileData?.error || "Original file not available."}</p>
                  </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────────
function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-panel">
      <div className="stat-card"><span className="stat-num">{stats.total_documents}</span><span className="stat-label">Documents</span></div>
      <div className="stat-card"><span className="stat-num">{stats.total_words?.toLocaleString()}</span><span className="stat-label">Words Indexed</span></div>
      {Object.entries(stats.file_types||{}).map(([t,c])=>(
        <div key={t} className="stat-card" style={{borderTop:`3px solid ${fileColor(t)}`}}>
          <span className="stat-num">{c}</span><span className="stat-label">{t.toUpperCase()} files</span>
        </div>
      ))}
    </div>
  );
}

// ── LIBRARY TAB WITH FILENAME SEARCH ─────────────────────────────
function LibraryTab({ docs, onView, onDelete, onReload }) {
  const [filenameQuery, setFilenameQuery] = useState("");

  const filtered = filenameQuery.trim()
    ? docs.filter(d => d.filename.toLowerCase().includes(filenameQuery.toLowerCase()))
    : docs;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h1>Document Library</h1>
        <p>{docs.length} document{docs.length !== 1 ? "s" : ""} indexed</p>
      </div>

      {/* ── FILENAME SEARCH ── */}
      <div className="filename-search-wrap">
        <div className="search-input-wrap">
          <span className="search-icon"><Icon.Search /></span>
          <input
            value={filenameQuery}
            onChange={e => setFilenameQuery(e.target.value)}
            placeholder="Filter by filename…"
            className="search-input"
          />
          {filenameQuery && (
            <button className="clear-search" onClick={() => setFilenameQuery("")}><Icon.X /></button>
          )}
        </div>
        {filenameQuery.trim() && (
          <span className="filename-results">
            {filtered.length} of {docs.length} file{docs.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {docs.length === 0
        ? <div className="empty-state"><div className="empty-icon"><Icon.File /></div><h2>No documents yet</h2><p>Upload your first document to get started.</p></div>
        : filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon"><Icon.Search /></div><h2>No files match</h2><p>Try a different filename.</p></div>
          : <div className="card-grid">
              {filtered.map(doc =>
                <DocCard key={doc._id} doc={{...doc, doc_id:doc._id}}
                  highlight={filenameQuery}
                  onView={onView} onDelete={onDelete}/>
              )}
            </div>
      }
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("ds_user")); } catch { return null; }
  });
  const [tab, setTab]         = useState("search");
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [toast, setToast]     = useState(null);
  const [searchTotal, setSearchTotal] = useState(0);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const loadDocs  = useCallback(async () => { const r = await api.listDocuments(); setDocs(r.documents||[]); }, []);
  const loadStats = useCallback(async () => { const r = await api.getStats(); setStats(r); }, []);

  useEffect(() => { if (user) { loadDocs(); loadStats(); } }, [user, loadDocs, loadStats]);

  const handleLogout = () => {
    localStorage.removeItem("ds_token"); localStorage.removeItem("ds_user");
    setUser(null); setDocs([]); setStats(null); setResults([]);
  };

  const handleSearch = async (q) => {
    if (!q) { setResults([]); setQuery(""); return; }
    setQuery(q); setLoading(true);
    try {
      const r = await api.search(q);
      setResults(r.results||[]); setSearchTotal(r.total||0);
    } catch(e) { showToast("Search failed: "+e.message,"error"); }
    setLoading(false);
  };

  const handleDelete = async (doc) => {
    const id = doc.doc_id||doc._id;
    if (!window.confirm(`Delete "${doc.filename}"?`)) return;
    await api.deleteDocument(id);
    showToast("Document deleted");
    loadDocs(); loadStats();
    setResults(prev=>prev.filter(r=>r.doc_id!==id));
  };

  if (!user) return <AuthPage onAuth={u => { setUser(u); }} />;

  const NAV = [
    { id:"search",  icon:<Icon.Search />, label:"Search"    },
    { id:"upload",  icon:<Icon.Upload />, label:"Upload"    },
    { id:"library", icon:<Icon.Docs   />, label:"Library",  onSelect: loadDocs },
    { id:"stats",   icon:<Icon.Stats  />, label:"Analytics" },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon"><Icon.Docs /></span>
          <span className="logo-text">DocuSearch</span>
        </div>
        <nav className="nav">
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${tab===item.id?"active":""}`}
              onClick={()=>{ setTab(item.id); item.onSelect&&item.onSelect(); }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar"><Icon.User /></div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn-icon" title="Sign out" onClick={handleLogout}><Icon.Logout /></button>
        </div>
        {stats && (
          <div className="sidebar-stats">
            <div>{stats.total_documents}<span> docs</span></div>
            <div>{stats.total_words?.toLocaleString()}<span> words</span></div>
          </div>
        )}
      </aside>

      <main className="main">
        {tab==="search" && (
          <div className="tab-content">
            <div className="tab-header"><h1>Search Documents</h1><p>Full-text search across all your indexed documents</p></div>
            <SearchBar onSearch={handleSearch} loading={loading}/>
            {query && (
              <div className="results-header">
                {searchTotal>0
                  ? <span><strong>{searchTotal}</strong> result{searchTotal!==1?"s":""} for "<em>{query}</em>"</span>
                  : <span>No results for "<em>{query}</em>"</span>}
              </div>
            )}
            <div className="card-grid">
              {results.map(doc=><DocCard key={doc.doc_id} doc={doc} highlight={query} onView={setViewDoc} onDelete={handleDelete}/>)}
            </div>
            {!query && (
              <div className="empty-state">
                <div className="empty-icon"><Icon.Search /></div>
                <h2>Start searching</h2>
                <p>Type keywords, phrases, or document names to find what you need.</p>
              </div>
            )}
          </div>
        )}

        {tab==="upload" && (
          <div className="tab-content">
            <div className="tab-header"><h1>Upload Documents</h1><p>Upload scanned images, PDFs, or documents to extract and index their text</p></div>
            <UploadArea onUploadComplete={()=>{ loadDocs(); loadStats(); showToast("Indexed! Click Library to see it."); }}/>
          </div>
        )}

        {tab==="library" && (
          <LibraryTab docs={docs} onView={setViewDoc} onDelete={handleDelete} onReload={loadDocs}/>
        )}

        {tab==="stats" && (
          <div className="tab-content">
            <div className="tab-header"><h1>Analytics</h1><p>Overview of your document library</p></div>
            <StatsPanel stats={stats}/>
          </div>
        )}
      </main>

      {viewDoc && <TextModal doc={viewDoc} globalQuery={query} onClose={()=>setViewDoc(null)}/>}
      {toast   && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
