# Quick Reference: Key Code Locations

## Database Configuration
- **Firebase Config**: `index.html` line 1392 (`window.FIREBASE_CONFIG`)
- **Project ID**: `index.html` line 1420 (`STATIC_PROJECT_ID = 'thinksmart-main-plan'`)
- **Security Rules**: `/firestore.rules`
- **Firebase SDK**: v10.7.1 (CDN import at line 1399-1400)

## Notifications System
- **Global State**: `index.html` lines 1668-1670
  - `let notifications = []`
  - `let notificationState = {}`
  - `let notificationsInitialized = false`

- **Create Notification**: `pushNotification()` at line 3420
  - Types: 'completed', 'overdue', 'comment'
  - Max 50 notifications in memory
  - Called by comment saving, task completion, overdue detection

- **Cleanup**: `cleanupNotifications()` at line 3471
  - 5-day retention policy
  - Keeps unread forever, deletes old read notifications

- **Render**: `renderNotifications()` at line 3510
  - Updates bell icon and dropdown list
  - Shows unread count badge

## Comments System
- **Save Function**: `saveTaskComment()` at line 2505
- **Storage Location**: `projects/{projectId}.taskState[taskId].comments`
- **Structure**: `{ text, userName, timestamp }`
- **Sanitization**: Lines 2345-2360 (max 2000 chars text, 200 chars username)
- **Limits**: Max 50 per task, max 50 comments per task

## Tasks System
- **Task Model**: Lines 7184-7196
  ```javascript
  {
    name, description, startDate, endDate,
    assigneeId, order, createdAt, updatedAt
  }
  ```

- **Task State**: Separate structure in `projects/{projectId}.taskState`
  ```javascript
  {
    completed: boolean,
    link: string,
    completedAt: timestamp,
    updatedAt: timestamp,
    comments: []
  }
  ```

- **Loading**: `loadMenuTasks(menuId)` at line 6912
- **Creating**: `saveTaskForm()` at line 7180
- **Completion Detection**: `isTaskCompleted()` in TaskItem.js line 29

## Assignees System
- **Collection**: `/projects/{projectId}/assignees/{assigneeId}`
- **Structure**: `{ name, email, createdAt, updatedAt }`
- **Loading**: `loadAssignees()` at line 7473
- **Task Assignment**: Task has `assigneeId` field
- **Lookup**: `assignees.find(a => a.id === task.assigneeId)`

## State Synchronization
- **Main Sync**: `syncTaskState()` at line 5526
  - Sanitizes taskState and activityLogs
  - Calls `updateProjectData()`

- **Update Function**: `updateProjectData()` at line 5517
  - Uses `updateDoc(projectRef, ...)`
  - Adds `updatedAt: serverTimestamp()`

- **Real-time Listener**: `onSnapshot()` at line 7600
  - Listens to `/projects/{projectId}`
  - Normalizes incoming data
  - Triggers `updateUI()`

## Activity Logs
- **Storage**: `projects/{projectId}.activityLogs` (Array)
- **Record Function**: `recordActivityEntry()` at line 2450
- **Structure**: `{ id, taskId, taskName, phase, status, completedAt, updatedAt, performedBy, menuId }`
- **Max Records**: 200 (auto-trimmed)

## Helper Functions
| Function | Location | Purpose |
|----------|----------|---------|
| `ensureProjectId()` | 5513 | Get current project ID |
| `ensureTaskEntry()` | 2370 | Ensure task state exists |
| `sanitizeTaskState()` | 2335 | Validate task state |
| `normalizeTaskState()` | 2393 | Normalize from Firestore |
| `sanitizeActivityLogs()` | 2414 | Validate activity logs |
| `getCurrentUserName()` | (search needed) | Get current user display name |
| `findCompletionPerformer()` | (search needed) | Find who completed task |
| `recordActivityEntry()` | 2450 | Add activity log entry |
| `escapeHtml()` | (search needed) | Prevent XSS |

## File Structure
```
/home/user/dashboard-bhnt/
├── index.html          (Main app - 7900+ lines)
├── TaskItem.js         (Task rendering component)
├── TaskList.js         (Task list component)
├── ActivityLog.js      (Activity log component)
├── firestore.rules     (Security rules)
├── firebase.json       (Firebase config)
└── CODEBASE_ARCHITECTURE.md (Detailed analysis)
```

## Key Implementation Notes
1. **Notifications are NOT persisted** to Firestore
2. **Comments ARE persisted** with taskState
3. **Comments trigger notifications** automatically
4. **Task completion** is tracked in separate `taskState` object
5. **Frontend-only** architecture (no backend server)
6. **Real-time sync** via Firestore listeners
7. **Admin-only writes** to tasks/menus/assignees
8. **5-day retention** for read notifications

## Common Patterns
### Creating a Notification
```javascript
pushNotification('comment', task, getCurrentUserName());
renderNotifications();
```

### Saving a Comment
```javascript
state.comments.push({
  text: commentText,
  userName: commenterName,
  timestamp: new Date().toISOString()
});
syncTaskState();
```

### Loading Data from Firestore
```javascript
const snapshot = await getDocs(
  query(
    collection(db, 'projects', projectId, 'menus', menuId, 'tasks'),
    orderBy('order')
  )
);
```

### Updating Task State
```javascript
await updateDoc(
  doc(db, 'projects', projectId, 'menus', menuId, 'tasks', taskId),
  { /* updates */ }
);
syncTaskState();
```
