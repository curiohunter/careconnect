import React, { useState, useEffect } from 'react';
import { RecurringActivity, DayOfWeek } from '../types';
import { Modal } from './Modal';
import { generateHourOptions, generateMinuteOptions } from '../constants';

interface ScheduleTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  allChildren: { id: string; name: string }[]; // 전체 아이 목록 추가
  allTemplates: {[childId: string]: RecurringActivity[]}; // 모든 아이의 템플릿
  onSaveTemplate: (template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTemplate?: (templateId: string, template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (templateId: string, isWeeklyRecurring?: boolean) => void;
  onLoadTemplates: (childId: string) => void; // 템플릿 로드 함수 추가
  onChildChange?: (childId: string) => void; // 아이 변경 콜백 추가
}

interface TemplateFormData {
  name: string;
  activityType: 'childcare' | 'afterSchool';
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  daysOfWeek: DayOfWeek[];
  institutionName?: string;
}

const ALL_DAYS = Object.values(DayOfWeek);
const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions(5); // 5분 간격

// 일반적인 요일 패턴
const COMMON_PATTERNS = {
  '평일': [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY],
  '월수금': [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
  '화목': [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY],
  '주말': [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY]
};

export const ScheduleTemplateManager: React.FC<ScheduleTemplateManagerProps> = ({
  isOpen,
  onClose,
  childId,
  childName,
  allChildren,
  allTemplates,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  onLoadTemplates,
  onChildChange
}) => {
  const [selectedChildId, setSelectedChildId] = useState(childId);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [weeklyRecurringStates, setWeeklyRecurringStates] = useState<{[templateId: string]: boolean}>({});
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    activityType: 'childcare',
    startHour: '09',
    startMinute: '00',
    endHour: '16',
    endMinute: '00',
    daysOfWeek: [],
    institutionName: ''
  });

  // 선택된 아이가 변경될 때 템플릿 로드
  useEffect(() => {
    if (selectedChildId && onLoadTemplates && isOpen) {
      // 모달이 열린 상태에서만 로드
      const loadTemplates = async () => {
        try {
          await onLoadTemplates(selectedChildId);
        } catch (error) {
          console.error('템플릿 로드 오류:', error);
        }
      };
      loadTemplates();
    }
  }, [selectedChildId, onLoadTemplates, isOpen]);

  // 모달이 열릴 때 초기 아이로 설정
  useEffect(() => {
    if (isOpen) {
      setSelectedChildId(childId);
    }
  }, [isOpen, childId]);

  const selectedChild = allChildren.find(child => child.id === selectedChildId);
  const selectedChildName = selectedChild ? selectedChild.name : childName;
  const currentTemplates = allTemplates[selectedChildId] || [];

  // currentTemplates가 변경될 때마다 weeklyRecurringStates 초기화
  useEffect(() => {
    if (currentTemplates.length > 0) {
      const initialStates: {[templateId: string]: boolean} = {};
      currentTemplates.forEach(template => {
        initialStates[template.id] = template.isWeeklyRecurring || false;
      });
      setWeeklyRecurringStates(initialStates);
    }
  }, [currentTemplates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startHour || !formData.startMinute || !formData.endHour || !formData.endMinute || formData.daysOfWeek.length === 0) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 시간 문자열 생성
    const startTime = `${formData.startHour}:${formData.startMinute}`;
    const endTime = `${formData.endHour}:${formData.endMinute}`;

    // 시작 시간이 종료 시간보다 빠른지 확인
    if (startTime >= endTime) {
      alert('시작 시간이 종료 시간보다 빨라야 합니다.');
      return;
    }

    const templateData = {
      childId: selectedChildId, // 선택된 아이 ID 사용
      name: formData.name,
      activityType: formData.activityType,
      startTime: startTime,
      endTime: endTime,
      daysOfWeek: formData.daysOfWeek,
      institutionName: formData.activityType === 'childcare' ? formData.institutionName : undefined,
      isActive: true
    };

    if (editingTemplateId && onUpdateTemplate) {
      onUpdateTemplate(editingTemplateId, templateData);
    } else {
      onSaveTemplate(templateData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      activityType: 'childcare',
      startHour: '09',
      startMinute: '00',
      endHour: '16',
      endMinute: '00',
      daysOfWeek: [],
      institutionName: ''
    });
    setEditingTemplateId(null);
    setShowForm(false);
  };

  const handleEditTemplate = (template: RecurringActivity) => {
    const [startHour, startMinute] = template.startTime.split(':');
    const [endHour, endMinute] = template.endTime.split(':');
    
    setFormData({
      name: template.name,
      activityType: template.activityType,
      startHour: startHour,
      startMinute: startMinute,
      endHour: endHour,
      endMinute: endMinute,
      daysOfWeek: template.daysOfWeek,
      institutionName: template.institutionName || ''
    });
    setEditingTemplateId(template.id);
    setShowForm(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const applyPattern = (pattern: DayOfWeek[]) => {
    setFormData(prev => ({ ...prev, daysOfWeek: pattern }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="반복 일정 관리">
      <div className="space-y-6">
        {/* 아이 선택 */}
        {allChildren.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">아이 선택</label>
            <select
              value={selectedChildId}
              onChange={(e) => {
                const newChildId = e.target.value;
                setSelectedChildId(newChildId);
                if (onChildChange) {
                  onChildChange(newChildId);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              {allChildren.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* 기존 템플릿 목록 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">{selectedChildName} 저장된 템플릿</h3>
          {currentTemplates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">저장된 템플릿이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTemplates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-600">
                      {template.activityType === 'childcare' ? '기관' : '하원후'} | 
                      {template.startTime} ~ {template.endTime} ({template.daysOfWeek.join(', ')})
                      {template.institutionName && ` | ${template.institutionName}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`weekly-${template.id}`}
                        checked={weeklyRecurringStates[template.id] ?? (template.isWeeklyRecurring || false)}
                        onChange={(e) => setWeeklyRecurringStates(prev => ({
                          ...prev,
                          [template.id]: e.target.checked
                        }))}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor={`weekly-${template.id}`} className="text-xs text-gray-600">
                        매주 자동 적용
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const isWeeklyRecurring = weeklyRecurringStates[template.id] ?? (template.isWeeklyRecurring || false);
                          console.log('매주 자동 적용:', isWeeklyRecurring);
                          onApplyTemplate(template.id, isWeeklyRecurring);
                        }}
                        className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-blue-700"
                      >
                        적용
                      </button>
                      {onUpdateTemplate && (
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                        >
                          수정
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
                            onDeleteTemplate(template.id);
                          }
                        }}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 새 템플릿 추가 */}
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors"
            >
              + 새 템플릿 추가
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 어린이집 일정"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">활동 유형</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="childcare"
                      checked={formData.activityType === 'childcare'}
                      onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value as 'childcare' | 'afterSchool' }))}
                      className="mr-2"
                    />
                    기관 활동
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="afterSchool"
                      checked={formData.activityType === 'afterSchool'}
                      onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value as 'childcare' | 'afterSchool' }))}
                      className="mr-2"
                    />
                    하원 후 활동
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.activityType === 'childcare' ? '기관명' : '장소/기관명'}
                </label>
                <input
                  type="text"
                  value={formData.institutionName}
                  onChange={(e) => setFormData(prev => ({ ...prev, institutionName: e.target.value }))}
                  placeholder={formData.activityType === 'childcare' ? 
                    "예: 어린이집, 유치원, 학교 이름" : 
                    "예: 수영장, 태권도장, 학원 이름"
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={formData.startHour} 
                      onChange={e => setFormData(prev => ({ ...prev, startHour: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      required
                    >
                      <option value="">시</option>
                      {HOUR_OPTIONS.map(h => <option key={`start-hour-${h}`} value={h}>{h}시</option>)}
                    </select>
                    <select 
                      value={formData.startMinute} 
                      onChange={e => setFormData(prev => ({ ...prev, startMinute: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      required
                    >
                      <option value="">분</option>
                      {MINUTE_OPTIONS.map(m => <option key={`start-minute-${m}`} value={m}>{m}분</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={formData.endHour} 
                      onChange={e => setFormData(prev => ({ ...prev, endHour: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      required
                    >
                      <option value="">시</option>
                      {HOUR_OPTIONS.map(h => <option key={`end-hour-${h}`} value={h}>{h}시</option>)}
                    </select>
                    <select 
                      value={formData.endMinute} 
                      onChange={e => setFormData(prev => ({ ...prev, endMinute: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      required
                    >
                      <option value="">분</option>
                      {MINUTE_OPTIONS.map(m => <option key={`end-minute-${m}`} value={m}>{m}분</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">반복 요일</label>
                
                {/* 빠른 패턴 선택 */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">빠른 선택:</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(COMMON_PATTERNS).map(([name, pattern]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => applyPattern(pattern)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 개별 요일 선택 */}
                <div className="grid grid-cols-7 gap-2">
                  {ALL_DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-2 py-2 text-sm rounded ${
                        formData.daysOfWeek.includes(day)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
                >
                  {editingTemplateId ? '템플릿 수정' : '템플릿 저장'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};