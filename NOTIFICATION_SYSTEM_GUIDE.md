# Notification System - Implementation Guide

Complete backend logic for creating and cleaning up notifications.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Part A: Create Comment Notification](#part-a-create-comment-notification)
3. [Part B: Auto-Cleanup Policy](#part-b-auto-cleanup-policy)
4. [Database Setup](#database-setup)
5. [Integration Examples](#integration-examples)
6. [Scheduled Cleanup](#scheduled-cleanup)
7. [Testing](#testing)

---

## 🚀 Quick Start

### Files Created

| File | Description |
|------|-------------|
| `NotificationHelpers.js` | Core functions for both Firestore and SQL |
| `notifications-schema.sql` | Database schema and queries |
| `NOTIFICATION_SYSTEM_GUIDE.md` | This guide |

### Choose Your Implementation

**Option 1: Firestore** (Recommended for your current stack)
- Use `createCommentNotification_Firestore()`
- Use `cleanupOldNotifications_Firestore()`

**Option 2: SQL** (PostgreSQL/MySQL)
- Use `createCommentNotification_SQL()`
- Use `cleanupOldNotifications_SQL()`

---

## Part A: Create Comment Notification

### ✨ Function: `createCommentNotification()`

Creates a notification when a user comments on a task.

### **Firestore Implementation**

```javascript
const admin = require('firebase-admin');
const { createCommentNotification_Firestore } = require('./NotificationHelpers');

async function handleComment(taskId, commentText, userName) {
  const db = admin.firestore();

  // Create notification
  const notificationId = await createCommentNotification_Firestore(
    taskId,                  // Task ID
    commentText,             // Comment content
    userName,                // User who commented
    {
      projectId: 'your-project-id',
      db: db
    }
  );

  console.log(`Notification created: ${notificationId}`);
}
```

### **SQL Implementation**

```javascript
const mysql = require('mysql2/promise');
const { createCommentNotification_SQL } = require('./NotificationHelpers');

async function handleComment(taskId, commentText, userName) {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Create notification
  const notificationId = await createCommentNotification_SQL(
    taskId,                  // Task ID
    commentText,             // Comment content
    userName,                // User who commented
    { db }
  );

  console.log(`Notification created: ${notificationId}`);
  await db.end();
}
```

### 🎯 What It Does

1. ✅ Gets the task by ID
2. ✅ Finds the task assignee using `getTaskAssignee(taskId)`
3. ✅ Creates notification with message: `"User [Name] commented on [Task Title]"`
4. ✅ Inserts record into `notifications` collection/table
5. ✅ Returns the notification ID

### 📊 Notification Data Structure

```javascript
{
  id: 'notification-id',
  type: 'comment',
  taskId: 'task-123',
  taskName: 'Fix login bug',
  message: 'User John Doe commented on "Fix login bug"',
  commentPreview: 'Great work on this task! I have one sugges...',
  recipientId: 'assignee-456',
  recipientName: 'Jane Smith',
  senderId: 'John Doe',
  is_read: false,
  created_at: '2025-11-12T10:30:00Z',
  updated_at: '2025-11-12T10:30:00Z'
}
```

---

## Part B: Auto-Cleanup Policy

### 🧹 Function: `cleanupOldNotifications()`

Deletes read notifications older than 3 days. Keeps unread notifications forever.

### **Firestore Implementation**

```javascript
const admin = require('firebase-admin');
const { cleanupOldNotifications_Firestore } = require('./NotificationHelpers');

async function runCleanup() {
  const db = admin.firestore();

  const deletedCount = await cleanupOldNotifications_Firestore(
    'your-project-id',
    db
  );

  console.log(`Cleaned up ${deletedCount} old notifications`);
}

// Run cleanup
runCleanup();
```

### **SQL Implementation**

```javascript
const mysql = require('mysql2/promise');
const { cleanupOldNotifications_SQL } = require('./NotificationHelpers');

async function runCleanup() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const deletedCount = await cleanupOldNotifications_SQL(db);

  console.log(`Cleaned up ${deletedCount} old notifications`);
  await db.end();
}

// Run cleanup
runCleanup();
```

### **Raw SQL Query** (Manual Execution)

```sql
-- MySQL
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

-- PostgreSQL
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '3 days';
```

### 🎯 Cleanup Logic

| Notification Type | Retention Policy |
|-------------------|------------------|
| **Unread** (`is_read = false`) | ✅ Keep FOREVER |
| **Read** (`is_read = true`) | 🗑️ Delete after **3 DAYS** |

### 📈 Cleanup Flow

```
1. Calculate cutoff date: NOW() - 3 days
2. Query: WHERE is_read = TRUE AND created_at < cutoff
3. Delete matching records
4. Return count of deleted notifications
```

---

## 🗄️ Database Setup

### Firestore Setup

**1. Create Firestore Collection Structure**

```
/projects/{projectId}/notifications/{notificationId}
```

**2. Create Composite Index**

Go to Firebase Console → Firestore → Indexes → Create Index:
- Collection: `notifications`
- Fields:
  - `is_read` (Ascending)
  - `created_at` (Ascending)

**3. Update Security Rules**

See `notifications-schema.sql` for complete security rules.

### SQL Setup

**1. Run Schema**

```bash
mysql -u root -p your_database < notifications-schema.sql
```

**2. Verify Table**

```sql
DESCRIBE notifications;
```

**3. Test Query**

```sql
SELECT * FROM notifications LIMIT 5;
```

---

## 🔧 Integration Examples

### Example 1: Comment Controller Integration

```javascript
// CommentController.js

const { createCommentNotification_Firestore } = require('./NotificationHelpers');

class CommentController {
  async createComment(req, res) {
    const { taskId, commentText } = req.body;
    const userName = req.user.name;

    try {
      // 1. Save comment to database
      await saveComment(taskId, commentText, userName);

      // 2. Create notification
      await createCommentNotification_Firestore(
        taskId,
        commentText,
        userName,
        {
          projectId: req.user.projectId,
          db: req.app.locals.db
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
}

module.exports = new CommentController();
```

### Example 2: Express.js Route

```javascript
// routes/comments.js

const express = require('express');
const router = express.Router();
const { createCommentNotification_SQL } = require('./NotificationHelpers');

router.post('/tasks/:taskId/comments', async (req, res) => {
  const { taskId } = req.params;
  const { text } = req.body;
  const userName = req.session.user.name;

  try {
    // Save comment
    const comment = await Comment.create({
      taskId,
      text,
      author: userName
    });

    // Create notification
    await createCommentNotification_SQL(
      taskId,
      text,
      userName,
      { db: req.db }
    );

    res.json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Example 3: Firebase Cloud Function

```javascript
// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createCommentNotification_Firestore } = require('./NotificationHelpers');

admin.initializeApp();

exports.onCommentCreated = functions.firestore
  .document('projects/{projectId}/tasks/{taskId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const { projectId, taskId } = context.params;
    const commentData = snap.data();

    await createCommentNotification_Firestore(
      taskId,
      commentData.text,
      commentData.author,
      {
        projectId,
        db: admin.firestore()
      }
    );
  });
```

---

## ⏰ Scheduled Cleanup

### Option 1: Firebase Cloud Function (Scheduled)

```javascript
// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { cleanupOldNotifications_Firestore } = require('./NotificationHelpers');

// Run every day at 2:00 AM
exports.dailyNotificationCleanup = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const projectsSnapshot = await db.collection('projects').get();

    let totalDeleted = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const deleted = await cleanupOldNotifications_Firestore(
        projectDoc.id,
        db
      );
      totalDeleted += deleted;
    }

    console.log(`✅ Total cleaned: ${totalDeleted} notifications`);
    return totalDeleted;
  });
```

**Deploy:**
```bash
firebase deploy --only functions:dailyNotificationCleanup
```

### Option 2: Node.js Cron Job

```javascript
// cleanup-cron.js

const cron = require('node-cron');
const mysql = require('mysql2/promise');
const { cleanupOldNotifications_SQL } = require('./NotificationHelpers');

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🕐 Running notification cleanup...');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const count = await cleanupOldNotifications_SQL(db);
    console.log(`✅ Deleted ${count} notifications`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await db.end();
  }
});

console.log('📅 Cleanup cron job started');
```

**Run:**
```bash
node cleanup-cron.js
```

### Option 3: MySQL Event Scheduler

```sql
-- Enable scheduler
SET GLOBAL event_scheduler = ON;

-- Create daily event
CREATE EVENT daily_notification_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);
```

---

## 🧪 Testing

### Test Comment Notification

```javascript
const { createCommentNotification_Firestore } = require('./NotificationHelpers');
const admin = require('firebase-admin');

async function testNotification() {
  const db = admin.firestore();

  const notificationId = await createCommentNotification_Firestore(
    'test-task-123',
    'This is a test comment',
    'Test User',
    {
      projectId: 'test-project',
      db: db
    }
  );

  console.log('✅ Test notification created:', notificationId);
}

testNotification();
```

### Test Cleanup

```javascript
const { cleanupOldNotifications_SQL } = require('./NotificationHelpers');
const mysql = require('mysql2/promise');

async function testCleanup() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testdb'
  });

  // Create old test notification
  await db.query(`
    INSERT INTO notifications (type, task_id, message, recipient_id, is_read, created_at)
    VALUES ('test', 'task-1', 'Old notification', 'user-1', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY))
  `);

  // Run cleanup
  const deletedCount = await cleanupOldNotifications_SQL(db);

  console.log('✅ Deleted:', deletedCount, 'notifications');

  await db.end();
}

testCleanup();
```

### Manual Testing

```sql
-- Insert test notification
INSERT INTO notifications (type, task_id, message, recipient_id, is_read, created_at)
VALUES ('comment', 'task-123', 'Test', 'user-456', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Check it exists
SELECT * FROM notifications WHERE task_id = 'task-123';

-- Run cleanup
DELETE FROM notifications
WHERE is_read = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

-- Verify deletion
SELECT * FROM notifications WHERE task_id = 'task-123';
```

---

## 📝 Summary

### Part A: `createCommentNotification()`

✅ Accepts: `taskId`, `commentContent`, `userWhoCommented`
✅ Finds task assignee via `getTaskAssignee(taskId)`
✅ Creates notification: `"User [Name] commented on [Task Title]"`
✅ Inserts into `notifications` table/collection

### Part B: `cleanupOldNotifications()`

✅ Condition: `is_read = TRUE AND created_at < NOW() - 3 DAYS`
✅ Action: DELETE matching notifications
✅ Result: Keeps unread forever, removes read after 3 days

---

## 🔗 Related Files

- **`NotificationHelpers.js`** - Main implementation
- **`notifications-schema.sql`** - Database schema
- **`ActivityLog.js`** - Activity log component (frontend)

---

## 📞 Support

If you need help:
1. Check the code comments in `NotificationHelpers.js`
2. Review examples in this guide
3. Test with the provided test functions
4. Check database logs for errors

---

**🎉 You're all set!** Use the functions in your Comment Controller and enjoy automated notification cleanup!
