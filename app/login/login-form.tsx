"use client";

import { useActionState } from "react";
import { authenticate, goToSignUp } from "./actions";

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
      <form action={action} className="mt-2 flex w-96 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-bold">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={state.email}
            placeholder="Email"
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
            required
            className="border px-4 py-2"
          />
        </div>

        {state.message && <p className="text-red-700">{state.message}</p>}
        <button
          name="intent"
          value="signin"
          disabled={pending}
          className="bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 rounded-lg hover:cursor-pointer"
        >
          {pending ? "Please wait" : "Login"}
        </button>
      </form>
      <div className="flex items-center my-1">
        <div className="flex-grow border-t border-gray-300" />
        <span className="mx-4 text-sm text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-300" />
      </div>
      <button
        className="border border-neutral-900 px-4 py-2 disabled:opacity-50 rounded-lg hover:cursor-pointer"
        onClick={goToSignUp}
      >
        Sign Up
      </button>
    </div>
  );
}
