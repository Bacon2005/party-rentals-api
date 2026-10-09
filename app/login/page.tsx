import { LoginForm } from "./login-form";
import Image from "next/image";
import Logo from "@/components/assets/images/Logo.png";
export default function LoginPage() {
  return (
    <main className="flex flex-row justify-center items-center gap-10 px-16 py-8">
      <Image src={Logo} alt={"Logo"} width={300} height={300} />
      <LoginForm />
    </main>
  );
}
