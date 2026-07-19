import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, Minus } from 'lucide-react';
import { Button } from './Button.jsx';
import { Checkbox } from './Input.jsx';

export function Table({
  columns = [],
  data = [],
  keyExtractor = (row) => row.id,
  sortable = false,
  onSort,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  pagination = false,
  pageSize = 10,
  onPageChange,
  loading = false,
  emptyTitle = 'No data',
  emptyMessage = 'No records found',
  emptyAction,
  rowClassName,
  onRowClick,
  stickyHeader = false,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    if (!sortable) return;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSort?.({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, sortable]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedData.length]);

  const isAllSelected = selectable && paginatedData.length > 0 && paginatedData.every(row => selectedKeys.includes(keyExtractor(row)));
  const isIndeterminate = selectable && paginatedData.some(row => selectedKeys.includes(keyExtractor(row))) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(paginatedData.map(keyExtractor));
    }
  };

  const toggleRowSelection = (key) => {
    const newSelection = selectedKeys.includes(key)
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key];
    onSelectionChange?.(newSelection);
  };

  if (loading) {
    return (
      <div className="table-wrap" role="status" aria-live="polite" aria-busy="true">
        <table className="table table--loading">
          <thead>
            <tr>
              {selectable && <th className="table__expand"><Checkbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={toggleSelectAll} aria-label="Select all rows" /> </th>}
              {columns.map((column) => (
                <th key={column.key} className={column.align} style={{ width: column.width }}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="table__sort-btn"
                      onClick={() => handleSort(column.key)}
                      aria-sort={sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {column.label}
                      <span className="table__sort-icon" aria-hidden="true">
                        {sortConfig.key === column.key
                          ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')
                          : ' ⇅'}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="table__skeleton-row">
                {selectable && <td className="table__expand" />}
                {columns.map((column) => (
                  <td key={column.key} className={column.align}>
                    <div className="skeleton skeleton--text" style={{ width: '60%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (paginatedData.length === 0) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {selectable && <th className="table__expand" />}
              {columns.map((column) => (
                <th key={column.key} className={column.align} style={{ width: column.width }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="table__empty">
                <div className="empty-state empty-state--center">
                  <div className="empty-state__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="empty-state__title">{emptyTitle}</h3>
                  <p className="empty-state__message">{emptyMessage}</p>
                  {emptyAction && (
                    <div className="empty-state__action">
                      <Button {...emptyAction} />
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap" role="region" aria-label="Data table" tabIndex={0}>
      <table className="table" style={{ position: stickyHeader ? 'relative' : 'static' }}>
        <thead style={{ position: stickyHeader ? 'sticky' : 'static', top: 0, zIndex: 1 }}>
          <tr>
            {selectable && (
              <th className="table__expand" style={{ width: '40px' }}>
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all rows"
                  style={{ margin: 0 }}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.align}
                style={{ width: column.width }}
              >
                {column.sortable && sortable ? (
                  <button
                    type="button"
                    className="table__sort-btn"
                    onClick={() => handleSort(column.key)}
                    aria-sort={sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {column.label}
                    <span className="table__sort-icon" aria-hidden="true">
                      {sortConfig.key === column.key
                        ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')
                        : ' ⇅'}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, rowIndex) => {
            const rowKey = keyExtractor(row);
            const isSelected = selectedKeys.includes(rowKey);
            const rowClasses = [
              'table__row',
              isSelected && 'table__row--selected',
              onRowClick && 'table__row--clickable',
              rowClassName?.(row, rowIndex),
            ].filter(Boolean).join(' ');

            return (
              <tr
                key={rowKey}
                className={rowClasses}
                onClick={onRowClick ? () => onRowClick(row, rowKey) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {selectable && (
                  <td className="table__expand">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRowSelection(rowKey)}
                      aria-label={`Select row ${rowIndex + 1}`}
                      style={{ margin: 0 }}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={column.align}>
                    {column.render
                      ? column.render(row, rowIndex)
                      : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={sortedData.length}
          onPageSizeChange={(size) => {
            setCurrentPage(1);
            onPageChange?.(size);
          }}
        />
      )}
    </div>
  );
}

function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  onPageSizeChange,
}) {
  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="table__pagination" role="navigation" aria-label="Pagination">
      <div className="table__pagination-info" aria-live="polite">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </div>
      <div className="table__pagination-controls">
        <div className="table__page-size">
          <label htmlFor="page-size" className="sr-only">Rows per page</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="select"
            style={{ width: 'auto', paddingRight: '2.5rem' }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>

        <button
          className="icon-button icon-button--sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          aria-disabled={currentPage === 1}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className="icon-button icon-button--sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          aria-disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="table__pages" role="group" aria-label="Pages">
          {pages.map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="table__ellipsis" aria-hidden="true">…</span>
            ) : (
              <button
                key={page}
                className={`table__page ${page === currentPage ? 'table__page--active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          className="icon-button icon-button--sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          aria-disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="icon-button icon-button--sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          aria-disabled={currentPage === totalPages}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 4, rows = 5 }) {
  return (
    <div className="table-wrap" role="status" aria-live="polite" aria-busy="true">
      <table className="table table--loading">
        <thead>
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i}>
                <div className="skeleton skeleton--text" style={{ width: '80%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <tr key={i} className="table__skeleton-row">
              {[...Array(columns)].map((_, j) => (
                <td key={j}>
                  <div className="skeleton skeleton--text" style={{ width: '60%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}