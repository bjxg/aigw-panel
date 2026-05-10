export interface ApiKeyFormValues {
  name: string;
  key: string;
  userId: string;
  permissionProfileId: string;
  dailyLimit: string;
  totalQuota: string;
  spendingLimit: string;
  concurrencyLimit: string;
  rpmLimit: string;
  tpmLimit: string;
  allowedModels: string[];
  allowedChannels: string[];
  allowedChannelGroups: string[];
  useExactChannelRestrictions: boolean;
  systemPrompt: string;
}
