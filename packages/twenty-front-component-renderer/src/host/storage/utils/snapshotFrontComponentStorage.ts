import { getNamespacedStorageKeys } from '@/host/storage/utils/getNamespacedStorageKeys';
import { type FrontComponentStorageScope } from '@/types/FrontComponentStorageScope';

export const snapshotFrontComponentStorage = ({
  namespace,
  storageType,
}: FrontComponentStorageScope): Record<string, string> => {
  const storage =
    storageType === 'localStorage'
      ? window.localStorage
      : window.sessionStorage;

  return Object.fromEntries(
    getNamespacedStorageKeys({ storage, namespace }).map((namespacedKey) => [
      namespacedKey.slice(namespace.length),
      storage.getItem(namespacedKey) ?? '',
    ]),
  );
};
