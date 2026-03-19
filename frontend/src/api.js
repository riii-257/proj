const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const SKIP  = { "ngrok-skip-browser-warning": "true" };

const getToken = () => localStorage.getItem("ds_token");

const authHeaders = () => ({
  ...SKIP,
  "Authorization": `Bearer ${getToken()}`,
});

const api = {
  // ── AUTH ────────────────────────────────────────────────────────
  async register(name, email, password) {
    const r = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { ...SKIP, "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return r.json();
  },

  async login(email, password) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { ...SKIP, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },

  async getMe() {
    const r = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
    return r.json();
  },

  // ── DOCUMENTS ───────────────────────────────────────────────────
  async uploadDocument(file, onProgress) {
    const form = new FormData();
    form.append("file", file);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/upload`);
      xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
      xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload  = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(form);
    });
  },

  async search(query, page = 1, perPage = 10) {
    const r = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`, { headers: authHeaders() });
    return r.json();
  },

  async listDocuments(page = 1, perPage = 12) {
    const r = await fetch(`${BASE}/documents?page=${page}&per_page=${perPage}`, { headers: authHeaders() });
    return r.json();
  },

  async getDocument(docId) {
    const r = await fetch(`${BASE}/documents/${docId}`, { headers: authHeaders() });
    return r.json();
  },

  async getDocumentText(docId) {
    const r = await fetch(`${BASE}/documents/${docId}/text`, { headers: authHeaders() });
    return r.json();
  },

  async getDocumentFile(docId) {
    const r = await fetch(`${BASE}/documents/${docId}/file`, { headers: authHeaders() });
    return r.json();
  },

  async deleteDocument(docId) {
    const r = await fetch(`${BASE}/documents/${docId}`, { method: "DELETE", headers: authHeaders() });
    return r.json();
  },

  async getStats() {
    const r = await fetch(`${BASE}/stats`, { headers: authHeaders() });
    return r.json();
  },
};

export default api;
