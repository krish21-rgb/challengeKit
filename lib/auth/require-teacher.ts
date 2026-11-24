import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireTeacher() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?reason=configuration");
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?reason=auth");
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("id, display_name, role").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.role !== "teacher") redirect("/login?reason=access");
  return { supabase, user, profile };
}
