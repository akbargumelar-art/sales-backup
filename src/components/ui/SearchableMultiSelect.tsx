'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableMultiSelectProps = {
  label: string;
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  selectedCountLabel?: (count: number) => string;
};

export default function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  searchPlaceholder = 'Cari...',
  emptyLabel = 'Data tidak ditemukan',
  selectedCountLabel = (count) => `${count} pilihan dipilih`,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet],
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  const summaryLabel = selectedValues.length === 0
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : selectedCountLabel(selectedValues.length);

  const toggleValue = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`w-full input-field text-left flex items-center justify-between gap-3 ${selectedValues.length > 0 ? 'text-primary font-medium' : ''}`}
        >
          <span className="truncate">{summaryLabel}</span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
            />
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-40 animate-scale-in overflow-hidden">
              <div className="p-2 border-b border-border/70">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-white text-body text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className={`w-full text-left px-4 py-2.5 text-body hover:bg-surface transition-colors flex items-center gap-2.5 ${selectedValues.length === 0 ? 'bg-primary/5 text-primary font-medium' : 'text-text-primary'}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedValues.length === 0 ? 'bg-primary border-primary text-white' : 'border-border bg-white'}`}>
                    {selectedValues.length === 0 && <Check size={12} />}
                  </span>
                  {placeholder}
                </button>

                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-body text-text-secondary">{emptyLabel}</p>
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = selectedSet.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleValue(option.value)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors border-t border-border/50 flex items-start gap-2.5 ${isSelected ? 'bg-primary/5 text-primary' : 'text-text-primary'}`}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-border bg-white'}`}>
                          {isSelected && <Check size={12} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body font-medium truncate">{option.label}</span>
                          {option.description && (
                            <span className="block text-[10px] text-text-secondary truncate">{option.description}</span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-2 border-t border-border/70 flex items-center gap-2 bg-white">
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="px-3 py-2 rounded-lg text-caption font-medium text-error hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <X size={13} />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="ml-auto px-3 py-2 rounded-lg bg-primary/10 text-primary text-caption font-medium"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
