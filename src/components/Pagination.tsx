import React from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  className = ""
}: PaginationProps) {
  if (totalPages <= 1) {
    if (totalItems && totalItems > 0) {
      return (
        <div className={`flex items-center justify-between px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 text-xs text-slate-400 font-medium ${className}`}>
          <div>
            Showing <span className="font-bold text-white">1</span> to{" "}
            <span className="font-bold text-white">{totalItems}</span> of{" "}
            <span className="font-bold text-white">{totalItems}</span> links
          </div>
          <div className="text-slate-500 font-semibold">Page 1 of 1</div>
        </div>
      );
    }
    return null;
  }

  const pages = getPageNumbers(currentPage, totalPages);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || currentPage * itemsPerPage);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 text-xs ${className}`}>
      {/* Item Counter */}
      <div className="text-slate-400 font-medium">
        {totalItems !== undefined ? (
          <>
            Showing <span className="font-bold text-white">{startItem.toLocaleString()}</span> to{" "}
            <span className="font-bold text-white">{endItem.toLocaleString()}</span> of{" "}
            <span className="font-bold text-white">{totalItems.toLocaleString()}</span> links
          </>
        ) : (
          <>
            Page <span className="font-bold text-white">{currentPage}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span>
          </>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:border-slate-700/80 disabled:hover:text-slate-300 transition"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:border-slate-700/80 disabled:hover:text-slate-300 transition font-extrabold text-sm leading-none"
          title="Previous Page"
        >
          «
        </button>

        {/* Numeric Page Buttons */}
        {pages.map((p, idx) => {
          if (typeof p === "string") {
            return (
              <span key={`ellipsis-${idx}`} className="px-2.5 py-1 text-slate-500 font-extrabold select-none">
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3.5 py-1.5 rounded-lg border font-bold transition text-xs ${
                isCurrent
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white"
              }`}
            >
              {p.toLocaleString()}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:border-slate-700/80 disabled:hover:text-slate-300 transition font-extrabold text-sm leading-none"
          title="Next Page"
        >
          »
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/60 disabled:hover:border-slate-700/80 disabled:hover:text-slate-300 transition"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
