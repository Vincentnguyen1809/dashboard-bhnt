/**
 * Notification System Logic
 * Backend helpers for creating and cleaning up notifications
 *
 * Supports both Firestore and SQL implementations
 */

// ============================================================================
// PART A: CREATE COMMENT NOTIFICATION
// ============================================================================

/**
 * FIRESTORE IMPLEMENTATION
 * Creates a notification when a user comments on a task
 *
 * @param {string} taskId - The ID of the task being commented on
 * @param {string} commentContent - The comment text
 * @param {string} userWhoCommented - Name of the user who commented
 * @param {Object} options - Additional options
 * @param {string} options.projectId - Project ID (required for Firestore)
 * @param {Object} options.db - Firestore database instance
 * @returns {Promise<string>} Notification ID
 */
async function createCommentNotification_Firestore(taskId, commentContent, userWhoCommented, options = {}) {
  try {
    const { projectId, db } = options;

    if (!projectId || !db) {
      throw new Error('projectId and db (Firestore instance) are required');
    }

    // Step 1: Get task details and assignee
    const task = await getTaskById_Firestore(taskId, projectId, db);

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const assigneeId = task.assigneeId;

    if (!assigneeId) {
      console.warn(`Task ${taskId} has no assignee. Notification not created.`);
      return null;
    }

    // Step 2: Get assignee details (for validation)
    const assignee = await getTaskAssignee_Firestore(taskId, projectId, db);

    if (!assignee) {
      console.warn(`Assignee not found for task ${taskId}`);
      return null;
    }

    // Step 3: Create notification document
    const notificationRef = db
      .collection('projects')
      .doc(projectId)
      .collection('notifications')
      .doc(); // Auto-generate ID

    const notification = {
      id: notificationRef.id,
      type: 'comment',
      taskId: taskId,
      taskName: task.name || 'Untitled Task',
      message: `User ${userWhoCommented} commented on "${task.name || 'Untitled Task'}"`,
      commentPreview: commentContent.substring(0, 100), // First 100 chars
      recipientId: assigneeId,
      recipientName: assignee.name,
      senderId: userWhoCommented,
      is_read: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    await notificationRef.set(notification);

    console.log(`✅ Notification created: ${notificationRef.id}`);
    return notificationRef.id;

  } catch (error) {
    console.error('❌ Error creating comment notification:', error);
    throw error;
  }
}

/**
 * SQL IMPLEMENTATION (PostgreSQL/MySQL)
 * Creates a notification when a user comments on a task
 *
 * @param {string} taskId - The ID of the task being commented on
 * @param {string} commentContent - The comment text
 * @param {string} userWhoCommented - Name of the user who commented
 * @param {Object} options - Additional options
 * @param {Object} options.db - Database connection/pool
 * @returns {Promise<number>} Notification ID
 */
async function createCommentNotification_SQL(taskId, commentContent, userWhoCommented, options = {}) {
  try {
    const { db } = options;

    if (!db) {
      throw new Error('db (database connection) is required');
    }

    // Step 1: Get task assignee
    const assignee = await getTaskAssignee_SQL(taskId, db);

    if (!assignee) {
      console.warn(`Task ${taskId} has no assignee. Notification not created.`);
      return null;
    }

    // Step 2: Get task details
    const taskQuery = 'SELECT id, name FROM tasks WHERE id = ?';
    const [taskRows] = await db.query(taskQuery, [taskId]);

    if (taskRows.length === 0) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const task = taskRows[0];

    // Step 3: Insert notification
    const insertQuery = `
      INSERT INTO notifications (
        type,
        task_id,
        task_name,
        message,
        comment_preview,
        recipient_id,
        recipient_name,
        sender_name,
        is_read,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const message = `User ${userWhoCommented} commented on "${task.name || 'Untitled Task'}"`;
    const commentPreview = commentContent.substring(0, 100);

    const [result] = await db.query(insertQuery, [
      'comment',
      taskId,
      task.name,
      message,
      commentPreview,
      assignee.id,
      assignee.name,
      userWhoCommented,
      false // is_read
    ]);

    console.log(`✅ Notification created: ID ${result.insertId}`);
    return result.insertId;

  } catch (error) {
    console.error('❌ Error creating comment notification:', error);
    throw error;
  }
}

// ============================================================================
// PART B: AUTO-CLEANUP POLICY (3-DAY RETENTION)
// ============================================================================

/**
 * FIRESTORE IMPLEMENTATION
 * Deletes read notifications older than 3 days
 * Keeps unread notifications forever
 *
 * @param {string} projectId - Project ID
 * @param {Object} db - Firestore database instance
 * @returns {Promise<number>} Number of notifications deleted
 */
async function cleanupOldNotifications_Firestore(projectId, db) {
  try {
    if (!projectId || !db) {
      throw new Error('projectId and db (Firestore instance) are required');
    }

    // Calculate cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log(`🧹 Cleaning up notifications older than ${threeDaysAgo.toISOString()}`);

    // Query: Get read notifications older than 3 days
    const notificationsRef = db
      .collection('projects')
      .doc(projectId)
      .collection('notifications');

    const querySnapshot = await notificationsRef
      .where('is_read', '==', true)
      .where('created_at', '<', threeDaysAgo)
      .get();

    if (querySnapshot.empty) {
      console.log('✅ No old notifications to clean up');
      return 0;
    }

    // Batch delete (Firestore limit: 500 operations per batch)
    const batch = db.batch();
    let deleteCount = 0;

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();

    console.log(`✅ Deleted ${deleteCount} old notifications`);
    return deleteCount;

  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    throw error;
  }
}

/**
 * SQL IMPLEMENTATION (PostgreSQL/MySQL)
 * Deletes read notifications older than 3 days
 * Raw SQL query version
 *
 * @param {Object} db - Database connection/pool
 * @returns {Promise<number>} Number of notifications deleted
 */
async function cleanupOldNotifications_SQL(db) {
  try {
    if (!db) {
      throw new Error('db (database connection) is required');
    }

    // SQL Query: Delete read notifications older than 3 days
    const deleteQuery = `
      DELETE FROM notifications
      WHERE is_read = TRUE
        AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
    `;

    const [result] = await db.query(deleteQuery);

    const deletedCount = result.affectedRows || 0;
    console.log(`✅ Deleted ${deletedCount} old notifications`);

    return deletedCount;

  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    throw error;
  }
}

/**
 * RAW SQL QUERY (For manual execution)
 * Can be run directly in MySQL/PostgreSQL
 */
const CLEANUP_SQL_QUERY = `
-- Delete read notifications older than 3 days
-- Keeps unread notifications forever

DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '3 days';  -- PostgreSQL syntax
  -- For MySQL: created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get task by ID (Firestore)
 */
async function getTaskById_Firestore(taskId, projectId, db) {
  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return null;
    }

    const projectData = projectDoc.data();
    const menus = projectData.menus || {};

    // Search through all menus for the task
    for (const menuId in menus) {
      const menu = menus[menuId];
      const tasks = menu.tasks || {};

      if (tasks[taskId]) {
        return {
          id: taskId,
          ...tasks[taskId],
          menuId: menuId
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
}

/**
 * Get task assignee (Firestore)
 * Assumes getTaskAssignee(taskId) helper exists as mentioned
 */
async function getTaskAssignee_Firestore(taskId, projectId, db) {
  try {
    // Get task first
    const task = await getTaskById_Firestore(taskId, projectId, db);

    if (!task || !task.assigneeId) {
      return null;
    }

    // Get assignee details
    const assigneeDoc = await db
      .collection('projects')
      .doc(projectId)
      .collection('assignees')
      .doc(task.assigneeId)
      .get();

    if (!assigneeDoc.exists) {
      return null;
    }

    return {
      id: assigneeDoc.id,
      ...assigneeDoc.data()
    };
  } catch (error) {
    console.error('Error getting task assignee:', error);
    throw error;
  }
}

/**
 * Get task assignee (SQL)
 * Assumes getTaskAssignee(taskId) helper exists as mentioned
 */
async function getTaskAssignee_SQL(taskId, db) {
  try {
    const query = `
      SELECT u.id, u.name, u.email
      FROM users u
      INNER JOIN tasks t ON t.assignee_id = u.id
      WHERE t.id = ?
    `;

    const [rows] = await db.query(query, [taskId]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error('Error getting task assignee:', error);
    throw error;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Create notification in Firestore
 */
async function exampleCreateNotification_Firestore() {
  const admin = require('firebase-admin');
  const db = admin.firestore();

  await createCommentNotification_Firestore(
    'task-123',
    'Great work on this task!',
    'John Doe',
    {
      projectId: 'project-456',
      db: db
    }
  );
}

/**
 * Example 2: Create notification in SQL
 */
async function exampleCreateNotification_SQL() {
  const mysql = require('mysql2/promise');
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'myapp'
  });

  await createCommentNotification_SQL(
    'task-123',
    'Great work on this task!',
    'John Doe',
    { db }
  );
}

/**
 * Example 3: Cleanup old notifications (Firestore)
 */
async function exampleCleanup_Firestore() {
  const admin = require('firebase-admin');
  const db = admin.firestore();

  const deletedCount = await cleanupOldNotifications_Firestore('project-456', db);
  console.log(`Cleaned up ${deletedCount} notifications`);
}

/**
 * Example 4: Cleanup old notifications (SQL)
 */
async function exampleCleanup_SQL() {
  const mysql = require('mysql2/promise');
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'myapp'
  });

  const deletedCount = await cleanupOldNotifications_SQL(db);
  console.log(`Cleaned up ${deletedCount} notifications`);
}

// ============================================================================
// SCHEDULED CLEANUP (Optional: Run daily via cron/scheduler)
// ============================================================================

/**
 * Firebase Cloud Function (Scheduled daily cleanup)
 */
exports.scheduledNotificationCleanup = async (context) => {
  const admin = require('firebase-admin');
  const db = admin.firestore();

  // Get all projects
  const projectsSnapshot = await db.collection('projects').get();

  let totalDeleted = 0;

  for (const projectDoc of projectsSnapshot.docs) {
    const deleted = await cleanupOldNotifications_Firestore(projectDoc.id, db);
    totalDeleted += deleted;
  }

  console.log(`✅ Total notifications cleaned up: ${totalDeleted}`);
  return totalDeleted;
};

/**
 * Node.js Cron Job (Scheduled daily cleanup)
 */
async function setupDailyCleanupCron_SQL() {
  const cron = require('node-cron');
  const mysql = require('mysql2/promise');

  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running scheduled notification cleanup...');

    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    try {
      const deletedCount = await cleanupOldNotifications_SQL(db);
      console.log(`✅ Scheduled cleanup completed: ${deletedCount} notifications deleted`);
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    } finally {
      await db.end();
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Firestore functions
  createCommentNotification_Firestore,
  cleanupOldNotifications_Firestore,
  getTaskById_Firestore,
  getTaskAssignee_Firestore,

  // SQL functions
  createCommentNotification_SQL,
  cleanupOldNotifications_SQL,
  getTaskAssignee_SQL,

  // SQL query constant
  CLEANUP_SQL_QUERY,

  // Scheduled cleanup
  scheduledNotificationCleanup: exports.scheduledNotificationCleanup,
  setupDailyCleanupCron_SQL
};
