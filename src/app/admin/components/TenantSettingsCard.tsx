import { Tenant } from "@prisma/client";

type TenantSettingsCardProps = {
  tenant: Pick<
    Tenant,
    | "id"
    | "name"
    | "slug"
    | "primaryColor"
    | "active"
    | "stripeOnboarded"
    | "stripeAccountId"
  >;
  updateAction: (formData: FormData) => Promise<void>;
};

export function TenantSettingsCard({ tenant, updateAction }: TenantSettingsCardProps) {
  return (
    <section className="card mb-6">
      <div className="card-content">
        <div className="mb-4">
          <h3 className="text-xl text-primary mb-1">{tenant.name}</h3>
          <p className="text-sm text-secondary">Core tenant settings and status.</p>
        </div>

        <div className="mb-4 text-sm" style={{ display: "grid", gap: "0.35rem" }}>
          <p>
            <span className="text-muted">Tenant ID:</span> {tenant.id}
          </p>
          <p>
            <span className="text-muted">Stripe Onboarded:</span>{" "}
            <span className={`badge ${tenant.stripeOnboarded ? "badge-success" : "badge-warning"}`}>
              {tenant.stripeOnboarded ? "Yes" : "No"}
            </span>
          </p>
          <p>
            <span className="text-muted">Stripe Account:</span> {tenant.stripeAccountId ?? "Not connected"}
          </p>
        </div>

        <form action={updateAction} style={{ display: "grid", gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`name-${tenant.id}`} className="form-label">
              Name
            </label>
            <input id={`name-${tenant.id}`} name="name" className="form-input" defaultValue={tenant.name} required />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`slug-${tenant.id}`} className="form-label">
              Slug
            </label>
            <input
              id={`slug-${tenant.id}`}
              name="slug"
              className="form-input"
              defaultValue={tenant.slug}
              pattern="[a-z0-9-]+"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`primaryColor-${tenant.id}`} className="form-label">
              Primary Color
            </label>
            <input
              id={`primaryColor-${tenant.id}`}
              name="primaryColor"
              className="form-input"
              defaultValue={tenant.primaryColor ?? ""}
              placeholder="#C9A84C"
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" name="active" defaultChecked={tenant.active} />
            Active tenant
          </label>

          <button type="submit" className="btn btn-primary btn-sm" style={{ justifySelf: "start" }}>
            Save Tenant
          </button>
        </form>
      </div>
    </section>
  );
}
