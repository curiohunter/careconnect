import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { UserType } from '../types';
import { TopSection } from './TopSection';
import { MiddleSection, ActiveModal } from './MiddleSection';
import { BottomSection } from './BottomSection';
import { Modal } from './Modal';
import { AddMedicationForm } from './AddMedicationForm';
import { AddSpecialScheduleItemForm } from './AddSpecialScheduleItemForm';
import WorkScheduleSettings from './WorkScheduleSettings';
import InviteCodeManager from './InviteCodeManager';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SettingsIcon } from './icons/SettingsIcon';

export const Dashboard: React.FC = () => {
  const { user, userProfile, connection, signOut } = useAuth();
  const {
    children,
    weeklySchedules,
    mealPlan,
    medications,
    specialScheduleItems,
    workSchedule,
    loading: dataLoading,
    saveChildren,
    updateChildWeeklySchedule,
    updateMealPlan,
    addMedication,
    updateMedication,
    deleteMedication,
    toggleMedicationAdministered,
    addSpecialScheduleItem,
    updateSpecialScheduleItem,
    markNoticeAsRead
  } = useData();

  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [showWorkScheduleSettings, setShowWorkScheduleSettings] = useState(false);
  const [showInviteCodeManager, setShowInviteCodeManager] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [editingMedication, setEditingMedication] = useState<any>(null);

  // 활성 아이 설정
  useEffect(() => {
    if (children.length > 0 && !activeChildId) {
      setActiveChildId(children[0].id);
    } else if (children.length === 0) {
      setActiveChildId(null);
    }
  }, [children, activeChildId]);

  // 로딩 상태
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 연결이 없는 경우
  if (!connection) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-primary text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">CareConnect</h1>
            <div className="flex items-center space-x-3">
              <UserCircleIcon className="w-8 h-8"/>
              <span>{userProfile?.name} ({userProfile?.userType === UserType.PARENT ? '부모' : '돌봄 선생님'})</span>
              <button
                onClick={() => setShowInviteCodeManager(true)}
                className="p-2 rounded-full hover:bg-blue-700 transition-colors"
                aria-label="초대 코드 관리"
              >
                <SettingsIcon className="w-6 h-6" />
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-full hover:bg-blue-700 transition-colors"
                aria-label="로그아웃"
              >
                <LogoutIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SettingsIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">연결 설정이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              {userProfile?.userType === UserType.PARENT ? '돌봄 선생님' : '부모'}과 연결하여 정보를 공유하세요.
            </p>
            <button
              onClick={() => setShowInviteCodeManager(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              초대 코드로 연결하기
            </button>
          </div>
        </main>

        <InviteCodeManager 
          isOpen={showInviteCodeManager}
          onClose={() => setShowInviteCodeManager(false)}
        />
      </div>
    );
  }

  const openModal = (modalType: ActiveModal, data?: any) => {
    if (modalType === 'edit_medication' && data) {
      setEditingMedication(data);
    }
    setActiveModal(modalType);
  };
  
  const closeModal = () => {
    setActiveModal(null);
    setEditingMedication(null);
  };

  const handleAddOrUpdateMedication = (formData: any) => {
    if (activeModal === 'edit_medication' && editingMedication) {
      updateMedication(editingMedication.id, formData);
    } else if (activeModal === 'add_medication') {
      addMedication(formData);
    }
    closeModal();
  };
  
  const handleAddSpecialItem = (item: any) => {
    addSpecialScheduleItem(item);
    closeModal();
  };
  
  const mainChildName = activeChildId && children.find(c => c.id === activeChildId)?.name 
                        || (children.length > 0 ? children[0].name : "아이");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">CareConnect</h1>
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-8 h-8"/>
            <span>{userProfile?.name} ({userProfile?.userType === UserType.PARENT ? '부모' : '돌봄 선생님'})</span>
            
            <div className="relative group">
              <button className="p-2 rounded-full hover:bg-blue-700 transition-colors">
                <SettingsIcon className="w-6 h-6" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <button
                  onClick={() => setShowInviteCodeManager(true)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  초대 코드 관리
                </button>
                {userProfile?.userType === UserType.CARE_PROVIDER && (
                  <button
                    onClick={() => setShowWorkScheduleSettings(true)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    근무 일정 설정
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={signOut}
              className="p-2 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="로그아웃"
            >
              <LogoutIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 space-y-6 overflow-y-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg">
           <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">{mainChildName} 주간 일정표</h2>
            <button 
                onClick={() => setEditingSchedule(!editingSchedule)}
                className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-amber-600 rounded-md transition-colors"
            >
                {editingSchedule ? '저장' : '일정 편집'}
            </button>
           </div>
          <TopSection 
            childWeeklySchedules={weeklySchedules}
            activeChildId={activeChildId}
            childrenInfo={children}
            onActiveChildChange={setActiveChildId}
            isEditing={editingSchedule}
            onUpdateChildSchedule={updateChildWeeklySchedule}
            userType={userProfile?.userType || UserType.PARENT}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <MiddleSection
            mealPlan={mealPlan}
            medications={medications}
            childrenInfo={children}
            userType={userProfile?.userType || UserType.PARENT}
            onOpenModal={openModal}
            onToggleMedicationAdministered={toggleMedicationAdministered}
            onDeleteMedication={deleteMedication}
            isEditingMealPlan={editingSchedule} 
            onUpdateMealPlan={updateMealPlan}
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <BottomSection 
            userType={userProfile?.userType || UserType.PARENT}
            onOpenModal={openModal}
            specialScheduleItems={specialScheduleItems}
            onMarkNoticeAsRead={markNoticeAsRead}
          />
        </div>
      </main>

      <footer className="bg-darkgray text-white text-center p-4">
        &copy; {new Date().getFullYear()} CareConnect. 모든 권리 보유.
      </footer>

      {activeModal === 'add_medication' && (
        <Modal isOpen={true} onClose={closeModal} title="새 투약 정보 추가">
          <AddMedicationForm 
            onSubmit={handleAddOrUpdateMedication} 
            childrenInfo={children}
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'edit_medication' && editingMedication && (
        <Modal isOpen={true} onClose={closeModal} title="투약 정보 수정">
          <AddMedicationForm 
            onSubmit={handleAddOrUpdateMedication} 
            childrenInfo={children}
            medicationToEdit={editingMedication}
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'overtime' && (
        <Modal isOpen={true} onClose={closeModal} title="연장 근무 요청">
          <AddSpecialScheduleItemForm 
            type="OVERTIME_REQUEST" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            onSubmit={handleAddSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'vacation' && (
        <Modal isOpen={true} onClose={closeModal} title="휴가 요청">
          <AddSpecialScheduleItemForm 
            type="VACATION" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            onSubmit={handleAddSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'notice' && (
        <Modal isOpen={true} onClose={closeModal} title="안내사항 작성">
          <AddSpecialScheduleItemForm 
            type="NOTICE" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            onSubmit={handleAddSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}

      <WorkScheduleSettings 
        isOpen={showWorkScheduleSettings}
        onClose={() => setShowWorkScheduleSettings(false)}
      />
      
      <InviteCodeManager 
        isOpen={showInviteCodeManager}
        onClose={() => setShowInviteCodeManager(false)}
      />
    </div>
  );
};

export default Dashboard;
