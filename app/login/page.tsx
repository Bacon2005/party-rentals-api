import { LoginForm } from "./login-form";
import Image from "next/image";
import Logo from "@/components/assets/images/Logo.png";
export default function LoginPage() {
  return (
    <div className="flex flex-row justify-center items-center gap-10 px-16 py-8">
      <Image src={Logo} alt={"Logo"} width={300} height={300} />
      <div className="border border-gray-50 rounded-2xl p-8 shadow-lg">
        <LoginForm />
      </div>
    </div>
  );
}
