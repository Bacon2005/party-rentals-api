import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">Sign up</h1>
      <p className="mt-2 text-neutral-500">Create a new account</p>
      <SignUpForm />
    </main>
  );
}
