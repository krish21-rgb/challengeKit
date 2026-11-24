import { requireTeacher } from "@/lib/auth/require-teacher";
import { TeacherShell } from "@/components/teacher-shell";
import { ProfileForm } from "@/components/auth/profile-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile, user } = await requireTeacher();
  return <TeacherShell current="settings" name={profile.display_name}><div className="workspace-kicker"><span /> YOUR ACCOUNT</div><h1>Make it yours<span className="accent-dot">.</span></h1><p className="workspace-lead">A few little details about you.</p><section className="settings-card"><div className="settings-card-heading"><h2>Profile details</h2><p>Update your teacher profile information.</p></div><ProfileForm name={profile.display_name} /><div className="account-email"><span>EMAIL ADDRESS</span><p>{user.email}</p><small>Your email is managed by your account.</small></div></section></TeacherShell>;
}
