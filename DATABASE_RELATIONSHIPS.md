# Database Relationships & Data Flow Diagrams

## Data Model Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRESTORE STRUCTURE                      │
└─────────────────────────────────────────────────────────────┘

/projects/{projectId}
│
├── ✅ PERSISTED DATA (in Firestore)
│   ├── taskState: Object
│   │   └── [taskId]
│   │       ├── completed: boolean
│   │       ├── link: string
│   │       ├── completedAt: timestamp
│   │       ├── updatedAt: timestamp
│   │       └── comments: Array[Comment]
│   │
│   ├── activityLogs: Array[ActivityEntry]
│   ├── notes: Array[Note]
│   ├── customTypes: Array[string]
│   ├── settings: Object
│   └── meta: Object
│
├── 📁 MENUS (Subcollection)
│   └── /menus/{menuId}
│       ├── name: string
│       ├── slug: string (URL)
│       ├── icon: string
│       ├── order: number
│       │
│       └── 📁 TASKS (Subcollection)
│           └── /tasks/{taskId}
│               ├── name: string
│               ├── description: string
│               ├── startDate: date
│               ├── endDate: date (deadline)
│               ├── assigneeId: string (FK)
│               ├── order: number
│               ├── createdAt: timestamp
│               └── updatedAt: timestamp
│
└── 📁 ASSIGNEES (Subcollection)
    └── /assignees/{assigneeId}
        ├── name: string
        ├── email: string
        ├── createdAt: timestamp
        └── updatedAt: timestamp

/users/{userId}
├── email: string
├── displayName: string
├── role: string ('admin' | 'user')
├── avatarUrl: string
└── updatedAt: timestamp
```

---

## Relationship Diagram

```
                    ┌──────────────────┐
                    │   User (Auth)    │
                    ├──────────────────┤
                    │ uid              │
                    │ email            │
                    │ displayName      │
                    │ role (admin|user)│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Project Doc    │
                    ├──────────────────┤
                    │ taskState        │◄─────┐
                    │ activityLogs     │      │
                    │ settings         │      │
                    │ notes            │      │
                    └────────┬─────────┘      │
                             │                │
                    ┌────────▼─────────┐      │
                    │      Menu        │      │
                    ├──────────────────┤      │
                    │ id               │      │
                    │ name             │      │
                    │ slug             │      │
                    │ order            │      │
                    └────────┬─────────┘      │
                             │                │
                    ┌────────▼─────────┐      │
                    │      Task        │      │
                    ├──────────────────┤      │
                    │ id               │      │
                    │ name             │      │
                    │ assigneeId (FK)──┼────┐ │
                    │ endDate          │    │ │
                    │ order            │    │ │
                    └──────────────────┘    │ │
                                            │ │
                    ┌───────────────────┐   │ │
                    │  TaskState Entry  │◄──┘ │
                    ├───────────────────┤     │
                    │ completed         │     │
                    │ link              │     │
                    │ completedAt       │     │
                    │ comments[]        │     │
                    └───────────────────┘     │
                                              │
                    ┌───────────────────┐     │
                    │    Assignee       │◄────┘
                    ├───────────────────┤
                    │ id                │
                    │ name              │
                    │ email (optional)  │
                    └───────────────────┘
```

---

## Comment System Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMENT LIFECYCLE                        │
└─────────────────────────────────────────────────────────────┘

User Enters Comment Text
        │
        ▼
saveTaskComment(taskId)
        │
        ├─► Validate input (trim, check length)
        │
        ├─► Create Comment Object:
        │   {
        │     text: string (max 2000),
        │     userName: string (max 200),
        │     timestamp: ISO string
        │   }
        │
        ├─► Add to taskState[taskId].comments[]
        │   (max 50 comments per task)
        │
        ├─► syncTaskState()
        │   │
        │   └─► updateProjectData()
        │       │
        │       └─► updateDoc(projects/{projectId}, {
        │               taskState: sanitized,
        │               updatedAt: serverTimestamp()
        │           })
        │
        ├─► pushNotification('comment', task, userName)
        │   (unless userName is commenter)
        │
        ├─► notifications.unshift(notification)
        │
        └─► renderNotifications()
            │
            └─► Update UI dropdown

Firestore Real-Time Listener
        │
        └─► onSnapshot(projectRef)
            │
            ├─► Detects change to taskState
            │
            ├─► normalizeTaskState()
            │
            └─► updateUI()
                │
                └─► Re-render comments in UI
```

---

## Notification System Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  NOTIFICATION LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

Multiple Triggers:
├─ Task Completion: handleCompleteTask()
├─ Comment Addition: saveTaskComment()
└─ Overdue Detection: refreshNotifications()

        │
        ▼
pushNotification(type, task, userName, additionalData)
        │
        ├─► Determine message based on type:
        │   ├─ 'completed': "{user} completed {task}"
        │   ├─ 'comment': "{user} commented on {task}"
        │   └─ 'overdue': "{task} is overdue"
        │
        ├─► Check if self-notification (comment case)
        │   └─► Skip if commenter == currentUser
        │
        ├─► Create Notification Object:
        │   {
        │     id: "{type}-{taskId}-{timestamp}",
        │     taskId: string,
        │     type: 'completed'|'overdue'|'comment',
        │     message: string,
        │     timestamp: ISO string,
        │     read: false,
        │     ...additionalData
        │   }
        │
        ├─► notifications.unshift(notification)
        │   (newest at front)
        │
        └─► Enforce max 50 notifications
            (older ones auto-removed)

        │
        ▼
renderNotifications()
        │
        ├─► cleanupNotifications()
        │   │
        │   └─► Remove read notifications older than 5 days
        │       (keep all unread forever)
        │
        ├─► Update notification badge count
        │
        ├─► Render notification list in dropdown
        │   ├─ Unread items highlighted
        │   ├─ Display message and timestamp
        │   └─ Show empty state if none
        │
        └─► Mark read when user views

USER CLICKS NOTIFICATION ITEM
        │
        └─► Mark read: notification.read = true
            (5-day cleanup applies after this)
```

---

## Task State Synchronization Flow

```
┌─────────────────────────────────────────────────────────────┐
│              STATE SYNC TO FIRESTORE PATTERN                │
└─────────────────────────────────────────────────────────────┘

User Action (e.g., mark complete, add comment)
        │
        ▼
Update taskState object in memory
        │
        ├─ taskState[taskId].completed = true
        ├─ taskState[taskId].completedAt = timestamp
        └─ taskState[taskId].comments.push(newComment)

        │
        ▼
Call syncTaskState()
        │
        ├─► sanitizeTaskState()
        │   │
        │   └─► Validate & trim all data:
        │       ├─ Max 50 comments per task
        │       ├─ Max 2000 chars per comment
        │       ├─ Max 200 chars per username
        │       └─ Remove empty comments
        │
        ├─► sanitizeActivityLogs()
        │   │
        │   └─► Validate & trim:
        │       ├─ Max 200 activity entries
        │       └─ Check required fields
        │
        └─► updateProjectData({
                taskState: sanitized,
                activityLogs: sanitized,
                updatedAt: serverTimestamp()
            })

        │
        ▼
updateDoc(projects/{projectId}, {...})
        │
        └─► Firestore stores update

        │
        ▼
onSnapshot(projectRef) triggers
        │
        ├─► Receive updated project document
        │
        ├─► normalizeTaskState(data.taskState)
        │
        ├─► Assign to taskState variable
        │
        └─► updateUI()
            │
            └─► Re-render all components
```

---

## Comment-to-Notification Connection

```
Comment Saved
    │
    ├─► Added to: projects/{projectId}.taskState[taskId].comments[]
    │
    └─► PERSISTED to Firestore
            │
            ├─► Survives page refresh
            ├─► Visible to all users in real-time
            └─► Subject to Firestore backup/retention
                
        ┌────────────────────────────────────────────┐
        │    ALSO Creates In-Memory Notification     │
        └────────────────────────────────────────────┘

pushNotification('comment', task, commenterName)
    │
    └─► Added to: let notifications = []
            │
            ├─► NOT persisted to Firestore
            ├─► Lost on page refresh
            ├─► Only visible during current session
            ├─► Max 50 notifications in memory
            └─► Max 5 days after read (cleanup policy)

KEY DIFFERENCE:
┌────────────────┬──────────────────┬──────────────────┐
│ COMMENT        │ PERSISTED        │ NOTIFICATION     │
├────────────────┼──────────────────┼──────────────────┤
│ Location       │ taskState        │ Memory array     │
│ Storage        │ Firestore        │ Client-side only │
│ Visible        │ All users        │ Single session   │
│ On Refresh     │ ✅ Persists      │ ❌ Lost          │
│ Retention      │ Forever          │ 5 days (read)    │
│ Query-able     │ ✅ Yes           │ ❌ No            │
└────────────────┴──────────────────┴──────────────────┘
```

---

## Authentication & Authorization Flow

```
User Logs In
    │
    ▼
Firebase Auth (email/password)
    │
    ├─► createUserWithEmailAndPassword()
    │   or signInWithEmailAndPassword()
    │
    ▼
onAuthStateChanged callback
    │
    ├─► currentUser = user
    │
    ├─► Load user document from /users/{uid}
    │
    ├─► Determine role: admin or user
    │   (from users/{uid}.role)
    │
    ├─► Initialize project reference
    │   projectRef = doc(db, 'projects', projectId)
    │
    ├─► Set up real-time listener
    │   onSnapshot(projectRef)
    │
    └─► isAdmin = (role === 'admin')

User Actions:
├─ Admin: Can write tasks, menus, assignees
├─ User: Can only read, complete, comment
└─ All: Can read projects/tasks/assignees

Firestore Security Rules Enforce:
├─ /users/{uid}: read by self or admin, write by admin
├─ /projects/{id}: read by authenticated, write by admin
└─ /projects/{id}/menus/{id}/tasks: read by all, write by admin
```

---

## Real-Time Data Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           REAL-TIME LISTENER ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

CLIENT BROWSER
├─ JavaScript Application (index.html)
│
├─ Firestore SDK
│  └─ Real-time Listener
│     │
│     └─ onSnapshot(projects/{projectId})
│
└─ Global State Variables:
   ├─ taskState
   ├─ activityLogs
   ├─ notifications
   ├─ dynamicMenus
   ├─ dynamicTasks
   └─ assignees

USER ACTION (e.g., complete task)
    │
    ├─► Update local taskState
    │
    ├─► syncTaskState()
    │   │
    │   └─► updateDoc(projects/{projectId}, {...})
    │       │
    │       └─► SENDS TO FIRESTORE
    │
    ▼
FIRESTORE DATABASE
    │
    ├─► Stores update
    │
    └─► Broadcasts change to all listeners
        (real-time replication)

OTHER USERS (listening on same project)
    │
    ├─► onSnapshot callback triggered
    │
    ├─► Receive updated project document
    │
    ├─► Normalize data
    │
    ├─► Update local taskState
    │
    └─► updateUI()
        (reflects change immediately)

RESULT: All users see the same data in real-time
        without polling or manual refresh
```

---

## Memory vs Persistence Summary

```
┌────────────────────────────────────────────────────────────┐
│              DATA PERSISTENCE MATRIX                       │
└────────────────────────────────────────────────────────────┘

COMPONENT          │ IN-MEMORY │ FIRESTORE │ PERSISTED │ TTL
──────────────────┼───────────┼───────────┼───────────┼──────
Tasks              │     ✅    │     ✅    │    ✅     │ ∞
Task State         │     ✅    │     ✅    │    ✅     │ ∞
Comments           │     ✅    │     ✅    │    ✅     │ ∞
Notifications      │     ✅    │     ❌    │    ❌     │ 5 days
Activity Logs      │     ✅    │     ✅    │    ✅     │ ∞
Assignees          │     ✅    │     ✅    │    ✅     │ ∞
Settings           │     ✅    │     ✅    │    ✅     │ ∞
Users              │     ✅    │     ✅    │    ✅     │ ∞
Menus              │     ✅    │     ✅    │    ✅     │ ∞

LEGEND:
IN-MEMORY: Stored in JavaScript variables (lost on refresh)
FIRESTORE: Stored in Cloud Firestore database
PERSISTED: Data survives page refresh
TTL: Time To Live / Retention Period
```

---

## Index Usage in Firestore Queries

```
Current Queries:
├─ collection(db, 'projects', projectId, 'menus', menuId, 'tasks')
│  └─ orderBy('order')
│     (Gets all tasks in menu, ordered by position)
│
├─ collection(db, 'projects', projectId, 'assignees')
│  └─ getDocs()
│     (Gets all assignees for project)
│
└─ collection(db, 'users')
   └─ getDocs()
      (Gets all users)

Recommended Indexes (if scaling):
├─ /projects/{projectId}/menus/{menuId}/tasks (order)
├─ /projects/{projectId}/assignees (name)
└─ /users (email, role)
```

