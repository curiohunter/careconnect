import React from 'react';
import { DailyMealPlan, Medication, ChildInfo, DayOfWeek, UserType } from '../types';
import { MealPlanTable } from './MealPlanTable';
import { MedicationCard } from './MedicationCard';
import { PlusIcon } from './icons/PlusIcon';

export type ActiveModal = 'add_medication' | 'edit_medication' | 'overtime' | 'vacation' | 'notice';


interface MiddleSectionProps {
  mealPlan: DailyMealPlan;
  medications: Medication[];
  childrenInfo: ChildInfo[];
  userType: UserType;
  onOpenModal: (modalType: ActiveModal, data?: any) => void; // data can be medicationToEdit
  onToggleMedicationAdministered: (id: string) => void;
  onDeleteMedication: (id: string) => void;
  isEditingMealPlan: boolean;
  onUpdateMealPlan: (day: DayOfWeek, menu: string, notes: string) => void;
}

export const MiddleSection: React.FC<MiddleSectionProps> = ({
  mealPlan,
  medications,
  childrenInfo,
  userType,
  onOpenModal,
  onToggleMedicationAdministered,
  onDeleteMedication,
  isEditingMealPlan,
  onUpdateMealPlan,
}) => {
  const mainChildName = childrenInfo.length > 0 ? childrenInfo[0].name : "아이"; // This might need to adapt if multiple children selected
  const isCareProvider = userType === UserType.CARE_PROVIDER;

  const handleEditMedication = (med: Medication) => {
    onOpenModal('edit_medication', med);
  };
  
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-primary mb-3">식사 메뉴</h3>
        <MealPlanTable 
            plan={mealPlan} 
            isEditing={isEditingMealPlan && !isCareProvider} // Only parents can edit
            onUpdate={onUpdateMealPlan}
            isCareProvider={isCareProvider}
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold text-primary">
            {childrenInfo.length > 1 ? "아이들" : mainChildName} 투약 정보
          </h3>
          {!isCareProvider && (
            <button
              onClick={() => onOpenModal('add_medication')} // Corrected modal type
              className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              투약 정보 추가
            </button>
          )}
        </div>
        {medications.length === 0 ? (
          <p className="text-gray-500">등록된 투약 정보가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                childName={childrenInfo.find(c => c.id === med.childId)?.name}
                userType={userType}
                onToggleAdministered={onToggleMedicationAdministered}
                onEdit={handleEditMedication} // This calls onOpenModal with 'edit_medication' and med data
                onDelete={onDeleteMedication}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};