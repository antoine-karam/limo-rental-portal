import Link from "next/link";
import { headers } from "next/headers";

import { RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";

import styles from "../AuthPage.module.css";

function getRequestOrigin(host: string | null, protocol: string | null) {
  if (!host) {
    return process.env.KINDE_SITE_URL ?? process.env.NEXT_PUBLIC_KINDE_SITE_URL ?? "http://localhost:3000";
  }

  return `${protocol ?? "http"}://${host}`;
}

export default async function SignUpPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const postLoginRedirectURL = `${getRequestOrigin(host, protocol)}/auth/callback?flow=signup`;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>New Customer</span>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.description}>
          Sign up in seconds. After registration, we will create your customer profile for future rides.
        </p>

        <RegisterLink
          className={`btn btn-primary ${styles.fullButton}`}
          postLoginRedirectURL={postLoginRedirectURL}
        >
          Sign up with Kinde
        </RegisterLink>

        <p className={styles.linkText}>
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
