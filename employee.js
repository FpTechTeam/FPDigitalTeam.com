(function () {
  const $ = (id) => document.getElementById(id);

  const shell = $("shell");
  const locked = $("locked");

  const who = $("who");
  const rolePill = $("rolePill");

  const loginBtn = $("loginBtn");
  const signupBtn = $("signupBtn");
  const logoutBtn = $("logoutBtn");
  const lockedLoginBtn = $("lockedLoginBtn");
  const lockedSignupBtn = $("lockedSignupBtn");

  const authStatus = $("authStatus");
  const roleStatus = $("roleStatus");
  const appsPermission = $("appsPermission");
  const adminStatus = $("adminStatus");

  const adminTab = $("adminTab");
  const applicationsTab = $("applicationsTab");

  const refreshProjectsBtn = $("refreshProjectsBtn");
  const refreshAppsBtn = $("refreshAppsBtn");
  const verifyAdminBtn = $("verifyAdminBtn");
  const saveProjectsBtn = $("saveProjectsBtn");

  const projectsList = $("projectsList");
  const applicationsBody = $("applicationsBody");
  const adminOutput = $("adminOutput");
  const projectsJson = $("projectsJson");
  const saveMsg = $("saveMsg");
  const toast = $("toast");

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = {
    dashboard: $("panel-dashboard"),
    projects: $("panel-projects"),
    applications: $("panel-applications"),
    admin: $("panel-admin")
  };

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function getRoles(user) {
    const a = user?.app_metadata?.roles;
    const b = user?.user_metadata?.roles;
    const roles = Array.isArray(a) ? a : Array.isArray(b) ? b : [];
    return roles.map(r => String(r).toLowerCase());
  }

  function resolveRole(user) {
    const roles = getRoles(user);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("developer")) return "developer";
    return "employee";
  }

  function getPermissions(role) {
    if (role === "admin") {
      return {
        projectsView: true,
        applicationsView: true,
        applicationsReview: true,
        adminView: true
      };
    }
    if (role === "developer") {
      return {
        projectsView: true,
        applicationsView: false,
        applicationsReview: false,
        adminView: false
      };
    }
    return {
      projectsView: true,
      applicationsView: false,
      applicationsReview: false,
      adminView: false
    };
  }

  function setPanel(name) {
    Object.values(panels).forEach(p => p.classList.remove("active"));
    panels[name].classList.add("active");
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.panel === name));
  }

  function waitForIdentity() {
    return new Promise((resolve) => {
      const check = () => window.netlifyIdentity ? resolve() : setTimeout(check, 50);
      check();
    });
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...(options.headers || {}) },
      ...options
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data.error || `${res.status} ${url}`);
    return data;
  }

  function lockPortal() {
    shell.style.display = "none";
    locked.style.display = "grid";

    who.textContent = "Not signed in";
    rolePill.style.display = "none";

    loginBtn.style.display = "";
    signupBtn.style.display = "";
    logoutBtn.style.display = "none";

    authStatus.textContent = "Signed out";
    roleStatus.textContent = "—";
    appsPermission.textContent = "Hidden";
    adminStatus.textContent = "No access";

    adminTab.style.display = "none";
    applicationsTab.style.display = "none";
    setPanel("dashboard");
  }

  async function unlockPortal(user) {
    const role = resolveRole(user);
    const perms = getPermissions(role);

    shell.style.display = "";
    locked.style.display = "none";

    who.textContent = user.email || "Signed in";
    rolePill.textContent = role.toUpperCase();
    rolePill.style.display = "";

    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "";

    authStatus.textContent = "Signed in";
    roleStatus.textContent = role;
    appsPermission.textContent = perms.applicationsView ? "Visible" : "Hidden";
    adminStatus.textContent = perms.adminView ? "Admin access" : "No access";

    applicationsTab.style.display = perms.applicationsView ? "" : "none";
    adminTab.style.display = perms.adminView ? "" : "none";

    if (!perms.adminView && panels.admin.classList.contains("active")) setPanel("dashboard");
    if (!perms.applicationsView && panels.applications.classList.contains("active")) setPanel("dashboard");

    await loadProjects();

    if (perms.applicationsView) {
      await loadApplications();
    } else {
      applicationsBody.innerHTML = `<tr><td colspan="5" class="empty-row">Applications hidden for this role.</td></tr>`;
    }
  }

  async function loadProjects() {
    try {
      const data = await fetchJson("/.netlify/functions/projects-get");
      const items = data.items || [];
      if (!items.length) {
        projectsList.innerHTML = `<div class="empty-state">No projects found.</div>`;
        return;
      }

      projectsList.innerHTML = items.map(p => `
        <div class="project-card">
          <div class="project-title">${escapeHtml(p.title || "")}</div>
          <div class="project-sub">${escapeHtml(p.subtitle || "")}</div>
        </div>
      `).join("");
    } catch (e) {
      projectsList.innerHTML = `<div class="empty-state">Failed to load projects.</div>`;
      showToast("Projects failed");
    }
  }

  async function loadApplications() {
    try {
      const data = await fetchJson("/.netlify/functions/applications-list");
      const items = data.items || [];
      if (!items.length) {
        applicationsBody.innerHTML = `<tr><td colspan="5" class="empty-row">No applications found.</td></tr>`;
        return;
      }

      applicationsBody.innerHTML = items.map(a => `
        <tr>
          <td>${escapeHtml((a.created_at || "").slice(0, 10))}</td>
          <td>${escapeHtml(a.name || "")}</td>
          <td>${escapeHtml(a.email || "")}</td>
          <td>${escapeHtml(a.type || "")}</td>
          <td><span class="status-pill ${statusClass(a.status)}">${escapeHtml(a.status || "new")}</span></td>
        </tr>
      `).join("");
    } catch (e) {
      applicationsBody.innerHTML = `<tr><td colspan="5" class="empty-row">Failed to load applications.</td></tr>`;
      showToast("Applications failed");
    }
  }

  async function verifyAdmin() {
    try {
      const data = await fetchJson("/.netlify/functions/admin-check");
      adminOutput.textContent = JSON.stringify(data, null, 2);
      showToast("Admin verified");
    } catch (e) {
      adminOutput.textContent = JSON.stringify({ ok: false, error: String(e.message || e) }, null, 2);
      showToast("Admin check failed");
    }
  }

  async function saveProjects() {
    saveMsg.textContent = "";
    try {
      const parsed = JSON.parse(projectsJson.value || "[]");
      await fetchJson("/.netlify/functions/projects-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed })
      });
      saveMsg.textContent = "Projects saved successfully.";
      showToast("Projects saved");
      await loadProjects();
    } catch (e) {
      saveMsg.textContent = `Save failed: ${String(e.message || e)}`;
      showToast("Save failed");
    }
  }

  function statusClass(status) {
    const s = String(status || "new").toLowerCase();
    if (["reviewing", "approved", "rejected", "new"].includes(s)) return s;
    return "new";
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#039;"
    }[m]));
  }

  async function init() {
    await waitForIdentity();

    const openLogin = () => window.netlifyIdentity.open("login");
    const openSignup = () => window.netlifyIdentity.open("signup");

    loginBtn.addEventListener("click", openLogin);
    signupBtn.addEventListener("click", openSignup);
    lockedLoginBtn.addEventListener("click", openLogin);
    lockedSignupBtn.addEventListener("click", openSignup);
    logoutBtn.addEventListener("click", () => window.netlifyIdentity.logout());

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const user = window.netlifyIdentity.currentUser();
        if (!user) return;

        const perms = getPermissions(resolveRole(user));
        const panel = tab.dataset.panel;

        if (panel === "applications" && !perms.applicationsView) {
          showToast("No application access");
          return;
        }

        if (panel === "admin" && !perms.adminView) {
          showToast("Admin access required");
          return;
        }

        setPanel(panel);
      });
    });

    refreshProjectsBtn?.addEventListener("click", loadProjects);
    refreshAppsBtn?.addEventListener("click", loadApplications);
    verifyAdminBtn?.addEventListener("click", verifyAdmin);
    saveProjectsBtn?.addEventListener("click", saveProjects);

    window.netlifyIdentity.on("init", (user) => user ? unlockPortal(user) : lockPortal());
    window.netlifyIdentity.on("login", (user) => {
      window.netlifyIdentity.close();
      unlockPortal(user);
      showToast("Logged in");
    });
    window.netlifyIdentity.on("logout", () => {
      lockPortal();
      showToast("Logged out");
    });

    window.netlifyIdentity.init();
  }

  init();
})();

netlifyIdentity.on("signup", user => {

  alert("Account created. Check your email to verify.");

});

netlifyIdentity.on("login", user => {

  unlockPortal(user);

  netlifyIdentity.close();

});

netlifyIdentity.on("logout", () => {

  lockPortal();

});