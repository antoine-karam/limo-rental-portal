import Link from "next/link";
import Image from "next/image";
import styles from "./Fleet.module.css";
import { FleetPreview } from "@/server/models/fleet";
import { ArrowRight } from "lucide-react";

const default_image = "https://pub-c77f098c0f7e4c41ae25115eea725693.r2.dev/cars-on-spot/hero-section.png";
export function Fleet({fleet }:{fleet:FleetPreview[]}) {
  return (
     <section className={styles.fleetSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Our Premium Fleet</h2>
            <p className={styles.sectionDescription}>
              Choose from our selection of luxury vehicles, perfect for any occasion
            </p>
          </div>

          <div className={styles.fleetGrid}>
            {fleet.map((vehicle, index) => (
              <div key={index} className={styles.fleetCard}>
                <div className={styles.fleetImageContainer}>
                  <Image 
                    src={vehicle.imageUrl??default_image}
                    alt={vehicle.name}
                    width={400}
                    height={300}
                    className={styles.fleetImage}
                  />
                </div>
                <div className={styles.fleetCardContent}>
                  <h3 className={styles.fleetCardTitle}>{vehicle.name}</h3>
                  <p className={styles.fleetCardDescription}>{vehicle.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.fleetCta}>
            <Link href="/fleet" className="btn btn-primary btn-lg">
              View All Vehicles
              <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Link>
          </div>
        </div>
      </section>
  );
}
