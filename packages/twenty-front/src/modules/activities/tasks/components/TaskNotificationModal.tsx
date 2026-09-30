import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { Button } from 'twenty-ui/primitives/input';
import { Checkbox } from 'twenty-ui/primitives/input';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconX,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

import { useCompleteTask } from '@/activities/tasks/hooks/useCompleteTask';
import {
  isTaskOverdue,
  useAssignedIncompleteTasks,
} from '@/activities/tasks/hooks/useAssignedIncompleteTasks';
import { isTaskNotificationModalDismissedState } from '@/activities/tasks/states/isTaskNotificationModalDismissedState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { isMinimalMetadataReadyState } from '@/metadata-store/states/isMinimalMetadataReadyState';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useNavigateApp } from '~/hooks/useNavigateApp';

const StyledOverlay = styled.div`
  align-items: center;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(6px);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: ${themeCssVariables.spacing[4]};
  position: fixed;
  right: 0;
  top: 0;
  z-index: ${RootStackingContextZIndices.Dialog};
  animation: fadeInModal 0.2s ease-out;

  @keyframes fadeInModal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledModalCard = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.lg};
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  max-width: 580px;
  overflow: hidden;
  position: relative;
  width: 100%;
  animation: slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUpModal {
    from {
      transform: translateY(20px) scale(0.97);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;

const StyledHeader = styled.div<{ hasOverdue: boolean }>`
  align-items: flex-start;
  background: ${({ hasOverdue }) =>
    hasOverdue
      ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0) 100%)'
      : 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0) 100%)'};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[6]};
`;

const StyledHeaderIconWrapper = styled.div<{ hasOverdue: boolean }>`
  align-items: center;
  background: ${({ hasOverdue }) =>
    hasOverdue
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(245, 158, 11, 0.15)'};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${({ hasOverdue }) =>
    hasOverdue
      ? themeCssVariables.color.red
      : themeCssVariables.color.amber};
  display: flex;
  flex-shrink: 0;
  height: 40px;
  justify-content: center;
  width: 40px;
`;

const StyledHeaderText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledHeaderTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.01em;
  margin: 0;
`;

const StyledHeaderSubtitle = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  margin: 0;
`;

const StyledCloseButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  height: 28px;
  justify-content: center;
  padding: 0;
  transition: color 0.15s ease, background 0.15s ease;
  width: 28px;

  &:hover {
    background: ${themeCssVariables.background.secondary};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledBadgesRow = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const StyledBadge = styled.span<{ variant: 'danger' | 'warning' | 'neutral' }>`
  align-items: center;
  background: ${({ variant }) => {
    switch (variant) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.12)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.12)';
      default:
        return themeCssVariables.background.tertiary;
    }
  }};
  border-radius: 9999px;
  color: ${({ variant }) => {
    switch (variant) {
      case 'danger':
        return themeCssVariables.color.red;
      case 'warning':
        return themeCssVariables.color.amber;
      default:
        return themeCssVariables.font.color.secondary;
    }
  }};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  padding: 2px 8px;
`;

const StyledTaskListContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-height: 380px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[6]};
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const StyledSectionDot = styled.span<{ color: 'danger' | 'warning' }>`
  background: ${({ color }) =>
    color === 'danger'
      ? themeCssVariables.color.red
      : themeCssVariables.color.amber};
  border-radius: 50%;
  height: 6px;
  width: 6px;
`;

const StyledTaskItemCard = styled.div<{ isOverdue: boolean }>`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid
    ${({ isOverdue }) =>
      isOverdue
        ? 'rgba(239, 68, 68, 0.25)'
        : themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${themeCssVariables.background.tertiary};
    border-color: ${({ isOverdue }) =>
      isOverdue
        ? themeCssVariables.color.red
        : themeCssVariables.border.color.medium};
    transform: translateY(-1px);
  }
`;

const StyledTaskItemContent = styled.div`
  cursor: pointer;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledTaskItemTitle = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const StyledTaskItemMeta = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledDueDateText = styled.span<{ isOverdue: boolean }>`
  align-items: center;
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 4px;
`;

const StyledQuickActionButton = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 4px;
  padding: 4px 8px;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.primary};
    border-color: ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledFooter = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]};
`;

const StyledCelebrationContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[6]};
  text-align: center;
`;

const StyledCelebrationIcon = styled.div`
  align-items: center;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 50%;
  color: ${themeCssVariables.color.green};
  display: flex;
  height: 56px;
  justify-content: center;
  width: 56px;
`;

const StyledFloatingReminderBadge = styled.button<{ hasOverdue: boolean }>`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid
    ${({ hasOverdue }) =>
      hasOverdue
        ? 'rgba(239, 68, 68, 0.4)'
        : 'rgba(245, 158, 11, 0.4)'};
  border-radius: 9999px;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.25);
  bottom: 24px;
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: 8px 16px;
  position: fixed;
  right: 24px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  z-index: ${RootStackingContextZIndices.Dialog - 1};

  &:hover {
    box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.35);
    transform: translateY(-2px);
  }
`;

const StyledFloatingText = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledFloatingCount = styled.span<{ hasOverdue: boolean }>`
  background: ${({ hasOverdue }) =>
    hasOverdue
      ? themeCssVariables.color.red
      : themeCssVariables.color.amber};
  border-radius: 9999px;
  color: #ffffff;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: 1px 7px;
`;

const TaskItem = ({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
}) => {
  const { completeTask } = useCompleteTask(task);
  const overdue = isTaskOverdue(task.dueAt);

  const formatDueDate = (dueAtStr: string | null) => {
    if (!dueAtStr) return t`No due date`;
    const date = new Date(dueAtStr);
    if (isNaN(date.getTime())) return t`No due date`;

    const relative = formatDistanceToNow(date, { addSuffix: true });
    const formatted = format(date, 'MMM d');
    return `${relative} (${formatted})`;
  };

  return (
    <StyledTaskItemCard isOverdue={overdue}>
      <Checkbox
        checked={task.status === 'DONE'}
        shape="round"
        onCheckedChange={(checked) => completeTask(Boolean(checked))}
      />
      <StyledTaskItemContent onClick={() => onTaskClick(task)}>
        <StyledTaskItemTitle title={task.title}>
          {task.title || t`Untitled task`}
        </StyledTaskItemTitle>
        <StyledTaskItemMeta>
          <StyledDueDateText isOverdue={overdue}>
            {overdue ? <IconAlertCircle size={14} /> : <IconCalendar size={14} />}
            {formatDueDate(task.dueAt)}
          </StyledDueDateText>
        </StyledTaskItemMeta>
      </StyledTaskItemContent>
      <StyledQuickActionButton
        onClick={() => completeTask(true)}
        title={t`Mark this task as done`}
      >
        <IconCheck size={14} />
        {t`Mark Done`}
      </StyledQuickActionButton>
    </StyledTaskItemCard>
  );
};

const TaskNotificationModalContent = () => {
  const {
    incompleteTasks,
    overdueTasks,
    upcomingTasks,
    hasIncompleteTasks,
    hasOverdueTasks,
    overdueCount,
    upcomingCount,
    totalCount,
  } = useAssignedIncompleteTasks();

  const [isDismissed, setIsDismissed] = useAtomState(
    isTaskNotificationModalDismissedState,
  );
  const [completedAllInSession, setCompletedAllInSession] = useState(false);

  const navigateApp = useNavigateApp();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  // Handle navigating to task detail
  const handleTaskClick = (task: Task) => {
    openRecordInSidePanel({
      recordId: task.id,
      objectNameSingular: CoreObjectNameSingular.Task,
    });
  };

  // Handle navigating to all tasks view
  const handleViewAllTasks = () => {
    setIsDismissed(true);
    navigateApp(AppPath.TasksPage);
  };

  // If all tasks were completed and marked done in this session
  if (!hasIncompleteTasks && completedAllInSession && !isDismissed) {
    return createPortal(
      <StyledOverlay onClick={() => setIsDismissed(true)}>
        <StyledModalCard onClick={(e) => e.stopPropagation()}>
          <StyledCelebrationContainer>
            <StyledCelebrationIcon>
              <IconCheck size={32} />
            </StyledCelebrationIcon>
            <StyledHeaderTitle>{t`All caught up! 🎉`}</StyledHeaderTitle>
            <StyledHeaderSubtitle>
              {t`You have completed all of your assigned tasks. Keep up the great work!`}
            </StyledHeaderSubtitle>
            <Button
              variant="solid"
              color="primary"
              onClick={() => setIsDismissed(true)}
            >
              {t`Got it`}
            </Button>
          </StyledCelebrationContainer>
        </StyledModalCard>
      </StyledOverlay>,
      document.body,
    );
  }

  // If no incomplete tasks remain at all, hide both modal and floating badge
  if (!hasIncompleteTasks) {
    return null;
  }

  // If dismissed during the current session, show floating reminder pill
  if (isDismissed) {
    return createPortal(
      <StyledFloatingReminderBadge
        hasOverdue={hasOverdueTasks}
        onClick={() => setIsDismissed(false)}
        title={t`Click to review your assigned tasks`}
      >
        {hasOverdueTasks ? (
          <IconAlertTriangle size={18} color={themeCssVariables.color.red} />
        ) : (
          <IconClock size={18} color={themeCssVariables.color.amber} />
        )}
        <StyledFloatingText>
          {hasOverdueTasks ? t`Overdue Tasks` : t`Pending Tasks`}
        </StyledFloatingText>
        <StyledFloatingCount hasOverdue={hasOverdueTasks}>
          {totalCount}
        </StyledFloatingCount>
      </StyledFloatingReminderBadge>,
      document.body,
    );
  }

  // Otherwise, present the task notification modal overlay
  return createPortal(
    <StyledOverlay onClick={() => setIsDismissed(true)}>
      <StyledModalCard onClick={(e) => e.stopPropagation()}>
        <StyledHeader hasOverdue={hasOverdueTasks}>
          <StyledHeaderIconWrapper hasOverdue={hasOverdueTasks}>
            {hasOverdueTasks ? (
              <IconAlertTriangle size={22} />
            ) : (
              <IconClock size={22} />
            )}
          </StyledHeaderIconWrapper>
          <StyledHeaderText>
            <StyledHeaderTitle>
              {hasOverdueTasks
                ? t`You have overdue tasks assigned`
                : t`You have pending tasks assigned`}
            </StyledHeaderTitle>
            <StyledHeaderSubtitle>
              {hasOverdueTasks
                ? t`Please review and complete your overdue tasks as soon as possible.`
                : t`Here are the tasks currently assigned to you that need your attention.`}
            </StyledHeaderSubtitle>
            <StyledBadgesRow>
              {overdueCount > 0 && (
                <StyledBadge variant="danger">
                  <IconAlertCircle size={12} />
                  {overdueCount} {t`Overdue`}
                </StyledBadge>
              )}
              {upcomingCount > 0 && (
                <StyledBadge variant="warning">
                  <IconClock size={12} />
                  {upcomingCount} {t`Remaining`}
                </StyledBadge>
              )}
            </StyledBadgesRow>
          </StyledHeaderText>
          <StyledCloseButton
            onClick={() => setIsDismissed(true)}
            title={t`Dismiss for now`}
          >
            <IconX size={18} />
          </StyledCloseButton>
        </StyledHeader>

        <StyledTaskListContainer>
          {overdueTasks.length > 0 && (
            <>
              <StyledSectionHeader>
                <StyledSectionDot color="danger" />
                {t`Overdue Tasks`} ({overdueTasks.length})
              </StyledSectionHeader>
              {overdueTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </>
          )}

          {upcomingTasks.length > 0 && (
            <>
              <StyledSectionHeader>
                <StyledSectionDot color="warning" />
                {t`Upcoming & Remaining Tasks`} ({upcomingTasks.length})
              </StyledSectionHeader>
              {upcomingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </>
          )}
        </StyledTaskListContainer>

        <StyledFooter>
          <Button
            variant="ghost"
            color="neutral"
            onClick={handleViewAllTasks}
          >
            {t`View all tasks`}
            <IconArrowRight size={14} style={{ marginLeft: 6 }} />
          </Button>

          <Button
            variant="solid"
            color="neutral"
            onClick={() => setIsDismissed(true)}
          >
            {t`Remind me later`}
          </Button>
        </StyledFooter>
      </StyledModalCard>
    </StyledOverlay>,
    document.body,
  );
};

export const TaskNotificationModal = () => {
  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { pathname } = useLocation();

  const isAuthOrOnboardingPath =
    pathname.startsWith(AppPath.SignInUp) ||
    pathname.startsWith(AppPath.Verify) ||
    pathname.startsWith(AppPath.VerifyEmail) ||
    pathname.startsWith(AppPath.ResetPassword) ||
    pathname.startsWith(AppPath.WorkspaceActivation) ||
    pathname.startsWith(AppPath.CreateProfile);

  // eslint-disable-next-line no-console
  console.log('[DEBUG TaskNotificationModal]', {
    isMinimalMetadataReady,
    memberId: currentWorkspaceMember?.id,
    pathname,
    isAuthOrOnboardingPath,
  });

  // Suppress rendering if metadata is not ready, user is unauthenticated, or on onboarding
  if (!isMinimalMetadataReady || !currentWorkspaceMember?.id || isAuthOrOnboardingPath) {
    return null;
  }

  return <TaskNotificationModalContent />;
};

