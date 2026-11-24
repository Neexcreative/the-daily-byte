"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, checkPassword, cookieOptions, makeToken } from "@/lib/auth";

export async function login(_prev: string, formData: FormData): Promise<string> {
  const pw = String(formData.get("password") ?? "");
  if (!checkPassword(pw)) return "Senha incorreta.";
  const jar = await cookies();
  jar.set(COOKIE, makeToken(), cookieOptions);
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/login");
}
