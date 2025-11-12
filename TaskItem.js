/**
 * TaskItem Component (Vanilla JS)
 * Renders a single task card with proper status detection and dynamic slug support
 *
 * FIXES:
 * 1. String mismatch bug - now checks ALL variations of status
 * 2. Wrong slug bug - uses dynamic slug from URL instead of hardcoded paths
 * 3. Missing buttons - footer now visible immediately when isCompleted is true
 */

/**
 * Normalize task status to lowercase and trim whitespace
 * @param {string} status - The status string from task data
 * @returns {string} - Normalized status
 */
function normalizeStatus(status) {
  return status ? status.toLowerCase().trim() : '';
}

/**
 * Check if a task is completed based on various status indicators
 * CRITICAL: Handles all Vietnamese and English variations
 * Checks multiple possible property names to be robust
 *
 * @param {Object} task - The task object
 * @param {Object} taskState - The task state object (contains completed flag)
 * @returns {boolean} - True if task is completed
 */
function isTaskCompleted(task, taskState = {}) {
  // CRITICAL DEBUG: Log everything to see the actual object structure
  console.log('🔍 [isTaskCompleted] Checking completion status');
  console.log('   FULL TASK OBJECT:', task);
  console.log('   FULL TASK STATE:', taskState);

  // PRIMARY CHECK: taskState.completed boolean flag (most reliable)
  if (taskState.completed === true) {
    console.log('   ✅ Found: taskState.completed = true');
    return true;
  }

  // FALLBACK 1: Check task.isCompleted boolean (alternative property name)
  if (task.isCompleted === true) {
    console.log('   ✅ Found: task.isCompleted = true');
    return true;
  }

  // FALLBACK 2: Check task.completed boolean (another common pattern)
  if (task.completed === true) {
    console.log('   ✅ Found: task.completed = true');
    return true;
  }

  // FALLBACK 3: Check task.status field (handles string variations)
  if (task.status) {
    const status = normalizeStatus(task.status);
    console.log('   Found task.status:', task.status, '→ normalized:', status);

    const completedVariations = [
      'completed',
      'hoàn thành',
      'đã hoàn thành',
      'done',
      'xong'
    ];
    if (completedVariations.includes(status)) {
      console.log('   ✅ Found: task.status matches completed variation');
      return true;
    }
  }

  // FALLBACK 4: Check taskState.status field
  if (taskState.status) {
    const status = normalizeStatus(taskState.status);
    console.log('   Found taskState.status:', taskState.status, '→ normalized:', status);

    const completedVariations = [
      'completed',
      'hoàn thành',
      'đã hoàn thành',
      'done',
      'xong'
    ];
    if (completedVariations.includes(status)) {
      console.log('   ✅ Found: taskState.status matches completed variation');
      return true;
    }
  }

  // FALLBACK 5: Check if task has completionLink (indicates completion)
  if (task.completionLink || taskState.link) {
    console.log('   ✅ Found: Completion link exists (implies completed)');
    return true;
  }

  console.log('   ❌ No completion indicators found - task is incomplete');
  return false;
}

/**
 * Get the completion status using the EXACT SAME logic as badge
 * This ensures footer and badge stay in sync
 *
 * @param {Object} task - The task object
 * @param {Object} taskState - The task state
 * @returns {Object} { isCompleted: boolean, reason: string }
 */
function getCompletionStatus(task, taskState = {}) {
  console.log('📊 [getCompletionStatus] Determining completion status');

  // Use the same comprehensive check
  const completed = isTaskCompleted(task, taskState);

  console.log('   Result:', completed ? '✅ COMPLETED' : '❌ INCOMPLETE');

  return {
    isCompleted: completed,
    badgeShouldBeGreen: completed,
    footerShouldBeVisible: completed,
    inputShouldBeHidden: completed
  };
}

/**
 * Create a task card element for a single task
 *
 * @param {Object} options - Configuration object
 * @param {Object} options.task - Task data object
 * @param {Object} options.taskState - Task state (contains completed, link, etc)
 * @param {string} options.slug - Current URL slug/menu ID for proper linking
 * @param {Function} options.onComplete - Callback when task is marked complete
 * @param {Function} options.onView - Callback when View button is clicked
 * @param {Function} options.onEdit - Callback when Edit button is clicked
 * @param {Function} options.onComment - Callback when Comment button is clicked
 * @param {boolean} options.isAdmin - Whether current user is admin
 *
 * @returns {HTMLElement} - The task card element
 */
function createTaskItem(options) {
  const {
    task,
    taskState = {},
    slug = 'tongquan',
    onComplete = () => {},
    onView = () => {},
    onEdit = () => {},
    onComment = () => {},
    isAdmin = false
  } = options;

  // ===== CRITICAL DEBUG LOGGING =====
  console.log('📦 [createTaskItem] Creating task card');
  console.log('FULL TASK OBJECT:', task);
  console.log('FULL TASK STATE:', taskState);

  // Determine completion status using robust logic
  const completionStatus = getCompletionStatus(task, taskState);
  const completed = completionStatus.isCompleted;

  console.log('Current Task Status:', {
    taskId: task.id,
    taskTitle: task.title || task.name,
    isCompleted: completed,
    badgeShouldBeGreen: completionStatus.badgeShouldBeGreen,
    footerShouldBeVisible: completionStatus.footerShouldBeVisible
  });

  // Get task metadata
  const title = task.title || task.name || 'Untitled Task';
  const description = task.description || task.details?.join(', ') || '';
  const owner = task.owner || task.assignee || 'Unassigned';
  const startDate = task.startDate || 'N/A';
  const endDate = task.endDate || 'N/A';
  const durationDays = task.durationDays || task.duration || 1;
  const deadline = task.deadline || task.endDate || '';
  const completionLink = taskState.link || '';

  // Create card container
  const card = document.createElement('div');
  card.className = `task-card ${completed ? 'completed' : ''}`;
  card.id = `task-card-${task.id}`;
  card.dataset.taskId = task.id;
  card.dataset.phase = task.phase || '';
  card.dataset.start = startDate;
  card.dataset.end = endDate;
  card.dataset.completed = completed ? 'true' : 'false';

  // Build card HTML - BADGE AND FOOTER USE SAME COMPLETION CHECK
  card.innerHTML = `
    <div class="task-header">
      <h4 class="task-title">${escapeHtml(title)}</h4>
      <span id="task-status-${task.id}" class="task-status status-${completed ? 'completed' : 'pending'}">
        ${completed ? 'HOÀN THÀNH' : 'CHƯA XONG'}
      </span>
    </div>

    ${description ? `
      <div class="task-details">
        <div class="task-details-label">Chi tiết:</div>
        <p class="task-description">${escapeHtml(description)}</p>
      </div>
    ` : ''}

    <div class="task-meta">
      <span>📅 Bắt đầu: <strong>${escapeHtml(startDate)}</strong></span>
      <span>|</span>
      <span>📅 Hoàn thành dự kiến: <strong>${escapeHtml(endDate)}</strong></span>
      <span>|</span>
      <span>⏱️ Thời lượng: ${durationDays} ngày</span>
      <span>|</span>
      <span>👤 Phụ trách: ${escapeHtml(owner)}</span>
      <span class="deadline-countdown" data-deadline="${deadline}"></span>
    </div>

    <div class="task-action-area">
      <!-- INPUT GROUP: For incomplete tasks -->
      <div class="task-input-group" data-input-group="${task.id}" ${completed ? 'style="display:none;"' : ''}>
        <input
          type="url"
          class="task-link-input"
          id="task-input-${task.id}"
          data-task-id="${task.id}"
          data-slug="${slug}"
          placeholder="Dán link (tài liệu, file, trang kết quả...)"
          value="${escapeHtml(completionLink)}"
          ${completed ? 'disabled' : ''}
        />
        <button
          type="button"
          class="task-btn btn-complete task-complete-btn"
          id="task-complete-btn-${task.id}"
          data-task-id="${task.id}"
          ${completed ? 'disabled' : ''}
        >
          Hoàn Thành
        </button>
      </div>

      <!-- FEEDBACK MESSAGE -->
      <div class="task-link-feedback" id="task-feedback-${task.id}"></div>

      <!-- COMPLETED ACTIONS FOOTER: Use SAME logic as badge -->
      <div
        class="task-completed-actions ${completed ? '' : 'hidden'}"
        id="task-actions-${task.id}"
        data-completed-actions="${task.id}"
        aria-hidden="${completed ? 'false' : 'true'}"
        data-debug-completed="${completed}"
      >
        <button
          type="button"
          class="task-btn btn-view task-view-btn"
          id="task-view-btn-${task.id}"
          data-view-btn="${task.id}"
          data-slug="${slug}"
          ${!completionLink ? 'disabled' : ''}
          title="${completionLink ? 'View completion proof' : 'No completion link available'}"
        >
          🔗 View
        </button>
        <button
          type="button"
          class="task-btn btn-outline task-comment-btn"
          id="task-comment-btn-${task.id}"
          data-comment-toggle="${task.id}"
          aria-expanded="false"
        >
          💬 Comment
        </button>
        <button
          type="button"
          class="task-btn btn-secondary task-edit-btn"
          id="task-edit-btn-${task.id}"
          data-edit-link="${task.id}"
        >
          ✏️ Edit
        </button>
      </div>

      <!-- COMMENT SECTION: For completed tasks -->
      <div
        class="task-comment-section ${completed ? '' : 'hidden'}"
        id="task-comments-${task.id}"
        data-comment-section="${task.id}"
        aria-hidden="${completed ? 'false' : 'true'}"
      >
        <!-- Comments will be populated by updateUI -->
        <div class="task-comments-list" data-comments-list="${task.id}"></div>
        <div class="task-comment-input hidden" data-comment-input-area="${task.id}">
          <textarea
            class="task-link-input w-full"
            data-comment-input="${task.id}"
            placeholder="Add a comment..."
            rows="3"
          ></textarea>
          <div class="flex gap-2 mt-2">
            <button type="button" class="task-btn btn-secondary" data-comment-cancel="${task.id}">Cancel</button>
            <button type="button" class="task-btn btn-complete" data-comment-submit="${task.id}">Submit</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  attachTaskItemEventListeners(card, task, slug, { onComplete, onView, onEdit, onComment });

  console.log('✅ [createTaskItem] Task card created successfully');
  console.log('   Badge visible:', completed ? 'GREEN (HOÀN THÀNH)' : 'GRAY (CHƯA XONG)');
  console.log('   Footer visible:', completed ? 'YES' : 'NO');

  return card;
}

/**
 * Attach event listeners to a task card element
 * @param {HTMLElement} card - The task card element
 * @param {Object} task - The task data
 * @param {string} slug - The current URL slug
 * @param {Object} callbacks - Event callback functions
 */
function attachTaskItemEventListeners(card, task, slug, callbacks = {}) {
  const { onComplete = () => {}, onView = () => {}, onEdit = () => {}, onComment = () => {} } = callbacks;

  // Complete button
  const completeBtn = card.querySelector(`[data-task-id="${task.id}"].task-complete-btn`);
  if (completeBtn) {
    completeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('💾 [EVENT] Complete button clicked:', task.id);
      onComplete({ taskId: task.id, slug });
    });
  }

  // View button
  const viewBtn = card.querySelector(`[data-view-btn="${task.id}"]`);
  if (viewBtn) {
    viewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('👁️ [EVENT] View button clicked:', task.id);
      onView({ taskId: task.id, slug });
    });
  }

  // Edit button
  const editBtn = card.querySelector(`[data-edit-link="${task.id}"]`);
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('✏️ [EVENT] Edit button clicked:', task.id);
      onEdit({ taskId: task.id, slug });
    });
  }

  // Comment toggle button
  const commentBtn = card.querySelector(`[data-comment-toggle="${task.id}"]`);
  if (commentBtn) {
    commentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('💬 [EVENT] Comment button clicked:', task.id);
      onComment({ taskId: task.id, slug });
    });
  }

  // Input field - track changes
  const inputField = card.querySelector(`[data-task-id="${task.id}"].task-link-input`);
  if (inputField) {
    inputField.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      const completeButton = card.querySelector(`[data-task-id="${task.id}"].task-complete-btn`);
      if (completeButton) {
        completeButton.disabled = !value;
      }
    });
  }
}

/**
 * Update task card UI based on current state
 * Uses the SAME completion check logic as initial render
 *
 * @param {HTMLElement} card - The task card element
 * @param {Object} task - The task data
 * @param {Object} taskState - The task state
 */
function updateTaskCardUI(card, task, taskState = {}) {
  if (!card) return;

  console.log('🔄 [updateTaskCardUI] Updating card UI');

  // Use SAME completion logic as createTaskItem
  const completionStatus = getCompletionStatus(task, taskState);
  const completed = completionStatus.isCompleted;

  console.log('   Task:', task.id, '| Completed:', completed);

  // Update card class
  card.dataset.completed = completed ? 'true' : 'false';
  card.classList.toggle('completed', completed);

  // Update status badge
  const statusBadge = card.querySelector(`#task-status-${task.id}`);
  if (statusBadge) {
    statusBadge.className = `task-status status-${completed ? 'completed' : 'pending'}`;
    statusBadge.textContent = completed ? 'HOÀN THÀNH' : 'CHƯA XONG';
  }

  // Update input group visibility (mirror the badge logic)
  const inputGroup = card.querySelector(`[data-input-group="${task.id}"]`);
  if (inputGroup) {
    inputGroup.style.display = completed ? 'none' : '';
    inputGroup.classList.toggle('hidden', completed);
  }

  // Update completed actions footer visibility (SAME logic as badge)
  const actionsFooter = card.querySelector(`[data-completed-actions="${task.id}"]`);
  if (actionsFooter) {
    actionsFooter.classList.toggle('hidden', !completed);
    actionsFooter.setAttribute('aria-hidden', completed ? 'false' : 'true');
    actionsFooter.dataset.debugCompleted = completed ? 'true' : 'false';
  }

  // Update input field state
  const inputField = card.querySelector(`[data-task-id="${task.id}"].task-link-input`);
  if (inputField) {
    inputField.disabled = completed;
    inputField.value = taskState.link || '';
  }

  // Update button states
  const completeBtn = card.querySelector(`[data-task-id="${task.id}"].task-complete-btn`);
  if (completeBtn) {
    completeBtn.disabled = completed || !inputField?.value?.trim();
  }

  // Update View button
  const viewBtn = card.querySelector(`[data-view-btn="${task.id}"]`);
  if (viewBtn) {
    const hasLink = !!taskState.link;
    viewBtn.disabled = !hasLink;
    viewBtn.title = hasLink ? 'View completion proof' : 'No completion link available';
    viewBtn.setAttribute('aria-disabled', hasLink ? 'false' : 'true');
  }

  // Update comment section visibility (mirror the badge logic)
  const commentSection = card.querySelector(`[data-comment-section="${task.id}"]`);
  if (commentSection) {
    commentSection.classList.toggle('hidden', !completed);
    commentSection.setAttribute('aria-hidden', completed ? 'false' : 'true');
  }

  // Update feedback message
  const feedbackEl = card.querySelector(`#task-feedback-${task.id}`);
  if (feedbackEl && taskState.feedback) {
    feedbackEl.textContent = taskState.feedback;
    feedbackEl.className = `task-link-feedback ${taskState.feedbackType || ''}`;
  }

  console.log('   ✅ Card UI updated. Badge:', completed ? 'GREEN' : 'GRAY', '| Footer:', completed ? 'VISIBLE' : 'HIDDEN');
}

/**
 * Helper function to escape HTML special characters
 * @param {string} text - The text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

