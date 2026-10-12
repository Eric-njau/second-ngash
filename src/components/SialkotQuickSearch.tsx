import React from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { BRANDS_LIST, BODY_TYPES } from '../data/inventory';
import { FilterState } from '../types';

interface SialkotQuickSearchProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  totalFound: number;
}

export const SialkotQuickSearch: React.FC<SialkotQuickSearchProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalFound
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 relative z-20">
      <div className="bg-white dark:bg-[#111622] rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 transition-colors duration-200">
        {/* Top category tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: 'All Inventory' },
              { id: 'FOREIGN USED', label: 'Foreign Used' },
              { id: 'LOCALLY USED', label: 'Locally Used' },
              { id: 'BRAND NEW', label: 'Brand New' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => onFilterChange({ ...filters, condition: tab.id })}
                className={`text-xs sm:text-sm font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filters.condition === tab.id
                    ? 'bg-[#d71921] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 ml-auto">
            <ThinkingOrb
              state={filters.searchQuery ? "searching" : "breathing"}
              size={20}
              color="#d71921"
            />
            <span>Showing:</span>
            <strong className="text-[#d71921] font-mono-num font-bold text-sm">
              {totalFound}
            </strong>
            <span>vehicles</span>
          </div>
        </div>

        {/* 4-Field Search Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Make / Brand */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Select Make
            </label>
            <select
              value={filters.brands[0] || ''}
              onChange={e => {
                const val = e.target.value;
                onFilterChange({
                  ...filters,
                  brands: val ? [val] : []
                });
              }}
              className="w-full text-xs sm:text-sm py-2.5 px-3 bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-[#1a2538] focus:outline-none focus:ring-2 focus:ring-[#d71921]"
            >
              <option value="" className="dark:bg-[#161f2e]">All Makes</option>
              {BRANDS_LIST.map(b => (
                <option key={b} value={b} className="dark:bg-[#161f2e]">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Body Type */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Body Type
            </label>
            <select
              value={filters.bodyTypes[0] || ''}
              onChange={e => {
                const val = e.target.value;
                onFilterChange({
                  ...filters,
                  bodyTypes: val ? [val] : []
                });
              }}
              className="w-full text-xs sm:text-sm py-2.5 px-3 bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-[#1a2538] focus:outline-none focus:ring-2 focus:ring-[#d71921]"
            >
              <option value="" className="dark:bg-[#161f2e]">All Body Types</option>
              {BODY_TYPES.filter(b => b !== 'All Types').map(bt => (
                <option key={bt} value={bt} className="dark:bg-[#161f2e]">
                  {bt}
                </option>
              ))}
            </select>
          </div>

          {/* Max Budget */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Max Budget (Ksh)
            </label>
            <select
              value={filters.maxPrice}
              onChange={e => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
              className="w-full text-xs sm:text-sm py-2.5 px-3 bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-[#1a2538] focus:outline-none focus:ring-2 focus:ring-[#d71921] font-mono-num"
            >
              <option value={10000000} className="dark:bg-[#161f2e]">Any Budget</option>
              <option value={3000000} className="dark:bg-[#161f2e]">Under Ksh 3.0 Million</option>
              <option value={4000000} className="dark:bg-[#161f2e]">Under Ksh 4.0 Million</option>
              <option value={5000000} className="dark:bg-[#161f2e]">Under Ksh 5.0 Million</option>
              <option value={6000000} className="dark:bg-[#161f2e]">Under Ksh 6.0 Million</option>
              <option value={7000000} className="dark:bg-[#161f2e]">Under Ksh 7.0 Million</option>
            </select>
          </div>

          {/* Search keyword & CTA */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Search Model / Keyword
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. Prado, Hilux, Harrier, Land Cruiser..."
                  value={filters.searchQuery}
                  onChange={e => onFilterChange({ ...filters, searchQuery: e.target.value })}
                  className={`w-full text-xs sm:text-sm py-2.5 pl-8 ${filters.searchQuery ? 'pr-8' : 'pr-3'} bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:bg-white dark:focus:bg-[#1a2538] focus:outline-none focus:ring-2 focus:ring-[#d71921]`}
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {filters.searchQuery && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ThinkingOrb state="searching" size={20} color="#d71921" />
                  </div>
                )}
              </div>

              {(filters.searchQuery || filters.brands.length > 0 || filters.bodyTypes.length > 0 || filters.maxPrice < 10000000 || filters.condition !== 'ALL') && (
                <button
                  onClick={onResetFilters}
                  title="Reset filters"
                  className="px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
