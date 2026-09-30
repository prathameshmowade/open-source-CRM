import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { type Task } from '@/activities/types/Task';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const isTaskOverdue = (dueAt: string | null | undefined): boolean => {
  if (!dueAt) return false;
  const parsedTimestamp = new Date(dueAt).getTime();
  return !isNaN(parsedTimestamp) && parsedTimestamp < Date.now();
};

export const useAssignedIncompleteTasks = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMemberId = currentWorkspaceMember?.id;

  const {
    records: rawTasks,
    totalCount: serverTotalCount,
    loading,
    error,
    refetch,
    objectMetadataItem,
  } = useFindManyRecords<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    skip: !currentWorkspaceMemberId,
    limit: 100,
  });

  // eslint-disable-next-line no-console
  console.log('[DEBUG useAssignedIncompleteTasks]', {
    currentWorkspaceMemberId,
    serverTotalCount,
    rawTasksCount: rawTasks?.length,
    rawTasks,
    loading,
    error: error?.message || error,
    objectMetadataId: objectMetadataItem?.id,
  });

  const { incompleteTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    if (!rawTasks || !currentWorkspaceMemberId) {
      return {
        incompleteTasks: [],
        overdueTasks: [],
        upcomingTasks: [],
      };
    }

    // Filter in JS to strictly enforce assignment and non-completion
    const userIncompleteTasks = rawTasks.filter(
      (task) =>
        (task.assigneeId === currentWorkspaceMemberId ||
          (task as any).assignee?.id === currentWorkspaceMemberId) &&
        task.status !== 'DONE',
    );

    const overdue: Task[] = [];
    const upcoming: Task[] = [];

    for (const task of userIncompleteTasks) {
      if (isTaskOverdue(task.dueAt)) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    }

    // Sort overdue tasks: earliest overdue first
    overdue.sort((taskA, taskB) => {
      const timeA = taskA.dueAt ? new Date(taskA.dueAt).getTime() : 0;
      const timeB = taskB.dueAt ? new Date(taskB.dueAt).getTime() : 0;
      return timeA - timeB;
    });

    // Sort upcoming tasks: earliest due first, then tasks without due dates
    upcoming.sort((taskA, taskB) => {
      if (!taskA.dueAt && !taskB.dueAt) return 0;
      if (!taskA.dueAt) return 1;
      if (!taskB.dueAt) return -1;
      return new Date(taskA.dueAt).getTime() - new Date(taskB.dueAt).getTime();
    });

    return {
      incompleteTasks: [...overdue, ...upcoming],
      overdueTasks: overdue,
      upcomingTasks: upcoming,
    };
  }, [rawTasks, currentWorkspaceMemberId]);

  return {
    incompleteTasks,
    overdueTasks,
    upcomingTasks,
    hasIncompleteTasks: incompleteTasks.length > 0,
    hasOverdueTasks: overdueTasks.length > 0,
    overdueCount: overdueTasks.length,
    upcomingCount: upcomingTasks.length,
    totalCount: incompleteTasks.length,
    loading,
    refetch,
    currentWorkspaceMember,
  };
};
