
import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

interface ExpandableCardProps {
  title: string;
  collapsedSummary?: ReactNode;
  children: ReactNode;
  initiallyExpanded?: boolean;
  titleIcon?: ReactNode;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  collapsedSummary,
  children,
  initiallyExpanded = false,
  titleIcon
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border border-gray-300 rounded-lg shadow-sm bg-white">
      <button
        onClick={toggleExpansion}
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded-t-lg"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center">
            {titleIcon && <span className="mr-2">{titleIcon}</span>}
            <h4 className="text-md font-semibold text-gray-700">{title}</h4>
        </div>
        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
      </button>
      {!isExpanded && collapsedSummary && (
        <div className="px-4 pb-3 text-sm text-gray-600">
            {collapsedSummary}
        </div>
      )}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};
