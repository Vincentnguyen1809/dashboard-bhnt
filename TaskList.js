/**
 * TaskList Component (Vanilla JS)
 * Manages rendering a collection of tasks with proper slug/menuId passing
 *
 * IMPROVEMENTS:
 * 1. Passes current URL slug to each TaskItem
 * 2. Centralized event handling with context
 * 3. Proper state synchronization across tasks
 */

/**
 * Create and render a list of tasks
 *
 * @param {Object} options - Configuration object
 * @param {Array} options.tasks - Array of task objects
 * @param {string} options.containerId - HTML element ID where tasks will be rendered
 * @param {string} options.slug - Current URL slug for generating proper links
 * @param {Object} options.taskStates - Object mapping task IDs to their states
 * @param {Function} options.onTaskComplete - Callback when a task is marked complete
 * @param {Function} options.onTaskView - Callback when View button is clicked
 * @param {Function} options.onTaskEdit - Callback when Edit button is clicked
 * @param {Function} options.onTaskComment - Callback when Comment button is clicked
 * @param {boolean} options.isAdmin - Whether current user is admin
 * @param {Function} options.onError - Error callback
 *
 * @returns {HTMLElement} - The container element with all tasks
 */
function createTaskList(options) {
  const {
    tasks = [],
    containerId = 'tasks-container',
    slug = 'tongquan',
    taskStates = {},
    onTaskComplete = () => {},
    onTaskView = () => {},
    onTaskEdit = () => {},
    onTaskComment = () => {},
    isAdmin = false,
    onError = () => {}
  } = options;

  console.log('📋 [TASK LIST] Rendering task list', {
    containerID: containerId,
    taskCount: tasks.length,
    slug: slug,
    isAdmin: isAdmin
  });

  // Get or create container
  let container = document.getElementById(containerId);
  if (!container) {
    console.warn(`⚠️ [TASK LIST] Container with ID "${containerId}" not found`);
    return null;
  }

  // Clear existing content
  container.innerHTML = '';

  // Handle empty task list
  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="text-center text-gray-500 py-8">
          ${isAdmin ? 'No tasks yet. Go to Plan Management to add tasks.' : 'No tasks available.'}
        </p>
      </div>
    `;
    return container;
  }

  // Render each task
  tasks.forEach((task, index) => {
    try {
      if (!task || !task.id) {
        console.warn('⚠️ [TASK LIST] Invalid task object at index', index, task);
        return;
      }

      // Get or create task state
      const taskState = taskStates[task.id] || {
        completed: false,
        link: '',
        completedAt: null,
        comments: [],
        updatedAt: null
      };

      // Create task item element
      const taskCard = createTaskItem({
        task,
        taskState,
        slug,
        onComplete: (e) => {
          console.log('✅ [TASK LIST] Complete clicked:', e);
          onTaskComplete(e);
        },
        onView: (e) => {
          console.log('👁️ [TASK LIST] View clicked:', e);
          onTaskView(e);
        },
        onEdit: (e) => {
          console.log('✏️ [TASK LIST] Edit clicked:', e);
          onTaskEdit(e);
        },
        onComment: (e) => {
          console.log('💬 [TASK LIST] Comment clicked:', e);
          onTaskComment(e);
        },
        isAdmin
      });

      // Append to container
      if (taskCard) {
        container.appendChild(taskCard);
      }
    } catch (error) {
      console.error('❌ [TASK LIST] Error rendering task:', task, error);
      onError({ taskId: task?.id, error });
    }
  });

  console.log('✅ [TASK LIST] Rendered', tasks.length, 'tasks in container:', containerId);
  return container;
}

/**
 * Update all task cards in a container based on current states
 *
 * @param {string} containerId - HTML element ID of task container
 * @param {Object} taskStates - Updated task states mapping
 * @param {Array} tasks - Array of task objects (for reference)
 */
function updateTaskList(containerId, taskStates = {}, tasks = []) {
  console.log('🔄 [TASK LIST] Updating task list:', {
    containerId,
    taskCount: tasks.length,
    stateCount: Object.keys(taskStates).length
  });

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`⚠️ [TASK LIST] Container with ID "${containerId}" not found for update`);
    return;
  }

  // Update each task card
  tasks.forEach((task) => {
    if (!task || !task.id) return;

    const card = document.getElementById(`task-card-${task.id}`);
    if (card) {
      const taskState = taskStates[task.id] || {};
      updateTaskCardUI(card, task, taskState);
    }
  });

  console.log('✅ [TASK LIST] Updated UI for all tasks');
}

/**
 * Get the current menu slug from URL or from dynamicMenus array
 * This ensures we're always using the LATEST slug for the menu
 *
 * @param {string} menuId - The menu ID
 * @param {Array} dynamicMenus - The array of dynamic menus
 * @returns {string} - The current slug for this menu
 */
function getMenuSlug(menuId, dynamicMenus = []) {
  if (!menuId) return 'tongquan';

  // If dynamicMenus is provided, use it to get the current slug
  if (Array.isArray(dynamicMenus) && dynamicMenus.length > 0) {
    const menu = dynamicMenus.find(m => m.id === menuId);
    if (menu && menu.slug) {
      return menu.slug;
    }
  }

  // Fallback to menuId if slug not available
  return menuId;
}

/**
 * Get task states from taskState object
 * Ensures we have all necessary task entries
 *
 * @param {Array} tasks - Array of tasks
 * @param {Object} taskState - The global taskState object
 * @returns {Object} - Object mapping task IDs to their states
 */
function getTaskStates(tasks = [], taskState = {}) {
  const states = {};

  tasks.forEach((task) => {
    if (!task || !task.id) return;

    // Ensure task has an entry in taskState
    if (!taskState[task.id]) {
      taskState[task.id] = {
        completed: false,
        link: '',
        completedAt: null,
        comments: [],
        updatedAt: null
      };
    }

    states[task.id] = taskState[task.id];
  });

  return states;
}

/**
 * Handler: Complete a task
 * Validates input and marks task as complete
 *
 * @param {Object} options - Handler options
 * @param {string} options.taskId - The task ID
 * @param {string} options.slug - The current menu slug
 * @param {Object} options.taskState - The global taskState object
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
function handleTaskComplete(options) {
  const {
    taskId,
    slug = 'tongquan',
    taskState = {},
    onSuccess = () => {},
    onError = () => {}
  } = options;

  console.log('⏳ [HANDLER] Completing task:', { taskId, slug });

  // Validate task has a completion link
  const inputEl = document.getElementById(`task-input-${taskId}`);
  if (!inputEl || !inputEl.value.trim()) {
    console.warn('⚠️ [HANDLER] No completion link provided');
    onError({
      taskId,
      message: 'Please enter a completion link before marking complete'
    });
    return;
  }

  const completionLink = inputEl.value.trim();

  // Validate URL format
  try {
    new URL(completionLink);
  } catch (e) {
    console.error('❌ [HANDLER] Invalid URL format:', completionLink);
    onError({
      taskId,
      message: 'Invalid URL format. Please enter a complete URL (http:// or https://)'
    });
    return;
  }

  // Update task state
  if (!taskState[taskId]) {
    taskState[taskId] = {};
  }

  taskState[taskId].completed = true;
  taskState[taskId].link = completionLink;
  taskState[taskId].completedAt = new Date().toISOString();
  taskState[taskId].updatedAt = new Date().toISOString();

  console.log('✅ [HANDLER] Task completed:', taskState[taskId]);

  onSuccess({
    taskId,
    slug,
    state: taskState[taskId]
  });
}

/**
 * Handler: View completed task proof
 * Opens the completion link in a new window
 *
 * @param {Object} options - Handler options
 * @param {string} options.taskId - The task ID
 * @param {string} options.slug - The current menu slug
 * @param {Object} options.taskState - The global taskState object
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
function handleTaskView(options) {
  const {
    taskId,
    slug = 'tongquan',
    taskState = {},
    onSuccess = () => {},
    onError = () => {}
  } = options;

  console.log('👁️ [HANDLER] Viewing task:', { taskId, slug });

  const state = taskState[taskId];
  if (!state || !state.link) {
    console.warn('⚠️ [HANDLER] No completion link available');
    onError({
      taskId,
      message: 'No completion link available for this task'
    });
    return;
  }

  console.log('🔗 [HANDLER] Opening link:', state.link);

  try {
    window.open(state.link, '_blank', 'noopener,noreferrer');
    onSuccess({
      taskId,
      slug,
      link: state.link
    });
  } catch (error) {
    console.error('❌ [HANDLER] Error opening link:', error);
    onError({
      taskId,
      message: 'Failed to open completion link'
    });
  }
}

/**
 * Handler: Edit completed task (reopen it)
 * Marks a completed task as incomplete again
 *
 * @param {Object} options - Handler options
 * @param {string} options.taskId - The task ID
 * @param {string} options.slug - The current menu slug
 * @param {Object} options.taskState - The global taskState object
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
function handleTaskEdit(options) {
  const {
    taskId,
    slug = 'tongquan',
    taskState = {},
    onSuccess = () => {},
    onError = () => {}
  } = options;

  console.log('✏️ [HANDLER] Editing task:', { taskId, slug });

  if (!taskState[taskId]) {
    taskState[taskId] = {};
  }

  taskState[taskId].completed = false;
  taskState[taskId].completedAt = null;
  taskState[taskId].updatedAt = new Date().toISOString();

  console.log('✅ [HANDLER] Task reopened for editing:', taskState[taskId]);

  onSuccess({
    taskId,
    slug,
    state: taskState[taskId]
  });
}

/**
 * Handler: Toggle comment section for a task
 * Shows/hides the comment section UI
 *
 * @param {Object} options - Handler options
 * @param {string} options.taskId - The task ID
 * @param {string} options.slug - The current menu slug
 * @param {Object} options.openCommentSections - Set of currently open comment sections
 * @param {Function} options.onSuccess - Success callback
 */
function handleTaskComment(options) {
  const {
    taskId,
    slug = 'tongquan',
    openCommentSections = new Set(),
    onSuccess = () => {}
  } = options;

  console.log('💬 [HANDLER] Toggling comment section:', { taskId, slug });

  // Toggle open state
  if (openCommentSections.has(taskId)) {
    openCommentSections.delete(taskId);
  } else {
    openCommentSections.add(taskId);
  }

  console.log('✅ [HANDLER] Comment section toggled. Is open:', openCommentSections.has(taskId));

  onSuccess({
    taskId,
    slug,
    isOpen: openCommentSections.has(taskId)
  });
}
