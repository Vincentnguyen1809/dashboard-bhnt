# Codebase Architecture Analysis: Dashboard BHNT

## 1. DATABASE SYSTEM

**Database**: Google Firebase/Firestore (Cloud Firestore)
- **Configuration**: Located in `index.html` at line 1392 (Firebase config injected at runtime)
- **Firebase SDK**: v10.7.1 (from CDN)
- **Project ID**: `thinksmart-main-plan` (STATIC_PROJECT_ID constant, line 1420)
- **Security Rules**: `/firestore.rules` (Firestore security rules defined)

### Database Structure:
```
/projects/{projectId}
├── taskState (Object with task completion states)
├── activityLogs (Array of activity entries)
├── notes (Array of note objects)
├── customTypes (Array of custom note types)
├── selectedNoteType (String)
├── settings (Project configuration object)
├── meta (Project metadata)
├── updatedAt (Timestamp)
│
├── /menus/{menuId}
│   ├── name (String)
│   ├── icon (String)
│   ├── slug (String - URL slug)
│   ├── order (Number)
│   ├── createdAt (Timestamp)
│   ├── updatedAt (Timestamp)
│   │
│   └── /tasks/{taskId}
│       ├── name (String - task name)
│       ├── description (String)
│       ├── startDate (Date)
│       ├── endDate (Date - deadline)
│       ├── assigneeId (String - FK to assignees)
│       ├── order (Number)
│       ├── createdAt (Timestamp)
│       ├── updatedAt (Timestamp)
│
├── /assignees/{assigneeId}
│   ├── name (String - department/team name)
│   ├── email (String - optional)
│   ├── createdAt (Timestamp)
│   ├── updatedAt (Timestamp)

/users/{userId}
├── email (String)
├── displayName (String)
├── role (String - 'admin' or 'user')
├── avatarUrl (String - optional)
├── updatedAt (Timestamp)
```

---

## 2. NOTIFICATIONS IMPLEMENTATION

### Current Structure (In-Memory Only):
**Location**: Lines 1668-1670 and 3420-3564 in `index.html`

```javascript
// Global notification state (in-memory, NOT persisted to Firestore)
let notifications = [];           // Array of notification objects
let notificationState = {};       // Tracks task completion/overdue status
let notificationsInitialized = false;

// Notification object structure:
{
  id: string,                    // Unique ID: "{type}-{taskId}-{timestamp}"
  taskId: string,                // Reference to the task
  type: string,                  // 'completed' | 'overdue' | 'comment'
  message: string,               // Human-readable message
  timestamp: string,             // ISO timestamp
  read: boolean,                 // Read/unread status
  ...additionalData             // Can include menuId and other metadata
}
```

### Notification Creation (`pushNotification` function, lines 3420-3467):
- **Triggered by**: Task completion, overdue detection, comment creation
- **Types**: `'completed'`, `'overdue'`, `'comment'`
- **Message formatting**: Uses task name, performer name, and task details
- **Comment notification special behavior**: Skips notification for the commenter themselves
- **Memory limitation**: Max 50 notifications kept in memory

### Notification Cleanup (`cleanupNotifications` function, lines 3471-3508):
- **Policy**: 5-day retention
- **Rules**:
  - Keep all unread notifications forever
  - Delete read notifications older than 5 days
  - Called automatically before rendering notifications

### UI Components:
- **Bell icon**: Lines 784-796 in HTML, `.notification-bell` class (line 184)
- **Dropdown panel**: `.notification-dropdown` (line 188)
- **Notification list**: `.notification-list` (line 194)
- **Unread styling**: `.notification-item.unread` (line 197)

---

## 3. TASKS STRUCTURE & STORAGE

### Task Creation (`saveTaskForm` function, lines 7180-7220):
```javascript
// Task data object
{
  name: string,                  // Task name/title
  description: string,           // Task description
  startDate: date,               // Task start date
  endDate: date,                 // Task deadline
  assigneeId: string,            // FK to assignees collection
  order: number,                 // Display order (auto-assigned)
  createdAt: serverTimestamp(),  // Auto-set by Firestore
  updatedAt: serverTimestamp()   // Auto-updated by Firestore
}
```

### Task State Management (Separate from Task Data):
**Location**: Line 1644 and managed in `taskState` object

Task completion state is stored SEPARATELY from task metadata:
```javascript
// Stored in projects/{projectId}.taskState
{
  [taskId]: {
    completed: boolean,           // Completion flag
    link: string,                 // Completion link/evidence
    completedAt: timestamp,       // When completed
    updatedAt: timestamp,         // Last update time
    comments: [                   // Array of comments
      {
        text: string,             // Comment text (max 2000 chars)
        userName: string,         // Commenter name (max 200 chars)
        timestamp: string         // ISO timestamp
      }
    ]
  }
}
```

### Task Loading:
- **Function**: `loadMenuTasks(menuId)` (lines 6912-6938)
- **Query**: Firestore collection query with `orderBy('order')`
- **Scope**: All tasks in a specific menu, ordered by display order

### Task Completion Detection:
The system checks multiple fields to determine if a task is completed:
1. `taskState[id].completed === true` (primary indicator)
2. `task.isCompleted === true` (alternative field)
3. `task.completed === true` (another alternative)
4. `task.status` contains variations: 'completed', 'hoàn thành', 'đã hoàn thành', 'done', 'xong'
5. `task.completionLink` or `taskState.link` exists (completion evidence)

---

## 4. ASSIGNEE TRACKING

### Assignee Structure:
**Collection**: `/projects/{projectId}/assignees/{assigneeId}`

```javascript
{
  id: string,                    // Document ID (auto-generated)
  name: string,                  // Department/Team name
  email: string,                 // Optional contact email
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

### Assignment to Tasks:
- Tasks have `assigneeId` field pointing to an assignee document
- **Relationship**: Many tasks → One assignee (N:1 relationship)
- **Lookup**: `assignees.find(a => a.id === task.assigneeId)`

### Assignee Management:
- **Loading**: `loadAssignees()` function (lines 7473-7482)
- **CRUD**: Admin-only operations via modal UI (lines 573-598)
- **Display**: Rendered as chips with removal buttons (line 266-268 CSS)

---

## 5. COMMENT STRUCTURE & PERSISTENCE

### Comment Storage Location:
Comments are stored in `projects/{projectId}.taskState[taskId].comments`

### Comment Object:
```javascript
{
  text: string,                  // Comment content (up to 2000 chars)
  userName: string,              // Name of commenter (up to 200 chars)
  timestamp: string              // ISO timestamp (e.g., "2025-11-12T10:30:00Z")
}
```

### Comment Saving (`saveTaskComment` function, lines 2505-2536):
1. Gets comment text from input element
2. Creates comment object with current user name and timestamp
3. Adds to `taskState[taskId].comments` array (max 50 per task)
4. Syncs to Firestore via `syncTaskState()`
5. **Triggers notification**: Creates 'comment' type notification

### Comment Sanitization (lines 2345-2360):
- Max 50 comments per task
- Text trimmed and length-capped at 2000 chars
- Username length-capped at 200 chars
- Empty comments filtered out
- Timestamps normalized to ISO format

### Comment Rendering:
- **Modal UI**: Comments shown in task detail sidebar
- **Collapsible**: `.completed-comment.collapsible` (line 45-46 CSS)
- **See More button**: For collapsed comments (line 47)
- **Visual wrapper**: `.completed-comment-wrapper` (line 44 CSS)

---

## 6. ACTIVITY LOGS

### Activity Log Storage:
**Location**: `projects/{projectId}.activityLogs` (Array)

### Activity Entry Structure:
```javascript
{
  id: string,                    // Unique ID: "{taskId}-{timestamp}"
  taskId: string,                // Task reference
  taskName: string,              // Task name at time of activity
  phase: string,                 // Menu/phase name
  status: string,                // 'completed', 'modified', etc.
  completedAt: timestamp,        // When completed (if status='completed')
  updatedAt: timestamp,          // When activity occurred
  performedBy: string,           // User who performed action
  menuId: string                 // Dynamic task menu reference
}
```

### Recording Activity (`recordActivityEntry` function, lines 2450-2468):
- Max 200 activity logs kept (auto-trimmed)
- Includes performer name and timestamp
- Separate from notifications (complementary system)

### Rendering:
- **Component**: `ActivityLog.js` (separate vanilla JS component)
- **Features**: Pagination, status badges, filtered display

---

## 7. BACKEND/SERVER ARCHITECTURE

### Frontend-Only Architecture:
- **Type**: Client-side only (no backend server)
- **Data Sync**: Real-time Firestore `onSnapshot()` listener (line 7600+)
- **Updates**: Direct Firestore updates via SDK

### Real-Time Synchronization:
- **Location**: Lines 7590-7650
- **Method**: Firestore real-time listener on project document
- **Behavior**:
  - Listens to changes on `/projects/{projectId}`
  - Auto-syncs taskState, activityLogs, settings
  - Normalizes data on receive
  - Triggers UI updates via `updateUI()`

### State Synchronization (`syncTaskState`, lines 5526-5534):
```javascript
async function syncTaskState(){
  if(!isProjectReady) return;
  await updateProjectData({
    taskState: sanitizeTaskState(),    // Sanitized task states
    activityLogs: sanitizeActivityLogs()  // Sanitized activity logs
  });
}
```

---

## 8. AUTHENTICATION & USERS

### User Roles:
- **Admin**: Can create/update/delete menus, tasks, assignees, users
- **User**: Can view, mark complete, add comments, create notes

### User Document Structure:
```javascript
{
  email: string,
  displayName: string,
  role: string,              // 'admin' or 'user'
  avatarUrl: string,         // Optional
  updatedAt: serverTimestamp()
}
```

### Auth Flow:
- **Firebase Auth**: Email/password authentication
- **State tracking**: `currentUser`, `currentUserData`, `isAdmin`
- **Logout cleanup**: Resets notifications and state (line 7613-7615)

---

## 9. KEY DATA FLOW PATTERNS

### Task Completion Flow:
1. User clicks "Complete Task" button
2. UI calls completion handler with task data
3. Adds entry to `taskState[taskId]` with timestamp
4. Calls `syncTaskState()` to persist to Firestore
5. Creates 'completed' notification
6. Records activity log entry

### Comment Flow:
1. User enters comment text
2. Click "Comment" button
3. `saveTaskComment()` adds to `taskState[taskId].comments`
4. `syncTaskState()` persists to Firestore
5. Creates 'comment' notification (unless user is commenter)
6. `renderNotifications()` updates UI

### Notification Flow:
1. `pushNotification()` creates notification object
2. Adds to in-memory `notifications` array
3. Max 50 notifications enforced
4. `renderNotifications()` displays in dropdown
5. `cleanupNotifications()` removes old read notifications (5-day policy)

---

## 10. HELPER FUNCTIONS & UTILITIES

### Key Functions:
- `pushNotification(type, task, userName, additionalData)` - Create notification
- `cleanupNotifications()` - 5-day retention cleanup
- `renderNotifications()` - Display notifications in UI
- `saveTaskComment(taskId)` - Add comment to task
- `loadAssignees()` - Load assignees from Firestore
- `loadMenuTasks(menuId)` - Load tasks for a menu
- `syncTaskState()` - Persist state to Firestore
- `sanitizeTaskState()` - Validate and sanitize task state
- `ensureTaskEntry(id)` - Ensure task state object exists
- `recordActivityEntry()` - Add activity log entry

### Utility Functions:
- `escapeHtml()` - Prevent XSS in comment rendering
- `serverTimestamp()` - Get server time from Firestore
- `normalizeTaskState()` - Normalize raw state from Firestore
- `normalizeTimestamp()` - Convert timestamps to ISO format
- `formatDateTime()` - Format for display

---

## 11. SECURITY RULES

**File**: `/firestore.rules`

### Access Control:
- **Users**: Can read their own document
- **Admins**: Full CRUD on users, projects, tasks
- **All authenticated users**: Can read projects, tasks, assignees
- **Default**: Deny all other access

### Key Rules:
```
match /users/{userId}:
  - read: Self or admin
  - write: Admin only
  
match /projects/{projectId}:
  - read: All authenticated users
  - write: Admin only
  
match /projects/{projectId}/menus/{menuId}/tasks/{taskId}:
  - read: All authenticated users
  - write: Admin only
```

---

## 12. CURRENT LIMITATIONS & NOTES

### Notifications - NOT Persisted:
- ❌ Notifications stored only in-memory (`let notifications = []`)
- ❌ Notifications lost on page refresh
- ❌ No Firestore collection for notifications
- ❌ No historical notification records
- ✅ Real-time updates during session
- ✅ 5-day retention policy (for read notifications)

### Comments - PERSISTED:
- ✅ Stored in `taskState` under each task
- ✅ Synchronized to Firestore
- ✅ Survives page refresh
- ✅ Max 50 comments per task
- ✅ User names tracked with each comment

### To-Do if Building Notification Storage:
1. Create `/projects/{projectId}/notifications` collection
2. Add notification write on `pushNotification()` call
3. Modify security rules to allow notification CRUD
4. Add read() tracking (timestamp when marked as read)
5. Implement server-side cleanup for old read notifications
6. Consider pagination for notification history

---

## SUMMARY TABLE

| Aspect | Type | Location | Persistent? |
|--------|------|----------|-------------|
| Tasks | Collection | `/projects/{id}/menus/{id}/tasks` | Yes |
| Task State | Document Field | `/projects/{id}.taskState` | Yes |
| Comments | Nested Array | `.taskState[taskId].comments` | Yes |
| Notifications | In-Memory Array | `let notifications = []` | NO |
| Activity Logs | Document Field | `/projects/{id}.activityLogs` | Yes |
| Assignees | Collection | `/projects/{id}/assignees` | Yes |
| Users | Collection | `/users` | Yes |
| Settings | Document Field | `/projects/{id}.settings` | Yes |

