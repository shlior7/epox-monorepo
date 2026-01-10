import React, { useState, useEffect } from 'react';
import { buildTestId } from '@/lib/utils/test-ids';

export interface Option {
  value: string;
  label: string;
}

interface DropdownSelectorProps {
  id: string;
  label: string;
  options: Option[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  id,
  label,
  options,
  selectedValue,
  onValueChange,
  customValue,
  onCustomValueChange,
}) => {
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    setShowCustom(selectedValue === 'Custom');
  }, [selectedValue]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onValueChange(value);
    if (value !== 'Custom') {
      onCustomValueChange('');
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">
        {label}
      </label>
      <select
        value={selectedValue}
        onChange={handleSelectChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        data-testid={buildTestId('dropdown', id)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showCustom && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder={`Enter custom ${label.toLowerCase()}...`}
          className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          data-testid={buildTestId('dropdown', id, 'custom')}
        />
      )}
    </div>
  );
};
