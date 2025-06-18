import React from 'react';
import { Medication, ChildInfo, UserType, DateRangeMealPlan, DailyMealPlanNew } from '../types';
import { MealPlanEditor } from './MealPlanEditor';
import { MedicationCard } from './MedicationCard';
import { PlusIcon } from './icons/PlusIcon';

export type ActiveModal = 'add_medication' | 'edit_medication' | 'overtime' | 'vacation' | 'notice' | 'edit_overtime' | 'edit_vacation' | 'edit_notice';


interface MiddleSectionProps {
  // 날짜 기반 식사 계획
  currentWeekMealPlans?: DateRangeMealPlan;
  onUpdateDateBasedMealPlan?: (date: string, mealPlan: DailyMealPlanNew) => void;
  onEditModeChange?: (editing: boolean) => void;
  onExitEdit?: () => void;
  
  // 공통 props
  medications: Medication[];
  childrenInfo: ChildInfo[];
  userType: UserType;
  onOpenModal: (modalType: ActiveModal, data?: any) => void;
  onToggleMedicationAdministered: (id: string) => void;
  onDeleteMedication: (id: string) => void;
  isEditingMealPlan: boolean;
}

export const MiddleSection: React.FC<MiddleSectionProps> = ({
  // 날짜 기반 식사 계획
  currentWeekMealPlans,
  onUpdateDateBasedMealPlan,
  onEditModeChange,
  onExitEdit,
  
  // 공통 props
  medications,
  childrenInfo,
  userType,
  onOpenModal,
  onToggleMedicationAdministered,
  onDeleteMedication,
  isEditingMealPlan,
}) => {
  const mainChildName = childrenInfo.length > 0 ? childrenInfo[0].name : "아이";
  const isCareProvider = userType === UserType.CARE_PROVIDER;
  

  // 날짜가 지난 투약 정보 필터링
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const safeMedications = Array.isArray(medications) ? medications : [];
  const activeMedications = safeMedications.filter(med => {
    const medDate = new Date(med.date);
    medDate.setHours(0,0,0,0);
    return medDate >= today; // 오늘까지만 표시, 내일부터 사라짐
  });

  const handleEditMedication = (med: Medication) => {
    onOpenModal('edit_medication', med);
  };
  
  return (
    <section className="space-y-6">
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-primary">식사 메뉴</h3>
        </div>

        {/* 날짜별 식사 계획 */}
        {currentWeekMealPlans && onUpdateDateBasedMealPlan ? (
          <MealPlanEditor
            currentWeekMealPlans={currentWeekMealPlans}
            isEditing={isEditingMealPlan && !isCareProvider}
            onUpdate={onUpdateDateBasedMealPlan}
            userType={userType}
            onEditModeChange={onEditModeChange}
          />
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              📅 날짜별 식사 계획을 불러오는 중입니다...
            </p>
          </div>
        )}

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
        {activeMedications.length === 0 ? (
          <p className="text-gray-500">등록된 투약 정보가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {activeMedications.map((med) => (
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