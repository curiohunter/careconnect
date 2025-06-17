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
import ChildrenManager from './ChildrenManager';
import { ScheduleTemplateManager } from './ScheduleTemplateManager';
import { DailyHandoverNotes } from './DailyHandoverNotes';
import { ProviderSwitcher } from './ProviderSwitcher';
import { SchedulePatternManager } from './SchedulePatternManager';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SettingsIcon } from './icons/SettingsIcon';

export const Dashboard: React.FC = () => {
  const { user, userProfile, connection, signOut } = useAuth();
  const {
    children,
    mealPlan,
    medications,
    specialScheduleItems,
    workSchedule,
    loading: dataLoading,
    saveChildren,
    updateMealPlan,
    addMedication,
    updateMedication,
    deleteMedication,
    toggleMedicationAdministered,
    addSpecialScheduleItem,
    updateSpecialScheduleItem,
    deleteSpecialScheduleItem,
    markNoticeAsRead,
    currentWeekSchedules,
    loadCurrentWeekSchedules,
    updateDailySchedule,
    currentWeekMealPlans,
    loadCurrentWeekMealPlans,
    updateDateBasedMealPlan,
    checkAndMigrateMealPlan,
    recurringTemplates,
    loadRecurringTemplates,
    saveRecurringTemplate,
    deleteRecurringTemplate,
    applyRecurringTemplate
  } = useData();

  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [showWorkScheduleSettings, setShowWorkScheduleSettings] = useState(false);
  const [showInviteCodeManager, setShowInviteCodeManager] = useState(false);
  const [showChildrenManager, setShowChildrenManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showSchedulePatternManager, setShowSchedulePatternManager] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState(false);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [editingMedication, setEditingMedication] = useState<any>(null);
  const [editingSpecialItem, setEditingSpecialItem] = useState<any>(null);

  // 활성 아이 설정
  useEffect(() => {
    if (children.length > 0 && !activeChildId) {
      setActiveChildId(children[0].id);
    } else if (children.length === 0) {
      setActiveChildId(null);
    }
  }, [children, activeChildId]);
  
  // 활성 아이가 변경될 때마다 템플릿 로드 (인댑스 오류 방지를 위해 비활성화)
  // useEffect(() => {
  //   if (activeChildId && loadRecurringTemplates) {
  //     loadRecurringTemplates(activeChildId);
  //   }
  // }, [activeChildId, loadRecurringTemplates]);
  
  // 새로운 날짜별 스케줄 초기 로드
  useEffect(() => {
    if (connection && children.length > 0 && loadCurrentWeekSchedules) {
      console.log('📅 현재 주 스케줄 초기 로드 시작');
      loadCurrentWeekSchedules();
    }
  }, [connection, children, loadCurrentWeekSchedules]);

  // 새로운 날짜별 식사 계획 초기 로드
  useEffect(() => {
    if (connection && loadCurrentWeekMealPlans) {
      console.log('🍽️ 현재 주 식사 계획 초기 로드 시작');
      loadCurrentWeekMealPlans();
    }
  }, [connection, loadCurrentWeekMealPlans]);

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
    if (modalType.startsWith('edit_') && modalType !== 'edit_medication' && data) {
      setEditingSpecialItem(data);
    }
    setActiveModal(modalType);
  };
  
  const closeModal = () => {
    setActiveModal(null);
    setEditingMedication(null);
    setEditingSpecialItem(null);
  };

  const handleAddOrUpdateMedication = (formData: any) => {
    if (activeModal === 'edit_medication' && editingMedication) {
      updateMedication(editingMedication.id, formData);
    } else if (activeModal === 'add_medication') {
      addMedication(formData);
    }
    closeModal();
  };
  
  const handleAddOrUpdateSpecialItem = (item: any) => {
    if (editingSpecialItem) {
      updateSpecialScheduleItem(editingSpecialItem.id, item);
    } else {
      addSpecialScheduleItem(item);
    }
    closeModal();
  };
  
  const handleEditSpecialItem = (item: any) => {
    const modalType = item.type === 'OVERTIME_REQUEST' ? 'edit_overtime' : 
                      item.type === 'VACATION' ? 'edit_vacation' : 'edit_notice';
    openModal(modalType as ActiveModal, item);
  };
  
  const handleDeleteSpecialItem = async (itemId: string) => {
    try {
      await deleteSpecialScheduleItem(itemId);
    } catch (error) {
      // 에러는 useData에서 처리
    }
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
                {userProfile?.userType === UserType.PARENT && (
                  <button
                    onClick={() => setShowChildrenManager(true)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    아이 정보 관리
                  </button>
                )}
                {userProfile?.userType === UserType.CARE_PROVIDER && (
                  <>
                    <button
                      onClick={() => setShowWorkScheduleSettings(true)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      근무 일정 설정
                    </button>
                    <button
                      onClick={() => setShowSchedulePatternManager(true)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      근무 패턴 관리
                    </button>
                  </>
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
            {userProfile?.userType === UserType.PARENT && (
              <div className="flex gap-2">
                <button 
                    onClick={() => {
                      if (activeChildId) {
                        setShowTemplateManager(true);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                    반복 일정
                </button>
                <button 
                    onClick={() => setEditingSchedule(!editingSchedule)}
                    className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-amber-600 rounded-md transition-colors"
                >
                    {editingSchedule ? '저장' : '일정 편집'}
                </button>
                <button 
                    onClick={() => setEditingMealPlan(!editingMealPlan)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                    {editingMealPlan ? '저장' : '식사 편집'}
                </button>
              </div>
            )}
           </div>
          <TopSection
            activeChildId={activeChildId}
            childrenInfo={children}
            onActiveChildChange={setActiveChildId}
            isEditing={userProfile?.userType === UserType.PARENT ? editingSchedule : false}
            userType={userProfile?.userType || UserType.PARENT}
            useNewDateBasedSchedule={true}
            onExitEdit={() => setEditingSchedule(false)}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <MiddleSection
            currentWeekMealPlans={currentWeekMealPlans}
            onUpdateDateBasedMealPlan={updateDateBasedMealPlan}
            onEditModeChange={setEditingMealPlan}
            onExitEdit={() => setEditingMealPlan(false)}
            medications={medications}
            childrenInfo={children}
            userType={userProfile?.userType || UserType.PARENT}
            onOpenModal={openModal}
            onToggleMedicationAdministered={toggleMedicationAdministered}
            onDeleteMedication={deleteMedication}
            isEditingMealPlan={editingMealPlan}
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <BottomSection 
            userType={userProfile?.userType || UserType.PARENT}
            onOpenModal={openModal}
            specialScheduleItems={specialScheduleItems}
            onEditItem={handleEditSpecialItem}
            onDeleteItem={handleDeleteSpecialItem}
          />
        </div>

        {/* 돌봄 선생님 선택 섹션 */}
        {userProfile?.userType === UserType.PARENT && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary">담당 선생님</h2>
            </div>
            
            <ProviderSwitcher
              providers={[
                {
                  id: 'provider1',
                  name: '김선생님',
                  isActive: true,
                  permissions: [],
                  assignmentType: 'PRIMARY',
                  workStatus: 'WORKING',
                },
                {
                  id: 'provider2',
                  name: '이선생님',
                  isActive: true,
                  permissions: [],
                  assignmentType: 'SECONDARY',
                  workStatus: 'AVAILABLE',
                }
              ]}
              activeProviderId={'all'}
              onProviderChange={(id) => console.log('선택된 선생님:', id)}
            />
          </div>
        )}

        {/* 인수인계 시스템 섹션 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          {connection && <DailyHandoverNotes connectionId={connection.id} />}
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
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'edit_overtime' && editingSpecialItem && (
        <Modal isOpen={true} onClose={closeModal} title="연장 근무 수정">
          <AddSpecialScheduleItemForm 
            type="OVERTIME_REQUEST" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            itemToEdit={editingSpecialItem}
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'vacation' && (
        <Modal isOpen={true} onClose={closeModal} title="휴가 요청">
          <AddSpecialScheduleItemForm 
            type="VACATION" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'edit_vacation' && editingSpecialItem && (
        <Modal isOpen={true} onClose={closeModal} title="휴가 수정">
          <AddSpecialScheduleItemForm 
            type="VACATION" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            itemToEdit={editingSpecialItem}
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'notice' && (
        <Modal isOpen={true} onClose={closeModal} title="안내사항 작성">
          <AddSpecialScheduleItemForm 
            type="NOTICE" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}
      
      {activeModal === 'edit_notice' && editingSpecialItem && (
        <Modal isOpen={true} onClose={closeModal} title="안내사항 수정">
          <AddSpecialScheduleItemForm 
            type="NOTICE" 
            currentUserType={userProfile?.userType || UserType.PARENT}
            itemToEdit={editingSpecialItem}
            onSubmit={handleAddOrUpdateSpecialItem} 
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

      <ChildrenManager 
        isOpen={showChildrenManager}
        onClose={() => setShowChildrenManager(false)}
      />
      
      <SchedulePatternManager
        isOpen={showSchedulePatternManager}
        onClose={() => setShowSchedulePatternManager(false)}
      />
      
      {activeChildId && userProfile?.userType === UserType.PARENT && (
        <ScheduleTemplateManager
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          childId={activeChildId}
          childName={children.find(c => c.id === activeChildId)?.name || '아이'}
          allChildren={children.map(child => ({ id: child.id, name: child.name }))}
          templates={recurringTemplates[activeChildId] || []}
          onSaveTemplate={saveRecurringTemplate}
          onDeleteTemplate={(templateId) => deleteRecurringTemplate(templateId, activeChildId)}
          onApplyTemplate={(templateId) => applyRecurringTemplate(templateId, activeChildId)}
          onLoadTemplates={loadRecurringTemplates}
        />
      )}
    </div>
  );
};

export default Dashboard;