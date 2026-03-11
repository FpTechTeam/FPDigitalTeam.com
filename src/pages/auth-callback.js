import { supabase } from "../lib/supabaseClient";
import { popReturnTo } from "../lib/returnTo";

export async function handleAuthCallback() {
  // Supabase puts tokens in the URL hash for email links
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    window.location.assign("/auth");
    return;
  }

  const params = new URLSearchParams(hash.substring(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    window.location.assign("/auth");
    return;
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    window.location.assign("/auth");
    return;
  }

  // ✅ sends them back to where they were (apply step, portal, etc.)
  window.location.assign(popReturnTo("/portal"));
}