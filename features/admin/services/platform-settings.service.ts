// PROPOSAL — target path: features/admin/services/platform-settings.service.ts (new file)

import { prisma } from "@/lib/prisma";

export interface MarketplaceSettings {
  autoApprovalEnabled: boolean;
  sensitivePermissions: string[];
}

export interface PaymentSettings {
  defaultProvider: "PAYMOB" | "STRIPE" | "PAYPAL";
  enabledProviders: ("PAYMOB" | "STRIPE" | "PAYPAL")[];
}

const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  autoApprovalEnabled: true,
  // Anything here forces manual review regardless of the permission-diff
  // check, no matter how the auto-approval toggle above is set.
  sensitivePermissions: ["billing:manage", "security:manage", "admin:manage", "payments:write"],
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  defaultProvider: "PAYMOB",
  enabledProviders: ["PAYMOB"],
};

export const platformSettingsService = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  },

  async set(key: string, value: unknown, updatedByUserId?: string) {
    return prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: value as never, updatedByUserId },
      update: { value: value as never, updatedByUserId },
    });
  },

  getMarketplaceSettings() {
    return this.get<MarketplaceSettings>("marketplace", DEFAULT_MARKETPLACE_SETTINGS);
  },

  setMarketplaceSettings(value: MarketplaceSettings, updatedByUserId?: string) {
    return this.set("marketplace", value, updatedByUserId);
  },

  getPaymentSettings() {
    return this.get<PaymentSettings>("payments", DEFAULT_PAYMENT_SETTINGS);
  },

  setPaymentSettings(value: PaymentSettings, updatedByUserId?: string) {
    return this.set("payments", value, updatedByUserId);
  },
};
