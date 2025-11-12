# Codebase Exploration Summary

## Overview
Successfully explored the dashboard-bhnt codebase to understand the database system, notification structure, task management, and backend architecture.

## Key Findings

### 1. Database System: Firebase/Firestore
- **Type**: Google Cloud Firestore (NoSQL)
- **Project ID**: `thinksmart-main-plan`
- **SDK Version**: 10.7.1 (from CDN)
- **Location**: `/firestore.rules` (security rules defined)
- **Frontend-Only**: Client-side JavaScript, no backend server
- **Real-Time Sync**: Uses Firestore `onSnapshot()` listeners for live updates

### 2. Notifications (In-Memory Only)
**IMPORTANT**: Notifications are NOT persisted to Firestore!
- Stored in `let notifications = []` (line 1668)
- Lost on page refresh
- Max 50 notifications kept in memory
- 5-day retention policy for read notifications
- 3 types: 'completed', 'overdue', 'comment'
- Created via `pushNotification()` function (line 3420)
- Cleaned up via `cleanupNotifications()` function (line 3471)

### 3. Comments (Persisted)
**Comments are fully persisted to Firestore:**
- Storage: `projects/{projectId}.taskState[taskId].comments[]`
- Max 50 comments per task
- Structure: `{ text, userName, timestamp }`
- Text length: max 2000 characters
- Username length: max 200 characters
- Automatically trigger 'comment' notifications
- Synchronized via `syncTaskState()` function

### 4. Tasks Structure
**Tasks are stored in nested collection:**
- Path: `/projects/{projectId}/menus/{menuId}/tasks/{taskId}`
- Fields: `name`, `description`, `startDate`, `endDate`, `assigneeId`, `order`
- Task completion tracked separately in `taskState` object
- Assignees tracked via `assigneeId` foreign key
- Ordered by `order` field

**Task State (Separate):**
- Path: `projects/{projectId}.taskState[taskId]`
- Fields: `completed`, `link`, `completedAt`, `updatedAt`, `comments[]`
- Allows flexible tracking without modifying task metadata

### 5. Assignees Tracking
- Collection: `/projects/{projectId}/assignees/{assigneeId}`
- Structure: `{ name, email, createdAt, updatedAt }`
- Relationship: Many tasks → One assignee (N:1)
- Admin-only CRUD operations
- Loaded via `loadAssignees()` function (line 7473)

### 6. Backend Architecture
**Frontend-Only Approach:**
- No backend server or APIs
- All operations direct Firestore SDK calls
- Real-time sync via `onSnapshot()` listeners (line 7600)
- Security enforced via Firestore rules
- Data normalization in client

**Key Functions:**
- `syncTaskState()`: Persists state to Firestore
- `updateProjectData()`: Updates project document
- `pushNotification()`: Creates in-memory notification
- `saveTaskComment()`: Adds comment and triggers notification
- `loadMenuTasks()`: Loads tasks from Firestore
- `recordActivityEntry()`: Records to activity logs

### 7. Existing Patterns

**Comment Creation Pattern:**
```javascript
state.comments.push({
  text: commentText,
  userName: commenterName,
  timestamp: new Date().toISOString()
});
syncTaskState();  // Persists to Firestore
pushNotification('comment', task, commenterName);  // In-memory notification
```

**Notification Creation Pattern:**
```javascript
pushNotification(type, task, performerName);
renderNotifications();  // Updates UI
```

**Task State Sync Pattern:**
```javascript
// Update local state
taskState[taskId].completed = true;
taskState[taskId].completedAt = new Date().toISOString();

// Persist to Firestore
syncTaskState();  // Calls updateProjectData()

// Real-time listener picks up change
onSnapshot(projectRef, snapshot => {
  taskState = normalizeTaskState(snapshot.data().taskState);
  updateUI();
});
```

---

## Data Persistence Summary

| Component | Persisted | Location | Notes |
|-----------|-----------|----------|-------|
| **Tasks** | YES | `/projects/{id}/menus/{id}/tasks` | Firestore collection |
| **Task State** | YES | `/projects/{id}.taskState[taskId]` | Document field |
| **Comments** | YES | `.taskState[taskId].comments[]` | Nested array, synced |
| **Notifications** | NO | `let notifications[]` | In-memory only, lost on refresh |
| **Activity Logs** | YES | `/projects/{id}.activityLogs` | Document field, max 200 |
| **Assignees** | YES | `/projects/{id}/assignees` | Firestore collection |
| **Menus** | YES | `/projects/{id}/menus` | Firestore collection |
| **Users** | YES | `/users` | Firestore collection |

---

## Code Locations Reference

**Core Files:**
- `/index.html` (7900+ lines - main app)
- `/TaskItem.js` (Task rendering component)
- `/TaskList.js` (Task list component)
- `/ActivityLog.js` (Activity log component)
- `/firestore.rules` (Security rules)

**Key Functions Locations:**
| Function | Line | Purpose |
|----------|------|---------|
| `pushNotification()` | 3420 | Create notification |
| `cleanupNotifications()` | 3471 | 5-day retention cleanup |
| `renderNotifications()` | 3510 | Display notifications |
| `saveTaskComment()` | 2505 | Add comment to task |
| `loadAssignees()` | 7473 | Load assignees from Firestore |
| `loadMenuTasks()` | 6912 | Load tasks from Firestore |
| `syncTaskState()` | 5526 | Persist state to Firestore |
| `sanitizeTaskState()` | 2335 | Validate task state |
| `normalizeTaskState()` | 2393 | Normalize from Firestore |
| `saveTaskForm()` | 7180 | Create/update task |
| `onSnapshot()` | 7600 | Real-time listener setup |

---

## Important Notes

### Notifications Are NOT Persisted
If you need to add notification persistence:
1. Create `/projects/{projectId}/notifications` collection
2. Modify `pushNotification()` to also write to Firestore
3. Update security rules to allow notification CRUD
4. Implement notification history queries
5. Consider pagination for notification lists

### Comments Automatically Trigger Notifications
When a comment is saved:
1. Comment is added to `taskState[taskId].comments[]`
2. `syncTaskState()` persists to Firestore
3. `pushNotification('comment', ...)` creates in-memory notification
4. `renderNotifications()` updates the UI
5. Notification will be cleaned up after 5 days (if read)

### Real-Time Synchronization
Multiple users editing same project:
1. User A modifies taskState locally
2. `syncTaskState()` pushes to Firestore
3. Firestore real-time listener notifies all clients
4. User B's local taskState is updated
5. UI re-renders automatically (no polling)

---

## Files Generated
1. **CODEBASE_ARCHITECTURE.md** (420 lines)
   - Detailed architectural overview
   - Database structure diagrams
   - Function references
   - Security rules explanation

2. **QUICK_REFERENCE.md** (155 lines)
   - Quick lookup guide
   - Key function locations
   - Common code patterns
   - Implementation notes

3. **DATABASE_RELATIONSHIPS.md** (502 lines)
   - Visual data flow diagrams
   - Entity relationship diagram
   - Lifecycle flows (comments, notifications, tasks)
   - Synchronization patterns

4. **EXPLORATION_SUMMARY.md** (this file)
   - Executive summary
   - Key findings
   - Data persistence table
   - Important notes

---

## Next Steps
Based on this exploration, you can now:
1. Understand the notification system requirements
2. Design comment notification persistence (if needed)
3. Implement new notification types
4. Extend the task/comment system
5. Modify security rules for new features
6. Add notification history queries
7. Implement notification preferences

All documentation is in the repository root for easy reference.
