import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { UserType } from '../types';
import { TopSection } from './TopSection';
import { MiddleSection, ActiveModal } from './MiddleSection';
import { BottomSection } from './BottomSection';
import { Modal } from './Modal';
import { AddMedicationForm } from './AddMedicationForm';
import { AddSpecialScheduleItemForm } from './AddSpecialScheduleItemForm';
import InviteCodeManager from './InviteCodeManager';
import ChildrenManager from './ChildrenManager';
import AccountManager from './AccountManager';
import { ScheduleTemplateManager } from './ScheduleTemplateManager';
import { DailyHandoverNotes } from './DailyHandoverNotes';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import ConnectionSelector from './ConnectionSelector';

export const Dashboard: React.FC = () => {
  const { user, userProfile, connection, connections, signOut } = useAuth();
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
    updateRecurringTemplate,
    deleteRecurringTemplate,
    applyRecurringTemplate
  } = useData();

  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [showInviteCodeManager, setShowInviteCodeManager] = useState(false);
  const [showChildrenManager, setShowChildrenManager] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState(false);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [editingMedication, setEditingMedication] = useState<any>(null);
  const [editingSpecialItem, setEditingSpecialItem] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 활성 아이 설정
  useEffect(() => {
    if (children.length > 0 && !activeChildId) {
      setActiveChildId(children[0].id);
    } else if (children.length === 0) {
      setActiveChildId(null);
    }
  }, [children, activeChildId]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
        <header className="bg-primary text-white shadow-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold">CareConnect</h1>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* 다중 연결 선택 - 모든 사용자 */}
                <ConnectionSelector />
                
                {/* 사용자 정보 - 데스크톱에서만 표시 */}
                <div className="hidden sm:flex items-center space-x-2">
                  <span className="text-sm">{userProfile?.name}</span>
                  <span className="text-xs opacity-75">
                    ({userProfile?.userType === UserType.PARENT ? '부모' : '돌봄선생님'})
                  </span>
                </div>
                
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="p-1.5 sm:p-2 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <button
                        onClick={() => {
                          setShowAccountManager(true);
                          setIsDropdownOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        계정 관리
                      </button>
                      <button
                        onClick={() => {
                          setShowInviteCodeManager(true);
                          setIsDropdownOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        초대 코드 관리
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-blue-700 transition-colors"
                  aria-label="로그아웃"
                >
                  <LogoutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
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
      <header className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          {/* 모바일 최적화된 헤더 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold">CareConnect</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 다중 연결 선택 - 돌봄선생님만 */}
              {userProfile?.userType === UserType.CARE_PROVIDER && (
                <ConnectionSelector />
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-blue-700 transition-colors"
                >
                  <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        setShowAccountManager(true);
                        setIsDropdownOpen(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      계정 관리
                    </button>
                    <button
                      onClick={() => {
                        setShowInviteCodeManager(true);
                        setIsDropdownOpen(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      초대 코드 관리
                    </button>
                    {userProfile?.userType === UserType.PARENT && (
                      <button
                        onClick={() => {
                          setShowChildrenManager(true);
                          setIsDropdownOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        아이 정보 관리
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={signOut}
                className="p-1.5 sm:p-2 rounded-full hover:bg-blue-700 transition-colors"
                aria-label="로그아웃"
              >
                <LogoutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 space-y-6 overflow-y-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg">
           <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">{mainChildName} 주간 일정표</h2>
            {userProfile?.userType === UserType.PARENT && (
              <div className="flex gap-3">
                {editingSchedule && (
                  <button
                    onClick={() => setEditingSchedule(false)}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    뒤로
                  </button>
                )}
                {editingSchedule && (
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
                )}
                <button 
                    onClick={() => setEditingSchedule(!editingSchedule)}
                    className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-amber-600 rounded-md transition-colors"
                >
                    {editingSchedule ? '저장' : '일정 편집'}
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


        {/* 인수인계 시스템 섹션 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          {connection && <DailyHandoverNotes connectionId={connection.id} />}
        </div>
      </main>

      <footer className="bg-darkgray text-white text-center p-4">
        <p>&copy; {new Date().getFullYear()} CareConnect by Ian Park</p>
        <p className="text-sm mt-1">
          피드백이나 문의사항이 있으신가요?
          <a href="mailto:ian_park@valueinmath.com?subject=CareConnect 피드백" 
             className="underline hover:text-primary ml-1">
            이메일 보내기
          </a>
        </p>
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
            connections={connections}
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
            connections={connections}
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
            connections={connections}
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
            connections={connections}
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
            connections={connections}
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
            connections={connections}
            itemToEdit={editingSpecialItem}
            onSubmit={handleAddOrUpdateSpecialItem} 
            onClose={closeModal}
          />
        </Modal>
      )}

      
      <InviteCodeManager 
        isOpen={showInviteCodeManager}
        onClose={() => setShowInviteCodeManager(false)}
      />

      <ChildrenManager 
        isOpen={showChildrenManager}
        onClose={() => setShowChildrenManager(false)}
      />

      <AccountManager 
        isOpen={showAccountManager}
        onClose={() => setShowAccountManager(false)}
      />
      
      
      {activeChildId && userProfile?.userType === UserType.PARENT && (
        <ScheduleTemplateManager
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          childId={activeChildId}
          childName={children.find(c => c.id === activeChildId)?.name || '아이'}
          allChildren={children.map(child => ({ id: child.id, name: child.name }))}
          allTemplates={recurringTemplates}
          onSaveTemplate={saveRecurringTemplate}
          onUpdateTemplate={(templateId, template) => updateRecurringTemplate(templateId, template)}
          onDeleteTemplate={(templateId) => deleteRecurringTemplate(templateId, activeChildId)}
          onApplyTemplate={(templateId, isWeeklyRecurring) => applyRecurringTemplate(templateId, activeChildId, isWeeklyRecurring)}
          onLoadTemplates={loadRecurringTemplates}
          onChildChange={setActiveChildId}
        />
      )}
    </div>
  );
};

export default Dashboard;