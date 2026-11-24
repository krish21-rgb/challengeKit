import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  return <AuthShell title="Let’s get started." description="Create your teacher account and make a little more room for curiosity."><AuthForm mode="register" /></AuthShell>;
}
