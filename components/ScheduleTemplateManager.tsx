import React, { useState, useEffect } from 'react';
import { RecurringActivity, DayOfWeek, InstitutionType } from '../types';
import { Modal } from './Modal';

interface ScheduleTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  allChildren: { id: string; name: string }[]; // 전체 아이 목록 추가
  templates: RecurringActivity[];
  onSaveTemplate: (template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (templateId: string) => void;
  onLoadTemplates: (childId: string) => void; // 템플릿 로드 함수 추가
}

interface TemplateFormData {
  name: string;
  activityType: 'childcare' | 'afterSchool';
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  institutionName?: string;
}

const INSTITUTION_TYPES: InstitutionType[] = ['어린이집', '유치원', '학교', '해당없음', '기타'];
const ALL_DAYS = Object.values(DayOfWeek);

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
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  onLoadTemplates
}) => {
  const [selectedChildId, setSelectedChildId] = useState(childId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    activityType: 'childcare',
    startTime: '09:00', // 기본값 09:00 (10분 단위)
    endTime: '16:00',   // 기본값 16:00 (10분 단위)
    daysOfWeek: [],
    institutionName: ''
  });

  // 선택된 아이가 변경될 때 템플릿 로드
  useEffect(() => {
    if (selectedChildId && onLoadTemplates && isOpen) {
      // 모달이 열린 상태에서만 로드
      onLoadTemplates(selectedChildId);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startTime || !formData.endTime || formData.daysOfWeek.length === 0) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 10분 단위 유효성 검사
    const isValidTime = (timeString: string) => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return minutes % 10 === 0;
    };

    if (!isValidTime(formData.startTime) || !isValidTime(formData.endTime)) {
      alert('시간을 10분 단위로 설정해주세요. (예: 09:30, 15:40)');
      return;
    }

    // 시작 시간이 종료 시간보다 빠른지 확인
    if (formData.startTime >= formData.endTime) {
      alert('시작 시간이 종료 시간보다 빨라야 합니다.');
      return;
    }

    onSaveTemplate({
      childId: selectedChildId, // 선택된 아이 ID 사용
      name: formData.name,
      activityType: formData.activityType,
      startTime: formData.startTime,
      endTime: formData.endTime,
      daysOfWeek: formData.daysOfWeek,
      institutionName: formData.activityType === 'childcare' ? formData.institutionName : undefined,
      isActive: true
    });

    setFormData({
      name: '',
      activityType: 'childcare',
      startTime: '09:00', // 10분 단위 기본값
      endTime: '16:00',   // 10분 단위 기본값
      daysOfWeek: [],
      institutionName: ''
    });
    setShowForm(false);
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
              onChange={(e) => setSelectedChildId(e.target.value)}
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
          {templates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">저장된 템플릿이 없습니다.</p>
              <p className="text-xs text-gray-400">인덱스 준비 중이면 몇 분 후 다시 시도해주세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-600">
                      {template.activityType === 'childcare' ? '기관' : '하원후'} | 
                      {template.startTime} ~ {template.endTime} ({template.daysOfWeek.join(', ')})
                      {template.institutionName && ` | ${template.institutionName}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApplyTemplate(template.id)}
                      className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-blue-700"
                    >
                      적용
                    </button>
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

              {formData.activityType === 'childcare' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기관명</label>
                  <input
                    type="text"
                    value={formData.institutionName}
                    onChange={(e) => setFormData(prev => ({ ...prev, institutionName: e.target.value }))}
                    placeholder="예: 고덕베네루체어린이집"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    step="600"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">10분 단위로 설정해주세요</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    step="600"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">10분 단위로 설정해주세요</p>
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
                  템플릿 저장
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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