import { asc } from "drizzle-orm";
import { db } from "@/db";
import { tariffPlans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { tariffToRaw } from "@/features/tariffs/admin";
import { TariffForm } from "./tariff-form";

export default async function TariffsAdminPage() {
  await requireAdmin();
  const plans = await db.select().from(tariffPlans).orderBy(asc(tariffPlans.sort));
  return (
    <>
      <h1 className="mb-2 text-h4">Tariflər</h1>
      <p className="mb-6 text-body-sm text-gray-500">Tarifin kodu və ikonu dəyişmir. Qiymət ₼ ilə yazılır (0 = Pulsuz).</p>
      <div className="flex flex-col gap-8">
        {plans.map((p) => (
          <TariffForm key={p.code} code={p.code} title={p.name.az} initial={tariffToRaw(p)} />
        ))}
      </div>
    </>
  );
}
