import { ReactNode } from "react";

type AdminTableCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AdminTableCard({ title, subtitle, children }: AdminTableCardProps) {
  return (
    <section className="card mb-6">
      <div className="card-content">
        <div className="mb-4">
          <h3 className="text-xl text-primary mb-1">{title}</h3>
          {subtitle ? <p className="text-sm text-secondary">{subtitle}</p> : null}
        </div>
        <div style={{ overflowX: "auto" }}>{children}</div>
      </div>
    </section>
  );
}
