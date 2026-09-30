import { type FrontComponentStorageScope } from '@/types/FrontComponentStorageScope';

export const deleteFrontComponentStorageItem = ({
  namespace,
  storageType,
  key,
}: FrontComponentStorageScope & { key: string }): void => {
  const storage =
    storageType === 'localStorage'
      ? window.localStorage
      : window.sessionStorage;

  storage.removeItem(`${namespace}${key}`);
};
