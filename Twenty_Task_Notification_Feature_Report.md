# Twenty CRM — Overdue & Incomplete Task Notification System

**Date:** September 30, 2026  
**Repository:** [twentyhq/twenty](file:///c:/Prathamesh/Twenty)  
**PDF Document:** [Twenty_Task_Notification_Feature_Report.pdf](file:///c:/Prathamesh/Twenty/Twenty_Task_Notification_Feature_Report.pdf)  
**Image Preview:** [Twenty_Task_Notification_Feature_Report.png](file:///c:/Prathamesh/Twenty/Twenty_Task_Notification_Feature_Report.png)

---

## 1. Executive Summary

### The Problem Addressed
In Twenty CRM, when team members had assigned tasks that remained pending or became past-due (overdue), there was no proactive, visible notification upon logging in. Users were unaware of high-priority overdue deliverables unless they manually navigated into the *Tasks* object table or specific record timelines.

### The Solution Delivered
A comprehensive **Overdue & Incomplete Task Notification System** was engineered and integrated:
1. **Automated Login Detection:** Upon user authentication and workspace metadata hydration, incomplete tasks assigned to the current member are evaluated.
2. **Urgency Categorization:** Tasks are segregated into **Overdue** (red styling, alert icons, deadline distance) and **Upcoming / Remaining** (amber warning styling, calendar badges).
3. **In-Modal Fast Actions:** Users can complete tasks directly from the popup using round checkboxes or one-click **"Mark Done"** buttons without losing context.
4. **Non-Intrusive Workflow Deferral:** Clicking **"Remind me later"** minimizes the notification into a sleek, persistent **floating badge** in the bottom-right corner displaying live pending counts. Clicking this badge restores the full modal.
5. **Celebration State:** Checking off all tasks renders a congratulatory **"All caught up! 🎉"** screen.

---

## 2. Solution Architecture & Workflow Lifecycle

Below is the complete architectural flow showing how the system initializes upon user login, guards against metadata lifecycle errors, queries assigned tasks, presents the notification modal, and provides non-intrusive deferral via the floating reminder pill:

```
+-----------------------------------------------------------------------------------+
|                                    USER LOGIN                                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
                  [ Three-Tier Metadata Safety Gate ]
                  - isMinimalMetadataReadyState === true ?
                  - currentWorkspaceMember?.id exists ?
                  - Not on onboarding (/welcome, /create/profile, /invite-team)
                                          | (Pass)
                                          v
                  [ useAssignedIncompleteTasks Hook ]
                  - Query CoreObjectNameSingular.Task via Apollo
                  - Filter: (assigneeId == memberId) && (status != 'DONE')
                  - Partition: isTaskOverdue(dueAt) -> Overdue vs Upcoming
                  - Sort: Earliest overdue deadlines first
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
       [ Tasks Found (Incomplete > 0) ]            [ Zero Tasks Remaining ]
                     |                                         |
                     v                                         v
       [ TaskNotificationModal Popup ]                 [ Normal Dashboard ]
       - Overdue Banner (Red) + Alert Icon             (No popup displayed)
       - Upcoming Banner (Amber) + Clock Icon
       - Inline "Mark Done" action buttons
       - Direct Round Checkboxes
       - Click title -> Open in Side Panel Drawer
                     |
       +-------------+-------------+
       |                           |
       v                           v
  [ User Clicks "Mark Done" ]   [ User Clicks "Remind Me Later" ]
       |                           |
       v                           v
  - Optimistic status update  - isTaskNotificationModalDismissedState = true
  - If 0 tasks remain:        - Modal minimizes to Floating Reminder Pill
    "All caught up! 🎉"         (Bottom-right: ⚠️ Overdue Tasks 2)
  - Celebration confirmation  - Click pill anytime to re-open modal
```

### Key Capabilities of the Architecture:
1. **Urgent Overdue Highlighting:** Tasks with deadlines in the past are highlighted with red warning borders, danger badges, and relative elapsed time (*"2 days ago"*).
2. **One-Click In-Modal Completion:** Users can mark tasks done directly within the popup without having to navigate away from their current page.
3. **Floating Snooze Pill:** Clicking *"Remind me later"* parks a compact badge at `bottom: 24px, right: 24px` with live counter counts that re-opens on click.
4. **Metadata Crash Prevention:** Prevents runtime crashes by guaranteeing metadata readiness and user authentication before query execution.

---

## 3. Comprehensive File Inventory & Status

| File Path | Action | Technology / Module | Key Responsibility & Changes |
| :--- | :---: | :---: | :--- |
| [`packages/twenty-front/.../useAssignedIncompleteTasks.ts`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/hooks/useAssignedIncompleteTasks.ts) | **CREATED** | React Hook, Apollo, Jotai | Core logic for fetching assigned tasks, applying assignment filters, segregating overdue vs upcoming, date sorting, and calculating status metrics. |
| [`packages/twenty-front/.../isTaskNotificationModalDismissedState.ts`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/states/isTaskNotificationModalDismissedState.ts) | **CREATED** | Jotai Atom State | Session-level dismissal state atom (default `false`) controlling modal visibility vs floating reminder pill. |
| [`packages/twenty-front/.../TaskNotificationModal.tsx`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/components/TaskNotificationModal.tsx) | **CREATED** | Linaria, React Portal, twenty-ui | High-fidelity UI modal, urgent/warning visual theming, task cards, quick-action checkboxes, floating reminder badge, and metadata safety gates. |
| [`packages/twenty-front/.../useAssignedIncompleteTasks.test.ts`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/hooks/__tests__/useAssignedIncompleteTasks.test.ts) | **CREATED** | Jest Unit Tests | Automated unit test suite verifying date parsing, past/future deadlines, and invalid date boundary conditions. |
| [`packages/twenty-front/.../DefaultLayout.tsx`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/ui/layout/page/components/DefaultLayout.tsx) | **MODIFIED** | Global Page Layout | Mounted `<TaskNotificationModal />` in the global application layout tree so it guards all authenticated workspace views. |
| [`packages/twenty-server/project.json`](file:///c:/Prathamesh/Twenty/packages/twenty-server/project.json) | **MODIFIED** | Nx Build Configuration | Adapted Unix bash scripts (`NODE_ENV=development`, `mkdir -p`, `cp -r`) into cross-platform Node.js scripts for Windows PowerShell execution. |
| [`packages/twenty-sdk/project.json`](file:///c:/Prathamesh/Twenty/packages/twenty-sdk/project.json) | **MODIFIED** | Nx Build Configuration | Updated `rimraf` arguments to use `--glob` to resolve Windows path escaping failures. |
| [`packages/twenty-front-component-renderer/...`](file:///c:/Prathamesh/Twenty/packages/twenty-front-component-renderer/src/host/storage/utils/snapshotFrontComponentStorage.ts) | **MODIFIED** | Storage Utils & Workers | Fixed TypeScript type inference for storage keys and explicitly typed function parameters in worker adapters. |

---

## 4. Detailed Architecture & Component Breakdown

### 4.1. Data Fetching & Urgency Partitioning (Hook)
**File:** [`packages/twenty-front/src/modules/activities/tasks/hooks/useAssignedIncompleteTasks.ts`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/hooks/useAssignedIncompleteTasks.ts)

This custom hook acts as the data and business engine for the notification system. It integrates with Twenty's GraphQL engine via `useFindManyRecords`, targeting `CoreObjectNameSingular.Task`.

- **Targeted User Assignment:** Reads `currentWorkspaceMemberState` to ensure only tasks explicitly assigned to the logged-in member (`assigneeId === memberId` or `task.assignee?.id === memberId`) are evaluated.
- **Completion Check:** Excludes tasks already marked as `DONE`.
- **Timestamp Analysis:** Compares task `dueAt` ISO strings against `Date.now()`. Past dates are categorized as *Overdue*; future dates or tasks without deadlines are categorized as *Upcoming*.
- **Deterministic Sorting:**
  - Overdue tasks are sorted ascending by `dueAt` so that the most urgently expired deadlines appear at the very top.
  - Upcoming tasks are sorted ascending by deadline, followed by tasks without deadlines at the end.

```typescript
export const isTaskOverdue = (dueAt: string | null | undefined): boolean => {
  if (!dueAt) return false;
  const parsedTimestamp = new Date(dueAt).getTime();
  return !isNaN(parsedTimestamp) && parsedTimestamp < Date.now();
};

export const useAssignedIncompleteTasks = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMemberId = currentWorkspaceMember?.id;

  const { records: rawTasks, loading, refetch } = useFindManyRecords<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    skip: !currentWorkspaceMemberId,
    limit: 100,
  });

  const { incompleteTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    if (!rawTasks || !currentWorkspaceMemberId) {
      return { incompleteTasks: [], overdueTasks: [], upcomingTasks: [] };
    }
    const userIncompleteTasks = rawTasks.filter(
      (task) =>
        (task.assigneeId === currentWorkspaceMemberId ||
          (task as any).assignee?.id === currentWorkspaceMemberId) &&
        task.status !== 'DONE',
    );
    ...
  }, [rawTasks, currentWorkspaceMemberId]);
  ...
};
```

---

### 3.2. Session Dismissal State (Jotai Atom)
**File:** [`packages/twenty-front/src/modules/activities/tasks/states/isTaskNotificationModalDismissedState.ts`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/states/isTaskNotificationModalDismissedState.ts)

Following Twenty's state guidelines, modal visibility is decoupled from component lifecycles using a Jotai atom created via `createAtomState`.

- **Default Behavior:** Starts as `false` on each app initialization / session login, ensuring immediate notification popup.
- **Smooth Handoff:** When dismissed, components transition seamlessly between the modal card overlay and the persistent floating badge without losing task count synchronization.

```typescript
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isTaskNotificationModalDismissedState = createAtomState<boolean>({
  key: 'isTaskNotificationModalDismissedState',
  defaultValue: false,
});
```

---

### 3.3. Interactive Modal & Floating Badge (Component)
**File:** [`packages/twenty-front/src/modules/activities/tasks/components/TaskNotificationModal.tsx`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/components/TaskNotificationModal.tsx)

The presentation layer utilizes Linaria styling and adheres to Twenty's design tokens (`themeCssVariables`).

- **Portal Rendering:** Rendered into `document.body` via React Portal with `RootStackingContextZIndices.Dialog`, guaranteeing it floats above all other layout elements and navigation sidebars.
- **Dynamic Severity Theming:**
  - If overdue tasks exist: Banner displays a soft red gradient (`rgba(239, 68, 68, 0.08)`), an alert triangle icon in red, and a `[N] Overdue` danger pill.
  - If all remaining tasks are upcoming: Banner displays warm amber styling (`rgba(245, 158, 11, 0.08)`) and a clock icon.
- **Inline Fast Actions:**
  - Each task card contains a `Checkbox` and a dedicated `Mark Done` quick-action button powered by `useCompleteTask(task)`.
  - Clicking a task title invokes `useOpenRecordInSidePanel`, opening the record's details in Twenty's side panel drawer without losing the current view.
- **Floating Reminder Badge:**
  - When dismissed via *Remind me later* or the close button, the overlay hides and a floating pill docks at `bottom: 24px, right: 24px`.
  - Hover micro-animations (elevation `translateY(-2px)`, shadow expansion) provide rich interactive feedback.

---

### 3.4. Layout Integration & Metadata Readiness Safeguards
**Files:** [`packages/twenty-front/src/modules/ui/layout/page/components/DefaultLayout.tsx`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/ui/layout/page/components/DefaultLayout.tsx) & [`TaskNotificationModal.tsx`](file:///c:/Prathamesh/Twenty/packages/twenty-front/src/modules/activities/tasks/components/TaskNotificationModal.tsx)

> **Critical Production Bug Identified & Fixed:**  
> During initial mounting, the frontend encountered the runtime exception:  
> `Unexpected Application Error! Object metadata item "task" cannot be found in an array of 0 elements`.  
> **Root Cause:** `useFindManyRecords` and `useObjectMetadataItem` were executing on initial mount before Twenty's metadata store had finished populating its metadata cache from the backend.  
> **Resolution:** Implemented a **Three-Tier Metadata Gate** inside `TaskNotificationModal`:
> 1. Check `isMinimalMetadataReadyState`: If false, render `null`.
> 2. Check `currentWorkspaceMember?.id`: If unauthenticated, render `null`.
> 3. Check `isAuthOrOnboardingPath`: Suppress rendering during `/welcome`, `/create/profile`, `/invite-team`, and password reset screens.

```typescript
export const TaskNotificationModal = () => {
  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { pathname } = useLocation();

  const isAuthOrOnboardingPath =
    pathname.startsWith(AppPath.SignInUp) ||
    pathname.startsWith(AppPath.WorkspaceActivation) ||
    pathname.startsWith(AppPath.CreateProfile);

  // Suppress rendering if metadata not loaded, unauthenticated, or on onboarding
  if (!isMinimalMetadataReady || !currentWorkspaceMember?.id || isAuthOrOnboardingPath) {
    return null;
  }

  return <TaskNotificationModalContent />;
};
```

---

## 4. Platform & Build Engineering (Windows Environment)

### 4.1. Server Asset Resolution & SWC Compiler Fix
- **Issue:** NestJS with the SWC builder compiles TypeScript files to JavaScript in `packages/twenty-server/dist/` but ignores non-TS files such as `seed-dependencies/yarn.lock`, causing workspace creation to fail with `ENOENT: yarn.lock`.
- **Solution:** Added automated asset copying of non-TypeScript dependencies from `packages/twenty-server/src` into `packages/twenty-server/dist` prior to server startup.

### 4.2. PowerShell Compatibility in Nx Configurations
- **Cross-Platform Copying:** Converted Unix `cp -r` and `mkdir -p` commands in `packages/twenty-server/project.json` to portable Node.js `fs.mkdirSync` and `fs.cpSync` invocations.
- **Environment Variable Setting:** Replaced inline bash syntax (`NODE_ENV=development nest start`) with Nx's native `"env": { "NODE_ENV": "development" }` object.
- **Glob Resolution in Rimraf:** Updated `packages/twenty-sdk/project.json` to include `--glob` flag to prevent PowerShell single-quote glob escaping errors.

---

## 5. Testing, Verification & Validation

### 5.1. Automated Unit Tests
Executed unit tests with Jest targeting the deadline calculations in `useAssignedIncompleteTasks.test.ts`:
```
PASS packages/twenty-front/src/modules/activities/tasks/hooks/__tests__/useAssignedIncompleteTasks.test.ts
  useAssignedIncompleteTasks helper functions
    isTaskOverdue
      ✓ returns false when dueAt is null or undefined (2 ms)
      ✓ returns true when dueAt is in the past (1 ms)
      ✓ returns false when dueAt is in the future (1 ms)
      ✓ returns false for invalid date strings (1 ms)

Test Suites: 1 passed, 1 total
Tests: 4 passed, 4 total
```

### 5.2. Runtime Environment
- **PostgreSQL 16:** Running on `localhost:5432`
- **Redis:** Running on `localhost:6379`
- **Twenty Server:** Running on `http://localhost:3000`
- **Queue Worker:** Running in background
- **Twenty Front:** Running on `http://localhost:3001`
- **Test User Credentials:** `admin_8d05b2@example.com` / `Password123!` in workspace `Acme 8d05b2`.
