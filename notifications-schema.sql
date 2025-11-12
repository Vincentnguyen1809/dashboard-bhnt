-- ============================================================================
-- NOTIFICATIONS TABLE SCHEMA
-- SQL Schema for persistent notification storage
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary key
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Notification metadata
  type VARCHAR(50) NOT NULL,                    -- 'comment', 'completed', 'overdue', etc.
  task_id VARCHAR(255) NOT NULL,                -- Reference to task
  task_name VARCHAR(500),                       -- Task title for display
  message TEXT NOT NULL,                        -- Notification message
  comment_preview TEXT,                         -- First 100 chars of comment (optional)

  -- Recipient information
  recipient_id VARCHAR(255) NOT NULL,           -- User ID of the assignee
  recipient_name VARCHAR(255),                  -- Name for display

  -- Sender information
  sender_name VARCHAR(255),                     -- User who triggered the notification

  -- Status
  is_read BOOLEAN DEFAULT FALSE NOT NULL,       -- Read/unread status

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,

  -- Indexes for performance
  INDEX idx_recipient_read (recipient_id, is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_cleanup (is_read, created_at),      -- Optimized for cleanup query
  INDEX idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- POSTGRESQL VERSION
-- ============================================================================

-- Create notifications table (PostgreSQL)
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Notification metadata
  type VARCHAR(50) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  task_name VARCHAR(500),
  message TEXT NOT NULL,
  comment_preview TEXT,

  -- Recipient information
  recipient_id VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),

  -- Sender information
  sender_name VARCHAR(255),

  -- Status
  is_read BOOLEAN DEFAULT FALSE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_cleanup ON notifications(is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_task_id ON notifications(task_id);

-- ============================================================================
-- FIRESTORE SCHEMA (Document Structure)
-- ============================================================================

/*
Collection path: /projects/{projectId}/notifications/{notificationId}

Document structure:
{
  id: string,                    // Auto-generated document ID
  type: string,                  // 'comment', 'completed', 'overdue'
  taskId: string,                // Reference to task
  taskName: string,              // Task title
  message: string,               // Notification message
  commentPreview: string,        // First 100 chars (optional)
  recipientId: string,           // Assignee user ID
  recipientName: string,         // Assignee display name
  senderId: string,              // User who triggered notification
  is_read: boolean,              // Read status (default: false)
  created_at: timestamp,         // Creation time
  updated_at: timestamp          // Last update time
}

Firestore indexes (create in Firebase Console):
- Composite index: is_read (asc), created_at (asc)
- Single field index: recipientId (asc)
- Single field index: taskId (asc)

Security Rules:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId}/notifications/{notificationId} {
      // Users can read their own notifications
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.recipientId;

      // System can create notifications
      allow create: if request.auth != null;

      // Users can update their own notifications (mark as read)
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.recipientId
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['is_read', 'updated_at']);

      // System can delete old notifications
      allow delete: if request.auth != null;
    }
  }
}
*/

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get unread notifications for a user
SELECT * FROM notifications
WHERE recipient_id = 'user-123'
  AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;

-- Mark notification as read
UPDATE notifications
SET is_read = TRUE,
    updated_at = NOW()
WHERE id = 1;

-- Mark all notifications as read for a user
UPDATE notifications
SET is_read = TRUE,
    updated_at = NOW()
WHERE recipient_id = 'user-123'
  AND is_read = FALSE;

-- Get notification count by type
SELECT type, COUNT(*) as count
FROM notifications
WHERE recipient_id = 'user-123'
  AND is_read = FALSE
GROUP BY type;

-- Cleanup query (delete read notifications older than 3 days)
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

-- PostgreSQL cleanup version
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '3 days';

-- ============================================================================
-- MIGRATION SCRIPT (Add to existing database)
-- ============================================================================

-- Step 1: Create table
-- (Use CREATE TABLE statement above)

-- Step 2: Migrate existing data (if any)
-- This is a sample - adjust based on your existing schema

-- Step 3: Add foreign key constraints (optional)
ALTER TABLE notifications
ADD CONSTRAINT fk_task
FOREIGN KEY (task_id) REFERENCES tasks(id)
ON DELETE CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT fk_recipient
FOREIGN KEY (recipient_id) REFERENCES users(id)
ON DELETE CASCADE;

-- ============================================================================
-- STORED PROCEDURE (Optional: Cleanup automation)
-- ============================================================================

-- MySQL Stored Procedure
DELIMITER //

CREATE PROCEDURE cleanup_old_notifications()
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

  SELECT ROW_COUNT() as deleted_count;
END //

DELIMITER ;

-- Call the procedure
CALL cleanup_old_notifications();

-- ============================================================================
-- EVENT SCHEDULER (Optional: Automatic daily cleanup)
-- ============================================================================

-- Enable MySQL Event Scheduler
SET GLOBAL event_scheduler = ON;

-- Create daily cleanup event
CREATE EVENT IF NOT EXISTS daily_notification_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY);

-- Check event status
SHOW EVENTS LIKE 'daily_notification_cleanup';

-- Disable event (if needed)
ALTER EVENT daily_notification_cleanup DISABLE;

-- Drop event (if needed)
DROP EVENT IF EXISTS daily_notification_cleanup;
