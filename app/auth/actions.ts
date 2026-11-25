"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, validateEmail, validateName, validatePassword } from "@/lib/auth/validation";
import { requireTeacher } from "@/lib/auth/require-teacher";

export type FormState = { error?: string; success?: string };
const value = (data: FormData, key: string) => String(data.get(key) ?? "");

export async function login(_previous: FormState, data: FormData): Promise<FormState> {
  const email = value(data, "email").trim();
  const password = value(data, "password");
  if (validateEmail(email) || !password) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet. Please contact the site administrator." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Could not sign in. Check your details and confirm your email, then try again." };
  redirect("/dashboard");
}

export async function register(_previous: FormState, data: FormData): Promise<FormState> {
  const name = value(data, "name").trim();
  const email = value(data, "email").trim();
  const password = value(data, "password");
  const error = validateName(name) || validateEmail(email) || validatePassword(password);
  if (error) return { error };
  if (password !== value(data, "confirmPassword")) return { error: "Passwords do not match." };
  const supabase = await createClient();
  const siteUrl = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!supabase || !siteUrl) return { error: "Registration is not configured yet. Please contact the site administrator." };
  const { data: result, error: signUpError } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: name }, emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (signUpError) return { error: "Could not create your account. Please check your details and try again later." };
  if (result.session) redirect("/dashboard");
  return { success: "If this email can be registered, check your inbox for a confirmation link. Open it in this browser, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(_previous: FormState, data: FormData): Promise<FormState> {
  const name = value(data, "name").trim();
  const error = validateName(name);
  if (error) return { error };
  const { supabase, user } = await requireTeacher();
  const { data: updated, error: updateError } = await supabase.from("profiles")
    .update({ display_name: name }).eq("id", user.id).select("id").maybeSingle();
  if (updateError || !updated) return { error: "Could not save your profile. Please try again." };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Your profile has been updated." };
}
