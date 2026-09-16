import React from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Standardized BaseTable component.
 * Ensures consistent table container styling, responsive scrolling,
 * standardized header layouts, empty states, and standard row height bounds.
 */
export default function BaseTable({
  columns = [],
  data = [],
  renderRow,
  children,
  headers,
  loading = false,
  emptyState = null,
  emptyMessage = 'No data available',
  variant = 'dark', // 'dark' | 'light' | 'auto'
  stickyHeader = false,
  className = '',
  tableClassName = '',
  headerClassName = '',
  bodyClassName = '',
  rowHeight = 'h-16 min-h-[4rem]',
  footer = null,
}) {
  const isDark = variant === 'dark' || (variant === 'auto' && true);

  const containerClasses = isDark
    ? 'bg-[#282828] rounded-xl border border-[#383838] shadow-sm overflow-hidden'
    : 'bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden';

  const defaultTheadClasses = isDark
    ? 'bg-[#1a1a1a] text-gray-300 border-b border-[#383838] text-xs uppercase tracking-wider'
    : 'bg-[#1E1F25] text-white border-b border-[#E5E7EB] text-xs uppercase tracking-wider';

  const defaultTbodyClasses = isDark
    ? 'divide-y divide-[#383838] text-sm text-[#eff2f6]'
    : 'divide-y divide-[#E5E7EB] text-sm text-[#1E1F25]';

  const colCount = columns.length || 1;

  const renderEmptyContent = () => {
    if (React.isValidElement(emptyState)) {
      return emptyState;
    }
    if (emptyState && typeof emptyState === 'object') {
      const { icon: Icon, title, description, action } = emptyState;
      return (
        <div className="py-12 px-4 text-center">
          {Icon && (
            <div className="flex justify-center mb-3 text-gray-400">
              {React.isValidElement(Icon) ? Icon : <Icon size={32} className="opacity-60" />}
            </div>
          )}
          {title && <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-[#eff2f6]' : 'text-gray-900'}`}>{title}</h3>}
          {description && <p className={`text-xs max-w-sm mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      );
    }
    return (
      <div className={`py-10 px-4 text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {emptyMessage}
      </div>
    );
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left ${tableClassName}`}>
          {(columns.length > 0 || headers) && (
            <thead className={`${defaultTheadClasses} ${stickyHeader ? 'sticky top-0 z-10' : ''} ${headerClassName}`}>
              {headers ? (
                headers
              ) : (
                <tr>
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    return (
                      <th
                        key={col.key || col.label}
                        className={`px-4 py-3.5 font-semibold text-xs tracking-wider ${alignClass} ${
                          col.width || ''
                        } ${col.headerClassName || ''}`}
                      >
                        {col.label ?? col.header}
                      </th>
                    );
                  })}
                </tr>
              )}
            </thead>
          )}

          <tbody className={`${defaultTbodyClasses} ${bodyClassName}`}>
            {loading ? (
              <tr className={rowHeight}>
                <td colSpan={colCount} className="py-12 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((item, index) => {
                if (renderRow) {
                  return renderRow(item, index);
                }
                return (
                  <tr
                    key={item.id || item._id || index}
                    className={`${rowHeight} ${isDark ? 'hover:bg-[#323232]' : 'hover:bg-[#F8F9FB]'} transition-colors align-middle`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 align-middle ${alignClass} ${col.className || ''}`}
                        >
                          {col.render ? col.render(item, index) : item[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : children ? (
              children
            ) : (
              <tr>
                <td colSpan={colCount} className="p-0">
                  {renderEmptyContent()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className={`p-4 border-t ${isDark ? 'border-[#383838] bg-[#1a1a1a]' : 'border-[#E5E7EB] bg-[#F8F9FB]'}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
