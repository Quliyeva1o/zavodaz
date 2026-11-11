import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Logo variant="header" />
      <div className="w-full max-w-md rounded-[10px] bg-white p-10">
        <h1 className="mb-6 text-h5">Admin panelə giriş</h1>
        <LoginForm />
      </div>
    </main>
  );
}
