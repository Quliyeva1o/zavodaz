"use client";

import { useActionState } from "react";
import { login } from "../actions";

const input =
  "h-11 w-full rounded-[4px] border border-gray-200 px-3 text-body-md text-brand-950 placeholder:text-gray-400 focus:border-brand-700 focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-body-sm text-brand-950">
        E-mail
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="flex flex-col gap-2 text-body-sm text-brand-950">
        Şifrə
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-body-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[4px] bg-brand-950 px-4 text-body-md text-white disabled:opacity-60"
      >
        Daxil ol
      </button>
    </form>
  );
}
