import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, StopIcon } from './Icons';
import { Spinner } from './Spinner';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
    label: string;
    options: SelectOption[];
}

interface SelectProps {
  label: string;
  options: (SelectOption | SelectOptionGroup)[];
  value: string;
  onChangeValue: (value: string) => void;
  onPreview?: (value: string) => void;
  previewingValue?: string | null;
}

const isOptionGroup = (option: SelectOption | SelectOptionGroup): option is SelectOptionGroup => {
    return 'options' in option;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  value, 
  onChangeValue,
  onPreview,
  previewingValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allOptions = options.flatMap(opt => isOptionGroup(opt) ? opt.options : [opt]);
  const selectedLabel = allOptions.find(opt => opt.value === value)?.label || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (selectedValue: string) => {
    onChangeValue(selectedValue);
    setIsOpen(false);
  }

  const handlePreviewClick = (e: React.MouseEvent, previewValue: string) => {
    e.stopPropagation();
    if(onPreview) {
      onPreview(previewValue);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-left flex justify-between items-center"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border-2 border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          <ul role="listbox">
            {options.map((option, index) => {
              if (isOptionGroup(option)) {
                return (
                  <li key={`${option.label}-${index}`}>
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">{option.label}</div>
                    <ul>
                      {option.options.map((groupOption) => (
                        <ListItem 
                          key={groupOption.value}
                          option={groupOption}
                          isSelected={value === groupOption.value}
                          onSelect={handleSelect}
                          onPreview={onPreview ? handlePreviewClick : undefined}
                          isPreviewing={previewingValue === groupOption.value}
                        />
                      ))}
                    </ul>
                  </li>
                );
              }
              return (
                <ListItem 
                  key={option.value}
                  option={option}
                  isSelected={value === option.value}
                  onSelect={handleSelect}
                  onPreview={onPreview ? handlePreviewClick : undefined}
                  isPreviewing={previewingValue === option.value}
                />
              )
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

interface ListItemProps {
  option: SelectOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
  onPreview?: (e: React.MouseEvent, value: string) => void;
  isPreviewing: boolean;
}

const ListItem: React.FC<ListItemProps> = ({ option, isSelected, onSelect, onPreview, isPreviewing }) => (
  <li
    onClick={() => onSelect(option.value)}
    className={`px-3 py-2 cursor-pointer flex justify-between items-center text-sm ${
      isSelected ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'
    }`}
    role="option"
    aria-selected={isSelected}
  >
    <span>{option.label}</span>
    {onPreview && (
      <button 
        onClick={(e) => onPreview(e, option.value)}
        className="p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label={`Preview voice ${option.label}`}
      >
        {isPreviewing ? <Spinner /> : <PlayIcon className="h-4 w-4" />}
      </button>
    )}
  </li>
)