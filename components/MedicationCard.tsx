import React from 'react';
import { Medication, MedicationType, UserType } from '../types';
import { ExpandableCard } from './ExpandableCard';
import { PillIcon } from './icons/PillIcon';
import { SyringeIcon } from './icons/SyringeIcon'; // Assuming Tablet also uses PillIcon or needs a new one
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface MedicationCardProps {
  medication: Medication;
  childName?: string;
  userType: UserType;
  onToggleAdministered: (id: string) => void;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({ 
    medication, 
    childName, 
    userType,
    onToggleAdministered,
    onEdit,
    onDelete 
}) => {
  const title = childName ? `${childName} - ${medication.symptoms}` : medication.symptoms;
  
  const getIconForMedType = (type: MedicationType) => {
    switch(type) {
        case MedicationType.LIQUID: return <SyringeIcon className="w-4 h-4 inline-block text-blue-500" />;
        case MedicationType.POWDER: return <PillIcon className="w-4 h-4 inline-block text-green-500" />;
        case MedicationType.TABLET: return <PillIcon className="w-4 h-4 inline-block text-purple-500" />; // Example color
        default: return <PillIcon className="w-4 h-4 inline-block text-gray-500" />;
    }
  };

  const isCareProvider = userType === UserType.CARE_PROVIDER;

  const collapsedSummary = (
    <div className="w-full">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs text-gray-500">{childName ? `${childName} - ` : ''}{medication.symptoms}</p>
                 <div className="flex flex-wrap gap-1 mt-1">
                    {medication.medicationTypes.map(type => (
                        <span key={type} className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full flex items-center">
                            {getIconForMedType(type)}
                            <span className="ml-1">{type}</span>
                        </span>
                    ))}
                </div>
            </div>
            {!isCareProvider && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${medication.administered ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {medication.administered ? '투약 완료' : '투약 필요'}
                </span>
            )}
        </div>
        {isCareProvider && (
            <div className="mt-2 pt-2 border-t border-gray-200">
                 <label className="flex items-center cursor-pointer">
                    <input
                    type="checkbox"
                    checked={medication.administered}
                    onChange={() => onToggleAdministered(medication.id)}
                    className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                    />
                    <span className={`ml-2 font-medium ${medication.administered ? 'text-green-600' : 'text-red-600'}`}>
                        투약 완료
                    </span>
                </label>
            </div>
        )}
    </div>
  );

  return (
    <ExpandableCard 
        title={title} 
        titleIcon={<PillIcon className="w-5 h-5 text-primary"/>} 
        collapsedSummary={collapsedSummary}
        initiallyExpanded={isCareProvider && !medication.administered} // Expand if care provider and needs administration
    >
      <div className="space-y-3 text-sm">
        <p><strong>날짜:</strong> {new Date(medication.date).toLocaleDateString()}</p>
        <p><strong>증상:</strong> {medication.symptoms}</p>
        <p>
          <strong>약 종류:</strong> 
          {medication.medicationTypes.map((type, index) => (
            <span key={type} className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs inline-flex items-center">
              {getIconForMedType(type)} <span className="ml-1">{type}</span>{index < medication.medicationTypes.length - 1 ? ',' : ''}
            </span>
          ))}
        </p>
        {medication.dosage && <p><strong>투약 용량:</strong> {medication.dosage}</p>}
        <p><strong>투약 시간:</strong> {medication.timing}</p>
        <p><strong>보관 방법:</strong> <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">{medication.storage}</span></p>
        {medication.notes && <p><strong>비고:</strong> {medication.notes}</p>}
        
        <div className="mt-4 pt-3 border-t flex justify-between items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={medication.administered}
              onChange={() => onToggleAdministered(medication.id)}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
            />
            <span className={`ml-2 font-medium ${medication.administered ? 'text-green-600' : 'text-red-600'}`}>
              투약 완료
            </span>
          </label>

          {userType === UserType.PARENT && (
            <div className="flex space-x-2">
              <button 
                onClick={() => onEdit(medication)} 
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
                aria-label="수정"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  if(window.confirm(`${medication.symptoms} 투약 정보를 삭제하시겠습니까?`)){
                    onDelete(medication.id);
                  }
                }}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full"
                aria-label="삭제"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </ExpandableCard>
  );
};