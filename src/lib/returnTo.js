export function setReturnTo(path) {
  try { localStorage.setItem("returnTo", path); } catch {}
}
export function popReturnTo(defaultPath = "/portal") {
  try {
    const v = localStorage.getItem("returnTo");
    localStorage.removeItem("returnTo");
    return v || defaultPath;
  } catch {
    return defaultPath;
  }
}