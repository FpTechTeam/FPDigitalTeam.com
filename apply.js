/* apply.js — Multi-step wizard + counters + autosave + URL prefill + LinkedIn paste
   Notes:
   - True “LinkedIn account autofill” isn’t available on public web pages (privacy).
   - We DO implement: browser autocomplete, clipboard paste for LinkedIn URL, and prefill-by-link params.
*/

(function () {
  const form = document.getElementById("applyForm");
  if (!form) return;

  const steps = Array.from(document.querySelectorAll(".step"));
  const stepLabel = document.getElementById("stepLabel");
  const progressFill = document.getElementById("progressFill");
  const pills = Array.from(document.querySelectorAll("[data-step-jump]"));
  const formStatus = document.getElementById("formStatus");

  const restoreDraftBtn = document.getElementById("restoreDraftBtn");
  const clearDraftBtn = document.getElementById("clearDraftBtn");

  const pasteLinkedInBtn = document.getElementById("pasteLinkedInBtn");
  const prefillFromUrlBtn = document.getElementById("prefillFromUrlBtn");
  const prefillStatus = document.getElementById("prefillStatus");

  const STORAGE_KEY = "fp_apply_autosave_v2";
  let currentStep = 0;

  // ---------- Helpers ----------
  function setStatus(msg, kind = "info") {
    if (!formStatus) return;
    formStatus.classList.add("show");
    formStatus.textContent = msg;

    // Subtle semantic messaging (no extra CSS needed)
    if (kind === "error") {
      formStatus.style.borderColor = "rgba(255, 99, 132, 0.35)";
      formStatus.style.background = "rgba(255, 99, 132, 0.10)";
    } else if (kind === "success") {
      formStatus.style.borderColor = "rgba(0, 188, 212, 0.35)";
      formStatus.style.background = "rgba(0, 188, 212, 0.10)";
    } else {
      formStatus.style.borderColor = "rgba(255,255,255,0.10)";
      formStatus.style.background = "rgba(255,255,255,0.04)";
    }
  }

  function setMiniStatus(msg) {
    if (!prefillStatus) return;
    prefillStatus.textContent = msg || "";
    if (msg) setTimeout(() => (prefillStatus.textContent = ""), 3500);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ---------- Wizard ----------
  function showStep(index) {
    currentStep = clamp(index, 0, steps.length - 1);

    steps.forEach((s) => s.classList.remove("active"));
    steps[currentStep].classList.add("active");

    const pct = ((currentStep + 1) / steps.length) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (stepLabel) stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;

    pills.forEach((p) => p.classList.remove("active"));
    const pill = pills.find((p) => Number(p.getAttribute("data-step-jump")) === currentStep);
    if (pill) pill.classList.add("active");

    // Clear previous errors when moving
    if (formStatus) formStatus.classList.remove("show");
  }

  function getFieldsForStep(stepIndex) {
    const container = steps[stepIndex];
    if (!container) return [];
    return Array.from(container.querySelectorAll("input, select, textarea"))
      .filter(el => el.type !== "hidden" && el.type !== "submit" && el.name !== "_gotcha");
  }

  function validateStep(stepIndex) {
    const fields = getFieldsForStep(stepIndex);
    let valid = true;
    let firstInvalid = null;

    fields.forEach((el) => {
      // Only validate required fields
      if (!el.required) return;

      // Checkbox required
      if (el.type === "checkbox") {
        if (!el.checked) {
          valid = false;
          if (!firstInvalid) firstInvalid = el;
        }
        return;
      }

      // Basic required
      if (!el.value || !String(el.value).trim()) {
        valid = false;
        if (!firstInvalid) firstInvalid = el;
        return;
      }

      // Email validity
      if (el.type === "email") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        if (!ok) {
          valid = false;
          if (!firstInvalid) firstInvalid = el;
        }
      }

      // URL validity (basic)
      if (el.type === "url" && el.value.trim()) {
        try {
          new URL(el.value.trim());
        } catch {
          valid = false;
          if (!firstInvalid) firstInvalid = el;
        }
      }
    });

    if (!valid) {
      setStatus("Please complete the required fields on this step.", "error");
      if (firstInvalid?.focus) firstInvalid.focus();
    }

    return valid;
  }

  // Next/back buttons
  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      saveDraft();
      showStep(currentStep + 1);
    });
  });

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveDraft();
      showStep(currentStep - 1);
    });
  });

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = Number(pill.getAttribute("data-step-jump"));
      // To prevent skipping required data, only allow jumping forward if current step validates
      if (target > currentStep && !validateStep(currentStep)) return;
      saveDraft();
      showStep(target);
    });
  });

  // ---------- Character counters ----------
  function initCounters() {
    const counters = Array.from(document.querySelectorAll("[data-count-for]"));
    counters.forEach((counter) => {
      const id = counter.getAttribute("data-count-for");
      const field = document.getElementById(id);
      if (!field) return;

      const update = () => {
        counter.textContent = String(field.value?.length || 0);
      };
      field.addEventListener("input", update);
      update();
    });
  }

  // ---------- Autosave ----------
  function serializeForm() {
    const data = {};
    const els = Array.from(form.querySelectorAll("input, select, textarea"));
    els.forEach((el) => {
      if (!el.name) return;

      if (el.type === "checkbox") {
        data[el.name] = data[el.name] || [];
        if (el.checked) data[el.name].push(el.value || "on");
      } else if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    });

    return data;
  }

  function applyDataToForm(data) {
    if (!data) return;

    const els = Array.from(form.querySelectorAll("input, select, textarea"));
    els.forEach((el) => {
      if (!el.name) return;
      if (!(el.name in data)) return;

      if (el.type === "checkbox") {
        const arr = Array.isArray(data[el.name]) ? data[el.name] : [];
        el.checked = arr.includes(el.value || "on");
      } else if (el.type === "radio") {
        el.checked = data[el.name] === el.value;
      } else {
        // only fill if empty OR restoring explicitly
        el.value = data[el.name];
      }
    });
  }

  function saveDraft() {
    try {
      const payload = {
        ts: Date.now(),
        currentStep,
        data: serializeForm(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  function loadDraft({ force = false } = {}) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (!payload?.data) return false;

      if (force) {
        applyDataToForm(payload.data);
      } else {
        // only fill blank fields by default
        const current = serializeForm();
        const merged = { ...payload.data };
        Object.keys(current).forEach((k) => {
          const v = current[k];
          const isEmpty =
            v == null ||
            (typeof v === "string" && !v.trim()) ||
            (Array.isArray(v) && v.length === 0);
          if (!isEmpty) merged[k] = v;
        });
        applyDataToForm(merged);
      }

      if (typeof payload.currentStep === "number") showStep(payload.currentStep);
      initCounters();
      return true;
    } catch {
      return false;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setStatus("Draft cleared.", "success");
    } catch {
      // ignore
    }
  }

  // Autosave on input
  let saveTimer = null;
  form.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 250);
  });

  // ---------- Prefill from URL params ----------
  function prefillFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params || Array.from(params.keys()).length === 0) {
      setMiniStatus("No prefill params in URL.");
      return false;
    }

    const mapping = {
      name: "name",
      email: "email",
      org: "organization",
      role: "role",
      linkedin: "linkedin",
      phone: "phone",
    };

    // Fill only if field is blank (no overwriting)
    let filled = 0;
    Object.entries(mapping).forEach(([param, fieldName]) => {
      const v = params.get(param);
      if (!v) return;

      const el = form.querySelector(`[name="${CSS.escape(fieldName)}"]`);
      if (!el) return;

      const empty = !el.value || !String(el.value).trim();
      if (empty) {
        el.value = v;
        filled++;
      }
    });

    if (filled > 0) {
      saveDraft();
      initCounters();
      setMiniStatus("Prefilled from link ✅");
      return true;
    }

    setMiniStatus("Nothing to prefill (fields already filled).");
    return false;
  }

  // ---------- LinkedIn paste helper ----------
  async function pasteLinkedIn() {
    try {
      if (!navigator.clipboard?.readText) {
        setMiniStatus("Clipboard not available in this browser.");
        return;
      }
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setMiniStatus("Clipboard is empty.");
        return;
      }

      // Accept raw handles too
      let url = text;
      if (!/^https?:\/\//i.test(url)) {
        // Attempt to convert a handle into URL
        url = `https://www.linkedin.com/in/${url.replace(/^@/, "")}`;
      }

      // Basic LinkedIn URL sanity check
      if (!/linkedin\.com\/in\//i.test(url) && !/linkedin\.com\/company\//i.test(url)) {
        setMiniStatus("That doesn't look like a LinkedIn URL.");
        return;
      }

      const linkedInInput = document.getElementById("linkedin");
      if (linkedInInput) linkedInInput.value = url;

      saveDraft();
      setMiniStatus("LinkedIn URL pasted ✅");
    } catch {
      setMiniStatus("Could not read clipboard (permission denied).");
    }
  }

  // ---------- Form submission (AJAX) ----------
  // Formspree supports normal POST; this gives better UX.
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validate final step
    if (!validateStep(currentStep)) return;

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = true;

    setStatus("Submitting…", "info");

    try {
      const formData = new FormData(form);

      const res = await fetch(form.action, {
        method: form.method || "POST",
        body: formData,
        headers: { "Accept": "application/json" },
      });

      if (res.ok) {
        setStatus("Submitted ✅ — We’ll review and respond if it’s a fit.", "success");
        clearDraft();
        form.reset();
        initCounters();
        showStep(0);
      } else {
        setStatus("Submission failed. Please check the form endpoint and try again.", "error");
      }
    } catch {
      setStatus("Submission failed (network). Please try again.", "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // ---------- Buttons ----------
  restoreDraftBtn?.addEventListener("click", () => {
    const ok = loadDraft({ force: true });
    setStatus(ok ? "Draft restored ✅" : "No saved draft found.", ok ? "success" : "error");
  });

  clearDraftBtn?.addEventListener("click", () => {
    clearDraft();
  });

  pasteLinkedInBtn?.addEventListener("click", pasteLinkedIn);
  prefillFromUrlBtn?.addEventListener("click", prefillFromUrl);

  // ---------- Init ----------
  initCounters();
  // Load non-destructively on page load
  loadDraft({ force: false });

  // If URL params exist, prefill (non-destructive)
  prefillFromUrl();

  showStep(0);
})();