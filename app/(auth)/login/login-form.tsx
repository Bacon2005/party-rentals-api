"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, {
    message: "",
    email: "",
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold">Welcome Back!</h1>
      <p className="mt-2 text-neutral-500">
        Please log in to your account to continue.
      </p>
      <form action={action} className="mt-2 flex w-full flex-col gap-4 sm:w-96">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className="font-bold">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            defaultValue={state.email}
            placeholder="Email"
            required
            className="border px-4 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="login-password" className="font-bold">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Password, 6 or more characters"
            required
            className="border px-4 py-2"
          />
        </div>

        {state.message && <p className="text-red-700">{state.message}</p>}
        <button
          type="submit"
          name="intent"
          value="signin"
          disabled={pending}
          className="bg-form-button px-4 py-2 text-white disabled:opacity-50 rounded-lg hover:cursor-pointer"
        >
          {pending ? "Please wait" : "Login"}
        </button>
      </form>
      <div className="flex items-center my-1">
        <div className="grow border-t border-gray-300" />
        <span className="mx-4 text-sm text-gray-500">or</span>
        <div className="grow border-t border-gray-300" />
      </div>
      <Link
        href="/sign-up"
        scroll={false}
        className="rounded-lg border border-neutral-900 px-4 py-2 text-center"
      >
        Sign Up
      </Link>
    </div>
  );
}
