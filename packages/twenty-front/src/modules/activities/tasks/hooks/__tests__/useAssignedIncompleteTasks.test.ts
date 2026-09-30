import { isTaskOverdue } from '@/activities/tasks/hooks/useAssignedIncompleteTasks';

describe('useAssignedIncompleteTasks helper functions', () => {
  describe('isTaskOverdue', () => {
    it('returns false when dueAt is null or undefined', () => {
      expect(isTaskOverdue(null)).toBe(false);
      expect(isTaskOverdue(undefined)).toBe(false);
      expect(isTaskOverdue('')).toBe(false);
    });

    it('returns true when dueAt is in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      expect(isTaskOverdue(pastDate)).toBe(true);
    });

    it('returns false when dueAt is in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      expect(isTaskOverdue(futureDate)).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isTaskOverdue('not-a-valid-date')).toBe(false);
    });
  });
});
