/**
 * ActivityLog Component
 * A vanilla JavaScript component for displaying paginated activity logs
 *
 * @param {Object} config - Configuration object
 * @param {string} config.containerId - ID of the container element
 * @param {Array} config.activities - Array of activity objects
 * @param {number} config.itemsPerPage - Number of items per page (default: 10)
 */
class ActivityLog {
  constructor(config) {
    this.containerId = config.containerId;
    this.activities = config.activities || [];
    this.itemsPerPage = config.itemsPerPage || 10;
    this.currentPage = 1;
    this.container = null;

    this.init();
  }

  /**
   * Initialize the component
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with ID "${this.containerId}" not found`);
      return;
    }
    this.render();
  }

  /**
   * Update activities data and re-render
   * @param {Array} activities - New activities array
   */
  updateActivities(activities) {
    this.activities = activities || [];
    this.currentPage = 1; // Reset to first page
    this.render();
  }

  /**
   * Calculate total pages
   * @returns {number} Total number of pages
   */
  getTotalPages() {
    return Math.ceil(this.activities.length / this.itemsPerPage);
  }

  /**
   * Get activities for the current page
   * @returns {Array} Sliced activities for current page
   */
  getCurrentPageData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.activities.slice(startIndex, endIndex);
  }

  /**
   * Handle page change
   * @param {number} page - Page number to navigate to
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();

    // Validate page number
    if (page < 1 || page > totalPages) {
      return;
    }

    this.currentPage = page;
    this.render();
  }

  /**
   * Go to previous page
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Go to next page
   */
  nextPage() {
    const totalPages = this.getTotalPages();
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Get status badge HTML
   * @param {string} status - Activity status
   * @returns {string} HTML for status badge
   */
  getStatusBadge(status) {
    const statusMap = {
      completed: { text: 'Completed', className: 'text-green-600' },
      edited: { text: 'Edited', className: 'text-blue-600' },
      deleted: { text: 'Deleted', className: 'text-red-600' },
      created: { text: 'Created', className: 'text-purple-600' },
      updated: { text: 'Updated', className: 'text-yellow-600' },
      pending: { text: 'Pending', className: 'text-gray-600' }
    };

    const statusInfo = statusMap[status] || { text: status, className: 'text-gray-600' };
    return `<span class="${statusInfo.className}" style="font-weight: 500;">${statusInfo.text}</span>`;
  }

  /**
   * Format timestamp
   * @param {string|Date} timestamp - Timestamp to format
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '-';

    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return timestamp.toString();
    }
  }

  /**
   * Render table rows
   * @returns {string} HTML for table rows
   */
  renderTableRows() {
    const currentData = this.getCurrentPageData();

    if (currentData.length === 0) {
      return `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: #9ca3af;">
            No activities found
          </td>
        </tr>
      `;
    }

    return currentData.map(activity => `
      <tr>
        <td>${activity.id || '-'}</td>
        <td>${activity.content || '-'}</td>
        <td>${activity.user || '-'}</td>
        <td>${this.formatTimestamp(activity.timestamp)}</td>
        <td>${this.getStatusBadge(activity.status)}</td>
      </tr>
    `).join('');
  }

  /**
   * Generate page numbers for pagination
   * @returns {Array} Array of page numbers or ellipsis
   */
  getPageNumbers() {
    const totalPages = this.getTotalPages();
    const current = this.currentPage;
    const pages = [];

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (current < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  }

  /**
   * Render pagination controls
   * @returns {string} HTML for pagination
   */
  renderPagination() {
    const totalPages = this.getTotalPages();

    if (totalPages <= 1) {
      return ''; // No pagination needed
    }

    const pageNumbers = this.getPageNumbers();
    const current = this.currentPage;

    const pageButtons = pageNumbers.map(page => {
      if (page === '...') {
        return '<span class="pagination-ellipsis">...</span>';
      }

      const isActive = page === current;
      const activeClass = isActive ? 'active' : '';

      return `<button
        class="pagination-btn ${activeClass}"
        data-page="${page}"
        ${isActive ? 'disabled' : ''}
      >${page}</button>`;
    }).join('');

    return `
      <div class="pagination" style="display: flex; gap: 0.5rem; align-items: center; justify-content: center; margin-top: 1rem;">
        <button
          class="pagination-btn"
          data-action="previous"
          ${current === 1 ? 'disabled' : ''}
        >Previous</button>

        ${pageButtons}

        <button
          class="pagination-btn"
          data-action="next"
          ${current === totalPages ? 'disabled' : ''}
        >Next</button>
      </div>
    `;
  }

  /**
   * Attach event listeners to pagination buttons
   */
  attachEventListeners() {
    if (!this.container) return;

    // Remove old listeners by cloning and replacing the pagination container
    const paginationContainer = this.container.querySelector('.pagination');
    if (!paginationContainer) return;

    // Event delegation for pagination clicks
    paginationContainer.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const page = button.getAttribute('data-page');
      const action = button.getAttribute('data-action');

      if (page) {
        this.goToPage(parseInt(page, 10));
      } else if (action === 'previous') {
        this.previousPage();
      } else if (action === 'next') {
        this.nextPage();
      }
    });
  }

  /**
   * Render the complete component
   */
  render() {
    if (!this.container) return;

    const totalPages = this.getTotalPages();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.activities.length);

    this.container.innerHTML = `
      <div class="activity-log-wrapper">
        <div class="activity-log-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0;">Activity Log</h3>
          <span class="activity-count" style="color: #6b7280; font-size: 0.875rem;">
            ${this.activities.length > 0 ? `Showing ${startIndex}-${endIndex} of ${this.activities.length}` : 'No activities'}
          </span>
        </div>

        <div class="activity-log-table-wrapper" style="overflow-x: auto;">
          <table class="notes-table activity-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="background: #f9fafb; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">ID</th>
                <th style="background: #f9fafb; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Content</th>
                <th style="background: #f9fafb; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">User</th>
                <th style="background: #f9fafb; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Timestamp</th>
                <th style="background: #f9fafb; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows()}
            </tbody>
          </table>
        </div>

        ${this.renderPagination()}
      </div>
    `;

    // Attach event listeners after rendering
    this.attachEventListeners();
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.activities = [];
    this.currentPage = 1;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActivityLog;
}
