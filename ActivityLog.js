/**
 * ActivityLog Component
 * A React component for displaying paginated activity logs
 *
 * Props:
 * - activities: Array of activity objects [{ id, content, user, timestamp, status }]
 * - itemsPerPage: Number of items per page (default: 10)
 */

import React, { useState } from 'react';

const ActivityLog = ({ activities = [], itemsPerPage = 10 }) => {
  // State for current page
  const [currentPage, setCurrentPage] = useState(1);

  // Constants
  const ITEMS_PER_PAGE = itemsPerPage;

  // Calculate total pages
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);

  // Get current page data using slice
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = activities.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Handle previous page
  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle next page
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';

    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return String(timestamp);
    }
  };

  // Get status badge styling
  const getStatusStyle = (status) => {
    const statusMap = {
      completed: { color: '#059669', label: 'Completed' },
      edited: { color: '#2563eb', label: 'Edited' },
      deleted: { color: '#dc2626', label: 'Deleted' },
      created: { color: '#9333ea', label: 'Created' },
      updated: { color: '#d97706', label: 'Updated' },
      pending: { color: '#4b5563', label: 'Pending' }
    };

    const statusInfo = statusMap[status] || { color: '#4b5563', label: status };
    return statusInfo;
  };

  const pageNumbers = getPageNumbers();
  const showingStart = activities.length > 0 ? startIndex + 1 : 0;
  const showingEnd = Math.min(endIndex, activities.length);

  return (
    <div className="activity-log-wrapper" style={{ width: '100%' }}>
      {/* Header */}
      <div
        className="activity-log-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
          Activity Log
        </h3>
        <span
          className="activity-count"
          style={{ color: '#6b7280', fontSize: '0.875rem' }}
        >
          {activities.length > 0
            ? `Showing ${showingStart}-${showingEnd} of ${activities.length}`
            : 'No activities'}
        </span>
      </div>

      {/* Table */}
      <div
        className="activity-log-table-wrapper"
        style={{ overflowX: 'auto', marginBottom: '1rem' }}
      >
        <table
          className="activity-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <thead>
            <tr>
              <th style={tableHeaderStyle}>ID</th>
              <th style={tableHeaderStyle}>Content</th>
              <th style={tableHeaderStyle}>User</th>
              <th style={tableHeaderStyle}>Timestamp</th>
              <th style={tableHeaderStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#9ca3af'
                  }}
                >
                  No activities found
                </td>
              </tr>
            ) : (
              currentData.map((activity, index) => {
                const statusInfo = getStatusStyle(activity.status);
                return (
                  <tr
                    key={activity.id || index}
                    style={{ transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <td style={tableCellStyle}>{activity.id || '-'}</td>
                    <td style={tableCellStyle}>{activity.content || '-'}</td>
                    <td style={tableCellStyle}>{activity.user || '-'}</td>
                    <td style={tableCellStyle}>
                      {formatTimestamp(activity.timestamp)}
                    </td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          color: statusInfo.color,
                          fontWeight: '500'
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="pagination"
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1rem'
          }}
        >
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            style={{
              ...paginationButtonStyle,
              ...(currentPage === 1 ? disabledButtonStyle : {})
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
          >
            Previous
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  style={{
                    color: '#9ca3af',
                    padding: '0.5rem'
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={isActive}
                style={{
                  ...paginationButtonStyle,
                  ...(isActive ? activeButtonStyle : {})
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                {page}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            style={{
              ...paginationButtonStyle,
              ...(currentPage === totalPages ? disabledButtonStyle : {})
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// Styles
const tableHeaderStyle = {
  background: '#f9fafb',
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: '600',
  borderBottom: '2px solid #e5e7eb',
  fontSize: '0.875rem',
  color: '#374151'
};

const tableCellStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '0.875rem',
  color: '#1f2937'
};

const paginationButtonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  transition: 'all 0.2s',
  minWidth: '40px'
};

const activeButtonStyle = {
  backgroundColor: '#3b82f6',
  color: 'white',
  borderColor: '#3b82f6',
  cursor: 'default'
};

const disabledButtonStyle = {
  opacity: 0.5,
  cursor: 'not-allowed'
};

export default ActivityLog;
