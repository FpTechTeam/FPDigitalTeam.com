(function () {
  // Top buttons
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const who = document.getElementById("who");

  // Lock + shell containers
  const shell = document.getElementById("shell");
  const locked = document.getElementById("locked");
  const lockedLoginBtn = document.getElementById("lockedLoginBtn");

  // Status cards
  const authStatus = document.getElementById("authStatus");
  const roleStatus = document.getElementById("roleStatus");
  const apiStatus = document.getElementById("apiStatus");

  // Tabs + panels
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = {
    home: document.getElementById("panel-home"),
    applications: document.getElementById("panel-applications"),
    projects: document.getElementById("panel-projects"),
    admin: document.getElementById("panel-admin"),
  };

  const adminTab = document.getElementById("adminTab");

  // Toast
  const toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  // Apps + projects UI
  const appsBody = document.getElementById("appsBody");
  const appsRefresh = document.getElementById("appsRefresh");
  const projectsList = document.getElementById("projectsList");
  const projectsRefresh = document.getElementById("projectsRefresh");

  // Admin UI
  const adminCheck = document.getElementById("adminCheck");
  const adminOut = document.getElementById("adminOut");
  const projectsJson = document.getElementById("projectsJson");
  const saveProjects = document.getElementById("saveProjects");
  const saveMsg = document.getElementById("saveMsg");

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function setPanel(name) {
    Object.values(panels).forEach(p => p?.classList.remove("active"));
    panels[name]?.classList.add("active");
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  }

  // ---- Netlify Identity helpers ----
  function getRoles(user) {
    const rolesA = user?.app_metadata?.roles;
    const rolesB = user?.user_metadata?.roles;
    const roles = Array.isArray(rolesA) ? rolesA : Array.isArray(rolesB) ? rolesB : [];
    return roles.map(r => String(r).toLowerCase());
  }

  function isAdmin(user) {
    return getRoles(user).includes("admin");
  }

  function waitForIdentity() {
    return new Promise((resolve) => {
      const tick = () => (window.netlifyIdentity ? resolve() : setTimeout(tick, 50));
      tick();
    });
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.error || `${res.status} ${url}`);
    return data;
  }

  // ---- Data loaders ----
  async function loadApplications() {
    if (!appsBody) return;
    appsBody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
    try {
      const data = await fetchJson("/.netlify/functions/applications-list");
      const items = data.items || [];

      appsBody.innerHTML = items.map(a => `
        <tr>
          <td>${esc((a.created_at || "").slice(0, 10))}</td>
          <td>${esc(a.name || "")}</td>
          <td>${esc(a.email || "")}</td>
          <td>${esc(a.type || "")}</td>
          <td>${esc(a.status || "")}</td>
        </tr>
      `).join("") || `<tr><td colspan="5" class="muted">No applications yet.</td></tr>`;
    } catch (e) {
      appsBody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load. (Login required)</td></tr>`;
      showToast("Applications failed");
    }
  }

  async function loadProjects() {
    if (!projectsList) return;
    projectsList.innerHTML = `<div class="muted">Loading…</div>`;
    try {
      const data = await fetchJson("/.netlify/functions/projects-get");
      const items = data.items || [];

      projectsList.innerHTML = items.map(p => `
        <div class="item">
          <div class="t">${esc(p.title || "")}</div>
          <div class="s">${esc(p.subtitle || "")}</div>
        </div>
      `).join("") || `<div class="muted">No projects found.</div>`;
    } catch (e) {
      projectsList.innerHTML = `<div class="muted">Failed to load. (Login required)</div>`;
      showToast("Projects failed");
    }
  }

  // ---- Admin actions (server-side enforced) ----
  async function verifyAdmin() {
    if (!adminOut) return;
    adminOut.textContent = "{}";
    try {
      const data = await fetchJson("/.netlify/functions/admin-check");
      adminOut.textContent = JSON.stringify(data, null, 2);
      showToast("Admin verified ✅");
    } catch (e) {
      adminOut.textContent = JSON.stringify({ ok: false, error: String(e.message || e) }, null, 2);
      showToast("Admin check failed");
    }
  }

  async function saveProjectsJson() {
    if (!saveMsg) return;
    saveMsg.textContent = "";
    try {
      const parsed = JSON.parse(projectsJson.value || "[]");

      const res = await fetch("/.netlify/functions/projects-update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: parsed })
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      saveMsg.textContent = "Saved ✅";
      showToast("Projects saved ✅");
      await loadProjects();
    } catch (e) {
      saveMsg.textContent = `Save failed: ${String(e.message || e)}`;
      showToast("Save failed");
    }
  }

  // ---- Strict login-first UI gate ----
  async function syncUi(user) {
    // LOCKED BY DEFAULT
    if (!user) {
      shell.style.display = "none";
      locked.style.display = "grid";

      who.textContent = "Not signed in";
      loginBtn.style.display = "";
      logoutBtn.style.display = "none";

      if (authStatus) authStatus.textContent = "Signed out";
      if (roleStatus) roleStatus.textContent = "—";
      if (apiStatus) apiStatus.textContent = "—";

      if (adminTab) adminTab.style.display = "none";
      setPanel("home");
      return;
    }

    // AUTHENTICATED
    shell.style.display = "";
    locked.style.display = "none";

    const roles = getRoles(user);
    const admin = isAdmin(user);

    who.textContent = `${user.email} (${roles.join(", ") || "employee"})`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    if (authStatus) authStatus.textContent = "Signed in ✅";
    if (roleStatus) roleStatus.textContent = roles.join(", ") || "employee";

    // admin-only tools
    if (adminTab) adminTab.style.display = admin ? "" : "none";

    // Server-side login check
    try {
      const data = await fetchJson("/.netlify/functions/whoami");
      if (apiStatus) apiStatus.textContent = data?.ok ? "Connected ✅" : "Error";
    } catch {
      if (apiStatus) apiStatus.textContent = "Error";
    }

    // If user tries admin tab without admin role, bounce to home
    const active = document.querySelector(".tab.active")?.dataset.tab;
    if (active === "admin" && !admin) setPanel("home");

    // load data allowed for all logged-in users
    await Promise.allSettled([loadApplications(), loadProjects()]);
  }

  // ---- Init ----
  async function init() {
    await waitForIdentity();

    // Buttons
    lockedLoginBtn?.addEventListener("click", () => window.netlifyIdentity.open());
    loginBtn?.addEventListener("click", () => window.netlifyIdentity.open());
    logoutBtn?.addEventListener("click", () => window.netlifyIdentity.logout());

    // Tab switching (block admin tab if not admin)
    tabs.forEach(t => {
      t.addEventListener("click", () => {
        const tab = t.dataset.tab;
        const user = window.netlifyIdentity.currentUser();

        if (!user) return; // should never happen because shell is hidden, but safe

        if (tab === "admin" && !isAdmin(user)) {
          showToast("Admin access required.");
          return;
        }
        setPanel(tab);
      });
    });

    // Refresh buttons
    appsRefresh?.addEventListener("click", loadApplications);
    projectsRefresh?.addEventListener("click", loadProjects);

    // Admin actions
    adminCheck?.addEventListener("click", verifyAdmin);
    saveProjects?.addEventListener("click", saveProjectsJson);

    // Identity events
    window.netlifyIdentity.on("init", syncUi);
    window.netlifyIdentity.on("login", (user) => {
      window.netlifyIdentity.close();
      syncUi(user);
      showToast("Logged in ✅");
    });
    window.netlifyIdentity.on("logout", () => {
      syncUi(null);
      showToast("Logged out");
    });

    window.netlifyIdentity.init();
  }

  init();
})();