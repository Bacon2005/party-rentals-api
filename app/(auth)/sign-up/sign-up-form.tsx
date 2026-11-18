"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "./actions";

export type SignupState = { message: string; name: string; email: string };

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {
    message: "",
    name: "",
    email: "",
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold">Sign Up</h1>
      <p className="mt-2 text-neutral-500">
        Create your own account to get started.
      </p>
      <form action={action} className="mt-2 flex w-96 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="font-bold">
            Name
          </label>
          <input
            name="name"
            type="text"
            defaultValue={state.name}
            placeholder="Name"
            autoComplete="off"
            required
            className="border px-4 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-bold">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={state.email}
            placeholder="Email"
            autoComplete="off"
            required
            className="border px-4 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-bold">
            Password
          </label>
          <input
            name="password"
            type="password"
            placeholder="Password, 6 or more characters"
            autoComplete="off"
            required
            className="border px-4 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="font-bold">
            Confirm Password
          </label>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            autoComplete="off"
            required
            className="border px-4 py-2"
          />
        </div>
        {state.message && <p className="text-red-700">{state.message}</p>}
        <button
          name="intent"
          value="signup"
          disabled={pending}
          className="bg-form-button px-4 py-2 text-white disabled:opacity-50 rounded-lg hover:cursor-pointer "
        >
          Create a Party Link account
        </button>
      </form>
      <div className="flex items-center my-1">
        <div className="grow border-t border-gray-300" />
        <span className="mx-4 text-sm text-gray-500">or</span>
        <div className="grow border-t border-gray-300" />
      </div>
      <Link
        href="/login"
        scroll={false}
        className="rounded-lg border border-neutral-900 px-4 py-2 text-center"
      >
        Login
      </Link>
    </div>
  );
}
