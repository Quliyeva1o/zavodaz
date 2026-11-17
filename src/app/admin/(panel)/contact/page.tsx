import { requireAdmin } from "@/lib/auth";
import { getContactSettings } from "@/features/contact/queries";
import { rawFromSettings } from "@/features/contact/admin";
import { ContactSettingsForm } from "./contact-settings-form";

export default async function ContactAdminPage() {
  await requireAdmin();
  const settings = await getContactSettings();
  return (
    <>
      <h1 className="mb-6 text-h4">Əlaqə ayarları</h1>
      <ContactSettingsForm initial={rawFromSettings(settings)} />
    </>
  );
}
