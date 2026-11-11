import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/features/settings/queries";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSiteSettings();
  return (
    <>
      <h1 className="mb-6 text-h4">Sayt ayarları</h1>
      <SettingsForm settings={settings} />
    </>
  );
}
