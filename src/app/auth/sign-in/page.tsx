import Link from "next/link";
import { headers } from "next/headers";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

import styles from "../AuthPage.module.css";

function getRequestOrigin(host: string | null, protocol: string | null) {
  if (!host) {
    return process.env.KINDE_SITE_URL ?? process.env.NEXT_PUBLIC_KINDE_SITE_URL ?? "http://localhost:3000";
  }

  return `${protocol ?? "http"}://${host}`;
}
export default async function SignInPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const postLoginRedirectURL = `${getRequestOrigin(host, protocol)}/auth/callback?flow=signin`;
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>Welcome Back</span>
        <h1 className={styles.title}>Sign in to your account</h1>
        <p className={styles.description}>
          Continue with our secure Kinde authentication and pick up your booking
          details where you left off.
        </p>

        <LoginLink
          className={`btn btn-primary ${styles.fullButton}`}
          postLoginRedirectURL={postLoginRedirectURL}
        >
          Sign in with Kinde
        </LoginLink>

        <p className={styles.linkText}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up">Create one</Link>
        </p>
      </section>
    </main>
  );
}
