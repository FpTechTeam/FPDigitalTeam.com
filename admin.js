// admin.js — FP Digital Admin Console (v1 advanced UI)
// Requires these endpoints:
//   GET  /api/admin/applications?status=&q=   (returns array)
//   GET  /api/admin/projects                  (returns array)
//   POST /api/admin/projects                  (create)
//   PATCH/DELETE /api/admin/projects?id=...   (update/delete)
// NOTE: For application status/notes updates, you'll want a PATCH endpoint per application.
// If you don't have that yet, the UI will still view apps, and show update buttons with a helpful toast.

(function () {
  // -------- DOM --------
  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const views = {
    applications: document.getElementById("view-applications"),
    projects: document.getElementById("view-projects"),
    analytics: document.getElementById("view-analytics"),
  };
  const viewTitle = document.getElementById("viewTitle");
  const viewSub = document.getElementById("viewSub");

  const toast = document.getElementById("toast");
  const apiHealth = document.getElementById("apiHealth");

  // Apps UI
  const appSearch = document.getElementById("appSearch");
  const appStatus = document.getElementById("appStatus");
  const appLimit = document.getElementById("appLimit");
  const appSort = document.getElementById("appSort");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const loadAppsBtn = document.getElementById("loadAppsBtn");
  const exportBtn = document.getElementById("exportBtn");
  const refreshBtn = document.getElementById("refreshBtn");

  const appsTbody = document.getElementById("appsTbody");
  const newCount = document.getElementById("newCount");

  // Drawer
  const appDrawer = document.getElementById("appDrawer");
  const drawerCloseBtn = document.getElementById("drawerCloseBtn");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerSub = document.getElementById("drawerSub");
  const drawerBody = document.getElementById("drawerBody");
  const drawerStatus = document.getElementById("drawerStatus");
  const saveNotesBtn = document.getElementById("saveNotesBtn");
  const saveStatusBtn = document.getElementById("saveStatusBtn");
  const drawerMsg = document.getElementById("drawerMsg");

  // Projects UI
  const loadProjectsBtn = document.getElementById("loadProjectsBtn");
  const newProjectBtn = document.getElementById("newProjectBtn");
  const projectsList = document.getElementById("projectsList");

  const deleteProjectBtn = document.getElementById("deleteProjectBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");

  const pTitle = document.getElementById("pTitle");
  const pSubtitle = document.getElementById("pSubtitle");
  const pCategory = document.getElementById("pCategory");
  const pTags = document.getElementById("pTags");
  const pCtaLabel = document.getElementById("pCtaLabel");
  const pCtaUrl = document.getElementById("pCtaUrl");
  const pImageUrl = document.getElementById("pImageUrl");
  const pSort = document.getElementById("pSort");
  const pPublished = document.getElementById("pPublished");
  const pDesc = document.getElementById("pDesc");
  const mdPreview = document.getElementById("mdPreview");
  const projMsg = document.getElementById("projMsg");
  const projEditorTitle = document.getElementById("projEditorTitle");
  const projEditorSub = document.getElementById("projEditorSub");

  // Analytics UI
  const loadAnalyticsBtn = document.getElementById("loadAnalyticsBtn");
  const kpiApps = document.getElementById("kpiApps");
  const kpiNew = document.getElementById("kpiNew");
  const kpiPublished = document.getElementById("kpiPublished");
  const kpiDrafts = document.getElementById("kpiDrafts");

  // -------- State --------
  let applications = [];
  let selectedApp = null;

  let projects = [];
  let selectedProject = null;

  // -------- Utils --------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function badge(status) {
    const s = (status || "new").toLowerCase();
    return `<span class="badge ${esc(s)}">${esc(s)}</span>`;
  }

  function safeJson(s, fallback) {
    try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  }

  function toCSV(rows, headers) {
    const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCell).join(","),
      ...rows.map(r => headers.map(h => escapeCell(r[h])).join(",")),
    ];
    return lines.join("\n");
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Tiny markdown render (safe subset)
  function renderMarkdown(md) {
    const raw = String(md ?? "");
    const safe = esc(raw);

    // Links: [text](url)
    let html = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);

    // Bold/italic
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Headings
    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    // Lists (- item)
    html = html.replace(/(?:^|\n)-(.*)(?=\n|$)/g, (m) => m);
    // Convert list blocks
    html = html.replace(/(^|\n)(-(?:.*\n?)+)/g, (_, lead, block) => {
      const items = block.trim().split("\n").map(l => l.replace(/^-/, "").trim());
      return `${lead}<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
    });

    // Paragraphs
    html = html
      .split(/\n{2,}/)
      .map(chunk => {
        if (chunk.trim().startsWith("<h") || chunk.trim().startsWith("<ul")) return chunk;
        return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");

    return html;
  }

  // -------- Navigation --------
  function setView(viewKey) {
    Object.values(views).forEach(v => v.classList.remove("active"));
    views[viewKey].classList.add("active");

    navItems.forEach(n => n.classList.remove("active"));
    navItems.find(n => n.dataset.view === viewKey)?.classList.add("active");

    if (viewKey === "applications") {
      viewTitle.textContent = "Applications";
      viewSub.textContent = "Inbox view, internal notes, and status pipeline.";
      exportBtn.style.display = "";
    } else if (viewKey === "projects") {
      viewTitle.textContent = "Projects CMS";
      viewSub.textContent = "Edit projects without redeploying your site.";
      exportBtn.style.display = "none";
    } else {
      viewTitle.textContent = "Analytics";
      viewSub.textContent = "Quick health metrics (v1).";
      exportBtn.style.display = "none";
    }
  }

  navItems.forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  // -------- API --------
  async function apiGet(url) {
    const res = await fetch(url, { headers: { "accept": "application/json" }});
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  }

  async function apiSend(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
    return res.json().catch(() => ({}));
  }

  async function checkHealth() {
    try {
      // If you can read admin endpoints, Access is letting you in.
      await apiGet("/api/admin/projects");
      apiHealth.textContent = "Connected ✅";
    } catch (e) {
      apiHealth.textContent = "Blocked / Error";
    }
  }

  // -------- Applications --------
  function normalizeApps(raw) {
    return raw.map(a => ({
      ...a,
      areas: Array.isArray(a.areas) ? a.areas : safeJson(a.areas_json, []),
      created_short: (a.created_at || "").slice(0, 10),
      status: (a.status || "new").toLowerCase(),
    }));
  }

  function sortApps(list) {
    const mode = appSort.value;
    const copy = [...list];

    if (mode === "created_asc") {
      copy.sort((x,y) => String(x.created_at).localeCompare(String(y.created_at)));
    } else if (mode === "status") {
      const order = { new: 0, reviewing: 1, contacted: 2, rejected: 3 };
      copy.sort((x,y) => (order[x.status] ?? 9) - (order[y.status] ?? 9));
    } else {
      copy.sort((x,y) => String(y.created_at).localeCompare(String(x.created_at)));
    }
    return copy;
  }

  function renderAppsTable() {
    if (!applications.length) {
      appsTbody.innerHTML = `<tr><td colspan="5" class="muted">No applications found.</td></tr>`;
      newCount.textContent = "0";
      return;
    }

    const newCt = applications.filter(a => a.status === "new").length;
    newCount.textContent = String(newCt);

    const rows = applications.map(a => `
      <tr data-app-id="${esc(a.id)}">
        <td>${esc(a.created_short)}</td>
        <td>
          <div style="font-weight:900">${esc(a.name)}</div>
          <div class="muted tiny">${esc(a.email)}</div>
        </td>
        <td>${esc(a.type || "")}</td>
        <td>${esc(a.organization || "")}</td>
        <td>${badge(a.status)}</td>
      </tr>
    `).join("");

    appsTbody.innerHTML = rows;

    appsTbody.querySelectorAll("tr[data-app-id]").forEach(tr => {
      tr.addEventListener("click", () => {
        const id = tr.getAttribute("data-app-id");
        const app = applications.find(x => x.id === id);
        if (app) openDrawer(app);
      });
    });
  }

  async function loadApplications() {
    const q = appSearch.value.trim();
    const status = appStatus.value.trim();
    const limit = Number(appLimit.value || 100);

    const url = new URL("/api/admin/applications", location.origin);
    if (q) url.searchParams.set("q", q);
    if (status) url.searchParams.set("status", status);

    try {
      showToast("Loading applications…");
      const raw = await apiGet(url.toString().replace(location.origin, ""));
      applications = sortApps(normalizeApps(raw)).slice(0, limit);
      renderAppsTable();
      showToast("Applications loaded ✅");
    } catch (e) {
      appsTbody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load. Check Cloudflare Access + API.</td></tr>`;
      showToast("Load failed");
    }
  }

  function openDrawer(app) {
    selectedApp = app;
    appDrawer.classList.add("open");
    appDrawer.setAttribute("aria-hidden", "false");
    drawerTitle.textContent = app.name || "Application";
    drawerSub.textContent = `${app.email || ""} • ${app.created_short || ""}`;
    drawerStatus.value = app.status || "new";
    drawerMsg.textContent = "";

    const areas = (app.areas || []).map(x => `<span class="badge">${esc(x)}</span>`).join(" ");

    drawerBody.innerHTML = `
      <div class="kv">
        <div class="row"><div class="k">Type</div><div class="v">${esc(app.type || "")}</div></div>
        <div class="row"><div class="k">Org</div><div class="v">${esc(app.organization || "")}</div></div>
        <div class="row"><div class="k">Role</div><div class="v">${esc(app.role || "")}</div></div>
        <div class="row"><div class="k">Phone</div><div class="v">${esc(app.phone || "")}</div></div>
        <div class="row"><div class="k">LinkedIn</div><div class="v">${app.linkedin ? `<a href="${esc(app.linkedin)}" target="_blank" rel="noopener">${esc(app.linkedin)}</a>` : ""}</div></div>
        <div class="row"><div class="k">Portfolio</div><div class="v">${app.portfolio ? `<a href="${esc(app.portfolio)}" target="_blank" rel="noopener">${esc(app.portfolio)}</a>` : ""}</div></div>
        <div class="row"><div class="k">Areas</div><div class="v">${areas || "<span class='muted'>—</span>"}</div></div>
        <div class="row"><div class="k">Why</div><div class="v">${esc(app.why || "")}</div></div>
        <div class="row"><div class="k">Grant</div><div class="v">${esc(app.grant || "")}</div></div>
        <div class="row"><div class="k">Resources</div><div class="v">${esc(app.resources || "")}</div></div>
        <div class="row"><div class="k">Timeline</div><div class="v">${esc(app.timeline || "")}</div></div>
        <div class="row"><div class="k">Budget</div><div class="v">${esc(app.budget || "")}</div></div>
        <div class="row"><div class="k">Notes</div><div class="v">${esc(app.notes || "")}</div></div>
      </div>

      <div style="margin-top:12px" class="field">
        <label>Internal notes (private)</label>
        <textarea id="internalNotes" rows="6" placeholder="Your internal notes...">${esc(app.internal_notes || "")}</textarea>
      </div>
    `;
  }

  function closeDrawer() {
    appDrawer.classList.remove("open");
    appDrawer.setAttribute("aria-hidden", "true");
    selectedApp = null;
  }

  drawerCloseBtn.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  clearFiltersBtn.addEventListener("click", () => {
    appSearch.value = "";
    appStatus.value = "";
    appLimit.value = "100";
    appSort.value = "created_desc";
  });

  loadAppsBtn.addEventListener("click", loadApplications);

  exportBtn.addEventListener("click", () => {
    if (!applications.length) return showToast("No applications to export.");
    const headers = ["created_at","name","email","organization","role","type","status","linkedin","portfolio"];
    const csv = toCSV(applications, headers);
    download(`fp_applications_${new Date().toISOString().slice(0,10)}.csv`, csv);
    showToast("Exported CSV ✅");
  });

  refreshBtn.addEventListener("click", async () => {
    const active = document.querySelector(".nav-item.active")?.dataset.view || "applications";
    if (active === "applications") return loadApplications();
    if (active === "projects") return loadProjects();
    if (active === "analytics") return loadAnalytics();
  });

  // These require an application PATCH endpoint (not included earlier).
  // If you want, I’ll generate: /functions/api/admin/application.js with PATCH by id.
  saveNotesBtn.addEventListener("click", async () => {
    showToast("Notes update requires a PATCH endpoint.");
    drawerMsg.textContent = "Add admin PATCH for applications to save notes/status (I can generate it).";
  });

  saveStatusBtn.addEventListener("click", async () => {
    showToast("Status update requires a PATCH endpoint.");
    drawerMsg.textContent = "Add admin PATCH for applications to save notes/status (I can generate it).";
  });

  // -------- Projects --------
  function normalizeProjects(raw) {
    return raw.map(p => ({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : safeJson(p.tags_json, []),
      is_published: !!p.is_published,
    }));
  }

  function renderProjectsList() {
    if (!projects.length) {
      projectsList.innerHTML = `<div class="muted">No projects found.</div>`;
      return;
    }

    projectsList.innerHTML = projects.map(p => `
      <div class="item ${selectedProject?.id === p.id ? "active" : ""}" data-id="${esc(p.id)}">
        <div class="item-top">
          <div>
            <div class="item-title">${esc(p.title)}</div>
            <div class="item-sub">${esc(p.subtitle || "")}</div>
          </div>
          <div style="display:grid;gap:8px;justify-items:end">
            ${p.is_published ? `<span class="badge contacted">published</span>` : `<span class="badge rejected">draft</span>`}
            <span class="badge">sort: ${esc(p.sort_order)}</span>
          </div>
        </div>
      </div>
    `).join("");

    projectsList.querySelectorAll(".item").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        const p = projects.find(x => x.id === id);
        if (p) selectProject(p);
      });
    });
  }

  function setProjectEditorEnabled(enabled) {
    saveProjectBtn.disabled = !enabled;
    deleteProjectBtn.disabled = !enabled;
  }

  function clearEditor() {
    selectedProject = null;
    pTitle.value = "";
    pSubtitle.value = "";
    pCategory.value = "";
    pTags.value = "";
    pCtaLabel.value = "";
    pCtaUrl.value = "";
    pImageUrl.value = "";
    pSort.value = "0";
    pPublished.checked = false;
    pDesc.value = "";
    mdPreview.innerHTML = `<div class="muted">Preview will appear here.</div>`;
    projMsg.textContent = "";
    projEditorTitle.textContent = "Project Editor";
    projEditorSub.textContent = "Select a project to edit.";
    setProjectEditorEnabled(false);
  }

  function selectProject(p) {
    selectedProject = p;
    projEditorTitle.textContent = "Project Editor";
    projEditorSub.textContent = `Editing: ${p.title}`;
    setProjectEditorEnabled(true);

    pTitle.value = p.title || "";
    pSubtitle.value = p.subtitle || "";
    pCategory.value = p.category || "";
    pTags.value = (p.tags || []).join(", ");
    pCtaLabel.value = p.cta_label || "";
    pCtaUrl.value = p.cta_url || "";
    pImageUrl.value = p.image_url || "";
    pSort.value = String(p.sort_order ?? 0);
    pPublished.checked = !!p.is_published;
    pDesc.value = p.description_md || "";

    mdPreview.innerHTML = renderMarkdown(pDesc.value);
    projMsg.textContent = "";
    renderProjectsList();
  }

  function editorPayload() {
    return {
      title: pTitle.value.trim(),
      subtitle: pSubtitle.value.trim() || null,
      category: pCategory.value.trim() || null,
      tags: pTags.value.split(",").map(s => s.trim()).filter(Boolean),
      cta_label: pCtaLabel.value.trim() || null,
      cta_url: pCtaUrl.value.trim() || null,
      image_url: pImageUrl.value.trim() || null,
      sort_order: Number(pSort.value || 0),
      is_published: !!pPublished.checked,
      description_md: pDesc.value.trim() || null,
    };
  }

  pDesc.addEventListener("input", () => {
    mdPreview.innerHTML = renderMarkdown(pDesc.value);
  });

  async function loadProjects() {
    try {
      showToast("Loading projects…");
      const raw = await apiGet("/api/admin/projects");
      projects = normalizeProjects(raw);
      // Keep a stable order: published first then sort then updated
      projects.sort((a,b) => (b.is_published - a.is_published) || (a.sort_order - b.sort_order));
      renderProjectsList();
      showToast("Projects loaded ✅");
    } catch (e) {
      projectsList.innerHTML = `<div class="muted">Failed to load projects. Check Access + API.</div>`;
      showToast("Load failed");
    }
  }

  loadProjectsBtn.addEventListener("click", loadProjects);

  newProjectBtn.addEventListener("click", () => {
    selectedProject = null;
    setProjectEditorEnabled(true);
    projEditorTitle.textContent = "Project Editor";
    projEditorSub.textContent = "Creating new project (not saved yet).";
    pTitle.value = "";
    pSubtitle.value = "";
    pCategory.value = "";
    pTags.value = "";
    pCtaLabel.value = "";
    pCtaUrl.value = "";
    pImageUrl.value = "";
    pSort.value = "0";
    pPublished.checked = false;
    pDesc.value = "";
    mdPreview.innerHTML = `<div class="muted">Preview will appear here.</div>`;
    projMsg.textContent = "Fill fields then click Save to create.";
  });

  saveProjectBtn.addEventListener("click", async () => {
    const payload = editorPayload();
    if (!payload.title) return showToast("Title is required.");

    try {
      if (!selectedProject?.id) {
        const res = await apiSend("/api/admin/projects", "POST", payload);
        showToast("Created ✅");
        projMsg.textContent = "Project created.";
        await loadProjects();
        const created = projects.find(p => p.id === res.id) || projects[0];
        if (created) selectProject(created);
      } else {
        await apiSend(`/api/admin/projects?id=${encodeURIComponent(selectedProject.id)}`, "PATCH", payload);
        showToast("Saved ✅");
        projMsg.textContent = "Project saved.";
        await loadProjects();
        const updated = projects.find(p => p.id === selectedProject.id);
        if (updated) selectProject(updated);
      }
    } catch (e) {
      showToast("Save failed");
      projMsg.textContent = "Save failed. Check API + console.";
    }
  });

  deleteProjectBtn.addEventListener("click", async () => {
    if (!selectedProject?.id) return;
    if (!confirm(`Delete "${selectedProject.title}"? This cannot be undone.`)) return;

    try {
      await fetch(`/api/admin/projects?id=${encodeURIComponent(selectedProject.id)}`, { method: "DELETE" });
      showToast("Deleted ✅");
      clearEditor();
      await loadProjects();
    } catch (e) {
      showToast("Delete failed");
    }
  });

  // -------- Analytics --------
  async function loadAnalytics() {
    try {
      // Simple v1 analytics derived from existing calls
      const [appsRaw, projRaw] = await Promise.all([
        apiGet("/api/admin/applications"),
        apiGet("/api/admin/projects"),
      ]);

      const apps = normalizeApps(appsRaw);
      const projs = normalizeProjects(projRaw);

      kpiApps.textContent = String(apps.length);
      kpiNew.textContent = String(apps.filter(a => a.status === "new").length);
      kpiPublished.textContent = String(projs.filter(p => p.is_published).length);
      kpiDrafts.textContent = String(projs.filter(p => !p.is_published).length);

      showToast("Analytics loaded ✅");
    } catch {
      showToast("Analytics failed");
    }
  }

  loadAnalyticsBtn.addEventListener("click", loadAnalytics);

  // -------- Init --------
  (async function init() {
    setView("applications");
    await checkHealth();
    await loadApplications();
  })();
})();