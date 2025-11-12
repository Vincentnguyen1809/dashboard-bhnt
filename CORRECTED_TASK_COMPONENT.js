/**
 * ============================================
 * CORRECTED TASK CARD RENDERING COMPONENT
 * ============================================
 *
 * This is the complete, production-ready version with:
 * - Robust completed status checking
 * - Proper footer visibility logic
 * - Debug logging for diagnostics
 */

function createTaskCard(t){
  const card = document.createElement('div');
  card.className = 'task-card';
  card.id = 'task-card-' + t.id;
  card.dataset.phase = t.phase;
  card.dataset.start = t.startDate || '';
  card.dataset.end = t.endDate || '';

  card.innerHTML = `
    <div class="task-header">
      <h4 class="task-title">${t.title}</h4>
      <span id="task-status-${t.id}" class="task-status status-pending">CHƯA XONG</span>
    </div>
    <div class="task-details">
      <div class="task-details-label">Chi tiết:</div>
      <ul class="task-detail-list">${t.details.map(d=>`<li>${d}</li>`).join('')}</ul>
    </div>
    <div class="task-meta">
      <span>Bắt đầu: <strong>${t.startDate}</strong></span><span>|</span>
      <span>Hoàn thành dự kiến: <strong>${t.endDate}</strong></span><span>|</span>
      <span>Thời lượng: ${t.durationDays || 1} ngày</span><span>|</span>
      <span>Phụ trách: ${t.owner}</span>
      <span class="deadline-countdown" data-deadline="${t.deadline}"></span>
    </div>
    <div class="task-action-area">
      <!-- INPUT GROUP: Shows when task is NOT completed -->
      <div class="task-input-group" data-input-group="${t.id}">
        <input type="url" class="task-link-input" data-task-id="${t.id}" data-phase="${t.phase}" placeholder="Dán link (tài liệu, file, trang kết quả...)"/>
        <button type="button" class="task-btn btn-complete task-complete-btn" data-task-id="${t.id}" disabled>Hoàn Thành</button>
      </div>
      <div class="task-link-feedback" data-link-feedback="${t.id}"></div>

      <!-- COMPLETED FOOTER: Shows when task IS completed -->
      <div class="task-completed-actions hidden" data-completed-actions="${t.id}">
        <button type="button" class="task-btn btn-view task-view-btn" data-view-btn="${t.id}" disabled>🔗 View</button>
        <button type="button" class="task-btn btn-outline" data-comment-toggle="${t.id}" aria-expanded="false">💬 Comment</button>
        <button type="button" class="task-btn btn-secondary" data-edit-link="${t.id}">✏️ Edit</button>
      </div>

      <!-- COMMENT SECTION: Shows when user clicks Comment button -->
      <div class="task-comment-section hidden" data-comment-section="${t.id}" aria-hidden="true"></div>
    </div>`;

  console.log(`📦 [CREATE] Created task card for "${t.title}" (${t.id})`);
  return card;
}

/**
 * ============================================
 * UPDATE UI FUNCTION - Controls Footer Visibility
 * ============================================
 *
 * This function is called:
 * 1. On initial page load (with empty/default taskState)
 * 2. When Firestore data arrives (with real taskState)
 * 3. When user completes/deletes a task
 */
function updateUI(){
  let total = 0, done = 0;
  const phaseCounts = {
    gd1:{total:0,completed:0},
    gd2:{total:0,completed:0},
    gd3:{total:0,completed:0},
    gd4:{total:0,completed:0}
  };

  console.log('🔍 [DEBUG] updateUI() called. Total tasks:', allTasks.length);
  console.log('🔍 [DEBUG] taskState object:', taskState);

  allTasks.forEach(task => {
    const state = ensureTaskEntry(task.id);
    total++;
    if(phaseCounts[task.phase]) phaseCounts[task.phase].total++;

    // Log each task's status
    console.log(`🔍 [DEBUG] Task ${task.id} - Title: "${task.title}", Completed: ${state.completed}, Link: "${state.link}"`);

    // Get DOM elements
    const card = document.getElementById('task-card-'+task.id);
    const statusBadge = document.getElementById('task-status-'+task.id);
    const input = document.querySelector(`[data-task-id="${task.id}"]`);
    const inputGroup = document.querySelector(`[data-input-group="${task.id}"]`);
    const actions = document.querySelector(`[data-completed-actions="${task.id}"]`);
    const viewBtn = actions ? actions.querySelector('[data-view-btn]') : null;
    const countdownSpan = card ? card.querySelector('.deadline-countdown') : null;
    const deadlineInfo = evaluateDeadline(task.deadline, state.completed);
    const isOverdueTask = deadlineInfo && deadlineInfo.status === 'danger';

    if(input) input.value = state.link || '';

    // ==========================================
    // CRITICAL CONDITION: Check if task is completed
    // ==========================================
    if(state.completed){
      console.log(`✅ [DEBUG] Task ${task.id} IS COMPLETED - Showing footer`);

      // Verify footer element exists
      if(!actions){
        console.error(`❌ [ERROR] Task ${task.id} - Footer element NOT FOUND in DOM!`);
      }

      done++;
      if(phaseCounts[task.phase]) phaseCounts[task.phase].completed++;

      // Style the card as completed
      if(card){
        card.classList.add('completed');
        card.classList.remove('overdue');
      }

      // Update status badge
      if(statusBadge){
        statusBadge.className = 'task-status status-completed';
        statusBadge.textContent = 'HOÀN THÀNH';
      }

      // HIDE input group (for incomplete tasks)
      if(inputGroup) {
        inputGroup.classList.add('hidden');
        console.log(`  → Input group hidden for task ${task.id}`);
      }

      // SHOW completed actions footer
      if(actions) {
        actions.classList.remove('hidden');
        console.log(`  → Footer SHOWN for task ${task.id}`);
      }

      // Disable input
      if(input) input.disabled = true;

      // Enable/disable View button based on link validity
      if(viewBtn){
        const disabled = !isProjectReady || !hasValidCompletionLink(state);
        viewBtn.disabled = disabled;
        viewBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }

      // Update countdown to show completion date
      if(countdownSpan){
        const completedText = formatDateFromISO(state.completedAt);
        countdownSpan.className = 'deadline-countdown deadline-safe';
        countdownSpan.textContent = completedText ? `Hoàn thành: ${completedText}` : 'Đã hoàn thành';
      }

      // Initialize comment section
      initializeCommentSection(task.id);

      // Handle comment section visibility
      const commentSection = document.querySelector(`[data-comment-section="${task.id}"]`);
      const commentsList = document.querySelector(`[data-comments-list="${task.id}"]`);
      const commentToggleBtn = document.querySelector(`[data-comment-toggle="${task.id}"]`);
      const commentCount = Array.isArray(state.comments) ? state.comments.length : 0;

      // Auto-open comment section if there are comments
      if(commentCount > 0 && !openCommentSections.has(task.id) && !autoOpenedCommentSections.has(task.id)){
        openCommentSections.add(task.id);
        autoOpenedCommentSections.add(task.id);
      }

      const shouldShowComments = openCommentSections.has(task.id);

      if(commentSection){
        commentSection.classList.toggle('hidden', !shouldShowComments);
        commentSection.setAttribute('aria-hidden', shouldShowComments ? 'false' : 'true');
      }

      if(commentToggleBtn){
        let toggleLabel = '💬 Comment';
        if(shouldShowComments){
          toggleLabel = 'Ẩn comment';
        } else if(commentCount > 0){
          toggleLabel = `Xem comment (${commentCount})`;
        }
        commentToggleBtn.textContent = toggleLabel;
        commentToggleBtn.setAttribute('aria-expanded', shouldShowComments ? 'true' : 'false');
      }

      // Display all comments
      if(commentsList){
        commentsList.innerHTML = '';
        if(Array.isArray(state.comments) && state.comments.length > 0){
          state.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'bg-gray-50 p-3 rounded border border-gray-200';
            const timestamp = comment.timestamp ? new Date(comment.timestamp).toLocaleString('vi-VN') : '';
            commentDiv.innerHTML = `
              <div class="flex items-start justify-between mb-1">
                <span class="font-semibold text-sm text-gray-800">${escapeHtml(comment.userName || 'Người dùng')}</span>
                <span class="text-xs text-gray-500">${timestamp}</span>
              </div>
              <div class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(comment.text)}</div>
            `;
            commentsList.appendChild(commentDiv);
          });
        }
      }
    } else {
      // ==========================================
      // Task is NOT completed - Show input group
      // ==========================================
      console.log(`⏸️ [DEBUG] Task ${task.id} is INCOMPLETE - Showing input group`);

      if(card){
        card.classList.remove('completed');
        if(isOverdueTask) card.classList.add('overdue');
        else card.classList.remove('overdue');
      }

      if(statusBadge){
        const statusClass = isOverdueTask ? 'status-overdue' : 'status-pending';
        statusBadge.className = 'task-status ' + statusClass;
        statusBadge.textContent = isOverdueTask ? 'QUÁ HẠN' : 'CHƯA XONG';
      }

      // SHOW input group
      if(inputGroup) {
        inputGroup.classList.remove('hidden');
        console.log(`  → Input group SHOWN for task ${task.id}`);
      }

      // HIDE completed actions footer
      if(actions) {
        actions.classList.add('hidden');
        console.log(`  → Footer hidden for task ${task.id}`);
      }

      // Enable input
      if(input) input.disabled = false;

      // Update countdown
      if(countdownSpan){
        if(deadlineInfo){
          countdownSpan.className = 'deadline-countdown ' + deadlineInfo.className;
          countdownSpan.textContent = deadlineInfo.text;
        } else {
          countdownSpan.className = 'deadline-countdown';
          countdownSpan.textContent = '';
        }
      }

      // Hide comment section for incomplete tasks
      const commentSection = document.querySelector(`[data-comment-section="${task.id}"]`);
      const commentToggleBtn = document.querySelector(`[data-comment-toggle="${task.id}"]`);
      openCommentSections.delete(task.id);

      if(commentSection){
        commentSection.classList.add('hidden');
        commentSection.setAttribute('aria-hidden', 'true');
      }

      if(commentToggleBtn){
        commentToggleBtn.textContent = '💬 Comment';
        commentToggleBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Update progress statistics
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const progressBar = $('#overview-progress-bar');
  const progressText = $('#overview-progress-text');
  const completedCount = $('#overview-completed-count');
  const totalCount = $('#overview-total-count');
  const percentLabel = $('#overview-percent-label');

  if(progressBar){
    progressBar.style.width = percent + '%';
    progressBar.setAttribute('aria-valuenow', String(percent));
  }
  if(progressText) progressText.textContent = `${done} / ${total}`;
  if(completedCount) completedCount.textContent = String(done);
  if(totalCount) totalCount.textContent = String(total);
  if(percentLabel) percentLabel.textContent = percent + '%';

  // Update phase progress
  Object.keys(phaseCounts).forEach(phase => {
    const phasePercent = phaseCounts[phase].total > 0
      ? Math.round((phaseCounts[phase].completed / phaseCounts[phase].total) * 100)
      : 0;
    const phaseBar = document.getElementById(`${phase}-progress-bar`);
    const phaseText = document.getElementById(`${phase}-progress-text`);
    if(phaseBar){
      phaseBar.style.width = phasePercent + '%';
      phaseBar.setAttribute('aria-valuenow', String(phasePercent));
    }
    if(phaseText){
      phaseText.textContent = `${phaseCounts[phase].completed} / ${phaseCounts[phase].total}`;
    }
  });

  // Update chart
  if(progressChart && progressChart.data && progressChart.data.datasets){
    progressChart.data.datasets[0].data = [done, total - done];
    progressChart.update();
  }

  // Update activity log
  renderActivityLog();

  console.log('🔍 [DEBUG] updateUI() complete. Completed tasks:', done, '/', total);
}
