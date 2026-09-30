import { getNamespacedStorageKeys } from '@/host/storage/utils/getNamespacedStorageKeys';
import { type FrontComponentStorageScope } from '@/types/FrontComponentStorageScope';

export const clearFrontComponentStorage = ({
  namespace,
  storageType,
}: FrontComponentStorageScope): void => {
  const storage =
    storageType === 'localStorage'
      ? window.localStorage
      : window.sessionStorage;

  for (const namespacedKey of getNamespacedStorageKeys({
    storage,
    namespace,
  })) {
    storage.removeItem(namespacedKey);
  }
};
