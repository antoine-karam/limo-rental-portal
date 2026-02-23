import { GetFleetPreview } from "@/server/fleet";
import { getTenant } from "@/server/tenants";
import { TopNav } from "@/app/components/TopNav";
import { HeroSection } from "@/app/components/HeroSection";
import { TrustIndicator } from "@/app/components/TrustIndicator";
import { Footer } from "@/app/components/Footer";
import { Fleet } from "@/app/components/Fleet";
import { CTA } from "@/app/components/CTA";
import { getUserSessionMetadata } from "@/server/user-session";

export default async function Home() {
  let tenant;
  try {
    tenant = await getTenant();
  } catch {
    // No tenant found, likely on the root domain. This is expected for the super-admin area.
  }

  const fleetPreview = await GetFleetPreview(tenant?.id);
  const sessionUser = await getUserSessionMetadata();

  return (
    <div className="min-h-screen bg-background">
      <TopNav tenant={tenant} sessionUser={sessionUser} />
      <HeroSection tenant={tenant} />
      <TrustIndicator tenant={tenant} />
      <Fleet fleet={fleetPreview} />
      <CTA/>
      <Footer />
    </div>
  );
}
