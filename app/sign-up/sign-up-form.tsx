"use client";

import { useActionState } from "react";
import { signUp, goToLogin } from "./actions";

export type SignupState = { message: string; name: string; email: string };

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {
    message: "",
    name: "",
    email: "",
  });

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="mt-8 flex w-96 flex-col gap-4">
        <input
          name="name"
          type="text"
          defaultValue={state.name}
          placeholder="Name"
          required
          className="border px-4 py-2"
        />
        <input
          name="email"
          type="email"
          defaultValue={state.email}
          placeholder="Email"
          required
          className="border px-4 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password, 6 or more characters"
          required
          className="border px-4 py-2"
        />
        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          required
          className="border px-4 py-2"
        />
        {state.message && <p className="text-red-700">{state.message}</p>}
        <button
          name="intent"
          value="signup"
          disabled={pending}
          className="border border-neutral-900 px-4 py-2 disabled:opacity-50"
        >
          Create a client account
        </button>
      </form>
      <button
        className="border border-neutral-900 px-4 py-2 disabled:opacity-50"
        onClick={goToLogin}
      >
        Login
      </button>
    </div>
  );
}
