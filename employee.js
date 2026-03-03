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
  const apiStatus = $("apiStatus");

  const adminTab = $("adminTab");
  const toast = $("toast");

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = {
    home: $("panel-home"),
    applications: $("panel-applications"),
    projects: $("panel-projects"),
    admin: $("panel-admin"),
  };

  const appsBody = $("appsBody");
  const appsRefresh = $("appsRefresh");

  const projectsList = $("projectsList");
  const projectsRefresh = $("projectsRefresh");

  const adminCheck = $("adminCheck");
  const adminOut = $("adminOut");

  const projectsJson = $("projectsJson");
  const saveProjects = $("saveProjects");
  const saveMsg = $("saveMsg");

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function setPanel(name) {
    Object.values(panels).forEach(p => p?.classList.remove("active"));
    panels[name]?.classList.add("active");
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  }

  function waitForIdentity() {
    return new Promise((resolve) => {
      const tick = () => (window.netlifyIdentity ? resolve() : setTimeout(tick, 50));
      tick();
    });
  }

  function getRoles(user) {
    const rolesA = user?.app_metadata?.roles;
    const rolesB = user?.user_metadata?.roles;
    const roles = Array.isArray(rolesA) ? rolesA : Array.isArray(rolesB) ? rolesB : [];
    return roles.map(r => String(r).toLowerCase());
  }

  // Permission model (easy to expand)
  function roleToPerms(role) {
    const r = String(role || "employee").toLowerCase();
    if (r === "admin") return { appsRead:true, appsWrite:true, projectsRead:true, projectsWrite:true, usersManage:true };
    if (r === "developer") return { appsRead:true, appsWrite:false, projectsRead:true, projectsWrite:false, usersManage:false };
    return { appsRead:true, appsWrite:false, projectsRead:true, projectsWrite:false, usersManage:false };
  }

  function resolveRole(user) {
    const roles = getRoles(user);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("developer")) return "developer";
    return "employee";
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...(options?.headers || {}) },
      ...options
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.error || `${res.status} ${url}`);
    return data;
  }

  async function loadApplications() {
    if (!appsBody) return;
    appsBody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
    try {
      const data = await fetchJson("/.netlify/functions/applications-list");
      const items = data.items || [];
      appsBody.innerHTML = items.map(a => `
        <tr>
          <td>${esc((a.created_at || "").slice(0,10))}</td>
          <td>${esc(a.name || "")}</td>
          <td>${esc(a.email || "")}</td>
          <td>${esc(a.type || "")}</td>
          <td>${esc(a.status || "new")}</td>
        </tr>
      `).join("") || `<tr><td colspan="5" class="muted">No applications yet.</td></tr>`;
    } catch (e) {
      appsBody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load.</td></tr>`;
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
    } catch {
      projectsList.innerHTML = `<div class="muted">Failed to load.</div>`;
      showToast("Projects failed");
    }
  }

  async function verifyAdminServer() {
    if (!adminOut) return;
    adminOut.textContent = "{}";
    try {
      const data = await fetchJson("/.netlify/functions/admin-check");
      adminOut.textContent = JSON.stringify(data, null, 2);
      showToast("Admin verified ✅");
    } catch (e) {
      adminOut.textContent = JSON.stringify({ ok:false, error: String(e.message || e) }, null, 2);
      showToast("Admin check failed");
    }
  }

  async function saveProjectsServer() {
    saveMsg.textContent = "";
    try {
      const parsed = JSON.parse(projectsJson.value || "[]");
      const data = await fetchJson("/.netlify/functions/projects-update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: parsed })
      });
      saveMsg.textContent = "Saved ✅";
      showToast("Projects saved ✅");
      await loadProjects();
      return data;
    } catch (e) {
      saveMsg.textContent = `Save failed: ${String(e.message || e)}`;
      showToast("Save failed");
    }
  }

  function lock() {
    shell.style.display = "none";
    locked.style.display = "grid";

    who.textContent = "Not signed in";
    rolePill.style.display = "none";

    loginBtn.style.display = "";
    signupBtn.style.display = "";
    logoutBtn.style.display = "none";

    authStatus.textContent = "Signed out";
    roleStatus.textContent = "—";
    apiStatus.textContent = "—";

    adminTab.style.display = "none";
    setPanel("home");
  }

  async function unlock(user) {
    shell.style.display = "";
    locked.style.display = "none";

    const role = resolveRole(user);
    const perms = roleToPerms(role);

    who.textContent = user.email;
    rolePill.textContent = role.toUpperCase();
    rolePill.style.display = "";

    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "";

    authStatus.textContent = "Signed in ✅";
    roleStatus.textContent = role;

    // Admin tab (UI gate)
    adminTab.style.display = perms.usersManage ? "" : "none";

    // Backend auth check
    try {
      const whoami = await fetchJson("/.netlify/functions/whoami");
      apiStatus.textContent = whoami.ok ? "Connected ✅" : "Error";
    } catch {
      apiStatus.textContent = "Error";
    }

    // Load allowed data
    if (perms.appsRead) await loadApplications();
    if (perms.projectsRead) await loadProjects();

    // Prevent non-admin from staying on admin panel
    const active = document.querySelector(".tab.active")?.dataset.tab;
    if (active === "admin" && !perms.usersManage) setPanel("home");
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

    tabs.forEach(t => {
      t.addEventListener("click", () => {
        const tab = t.dataset.tab;
        const user = window.netlifyIdentity.currentUser();
        if (!user) return;

        const role = resolveRole(user);
        const perms = roleToPerms(role);

        if (tab === "admin" && !perms.usersManage) {
          showToast("Admin access required.");
          return;
        }
        setPanel(tab);
      });
    });

    appsRefresh?.addEventListener("click", loadApplications);
    projectsRefresh?.addEventListener("click", loadProjects);
    adminCheck?.addEventListener("click", verifyAdminServer);
    saveProjects?.addEventListener("click", saveProjectsServer);

    window.netlifyIdentity.on("init", (user) => user ? unlock(user) : lock());
    window.netlifyIdentity.on("login", (user) => {
      window.netlifyIdentity.close();
      unlock(user);
      showToast("Logged in ✅");
    });
    window.netlifyIdentity.on("logout", () => {
      lock();
      showToast("Logged out");
    });

    window.netlifyIdentity.init();
  }

  init();
})();