import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Stores whether the user has temporarily dismissed the task notification modal in this session.
// Defaults to false so the notification appears whenever the user logs in or starts a session.
export const isTaskNotificationModalDismissedState = createAtomState<boolean>({
  key: 'isTaskNotificationModalDismissedState',
  defaultValue: false,
});
