import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  StoreInfoForm,
  StorefrontLinkCard,
  PaymentSettingsCard,
  UsdRateCard,
  NotificationsCard,
  ReceiptSettingsCard,
  TelegramBotCard,
  DataExportCard,
  PasswordForm,
} from "@/components/settings/SettingsForms";

export default async function SozlamalarPage() {
  const session = await getSession();
  if (!session) return null;

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) return null;

  const storeData = {
    ...store,
    customPaymentMethods: Array.isArray(store.customPaymentMethods)
      ? (store.customPaymentMethods as string[])
      : null,
  };

  const slug = store.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "dokon";

  return (
    <div className="flex flex-col gap-6">
      <StorefrontLinkCard slug={slug} />
      <PaymentSettingsCard store={storeData} />
      <UsdRateCard store={storeData} />
      <NotificationsCard store={storeData} />
      <ReceiptSettingsCard store={storeData} />
      <TelegramBotCard store={storeData} />
      <StoreInfoForm store={storeData} />
      <DataExportCard />
      <PasswordForm />
    </div>
  );
}
