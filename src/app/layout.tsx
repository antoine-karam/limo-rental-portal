import type { Metadata } from "next";

import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "Luxury Limousine Service",
  description:
    "Premium limousine service. Professional drivers, luxury vehicles, and exceptional service for every occasion.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <KindeProvider>{children}</KindeProvider>
      </body>
    </html>
  );
}
