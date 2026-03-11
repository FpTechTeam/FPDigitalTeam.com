import { supabase } from "../lib/supabaseClient";
import { popReturnTo } from "../lib/returnTo";

export async function signUp(email, password) {
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) throw error;
  // Show: "Check your email to verify"
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  window.location.assign(popReturnTo("/portal"));
}