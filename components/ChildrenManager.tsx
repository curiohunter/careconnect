import React, { useState, useEffect } from 'react';
import { ChildInfo, Gender, InstitutionType, UserType } from '../types';
import { USER_TYPES, GENDER_OPTIONS, INSTITUTION_TYPE_OPTIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import toast from 'react-hot-toast';

interface ChildrenManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChildrenManager: React.FC<ChildrenManagerProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateProfile, connection } = useAuth();
  const [children, setChildren] = useState<Partial<ChildInfo>[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const inputBaseClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-gray-900 placeholder-gray-500";
  const selectBaseClasses = `${inputBaseClasses} bg-white`;

  // 초기 데이터 로드
  useEffect(() => {
    if (isOpen && userProfile) {
      // connection에서 아이 정보를 가져오거나, userProfile에서 가져옴
      const childrenData = connection?.children || userProfile.children || [];
      setChildren(childrenData.length > 0 ? childrenData : [createEmptyChild()]);
    }
  }, [isOpen, userProfile, connection]);

  const createEmptyChild = (): Partial<ChildInfo> => ({
    id: Date.now().toString(),
    name: '',
    specialNeeds: '',
    age: undefined,
    gender: undefined,
    institutionType: '해당없음',
    institutionName: ''
  });

  const handleAddChild = () => {
    setChildren([...children, createEmptyChild()]);
  };

  const handleChildChange = (index: number, field: keyof ChildInfo, value: string | number | Gender | InstitutionType) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

  const handleRemoveChild = (index: number) => {
    if (children.length > 1) {
      const safeChildren = Array.isArray(children) ? children : [];
      setChildren(safeChildren.filter((_, i) => i !== index));
    } else {
      // 마지막 아이를 삭제하면 빈 아이 하나 추가
      setChildren([createEmptyChild()]);
    }
    setEditingIndex(null);
  };

  const handleSave = async () => {
    // 유효한 아이 정보만 필터링
    const validChildren = children
      .filter(child => child.name && child.name.trim())
      .map(child => ({
        id: child.id || Date.now().toString(),
        name: child.name!.trim(),
        age: child.age,
        gender: child.gender,
        specialNeeds: child.specialNeeds?.trim() || '',
        institutionType: child.institutionType || '해당없음',
        institutionName: child.institutionType !== '해당없음' ? child.institutionName?.trim() : undefined
      })) as ChildInfo[];

    if (validChildren.length === 0) {
      toast.error('최소 한 명의 아이 정보를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      // UserProfile 업데이트
      await updateProfile({ children: validChildren });
      
      // Connection이 있는 경우
      if (connection?.id) {
        // 1. Connection 문서 업데이트
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        await updateDoc(doc(db, 'connections', connection.id), {
          children: validChildren,
          updatedAt: new Date()
        });
        
        // 2. DataService의 children 컬렉션에도 저장
        const { default: DataService } = await import('../services/dataService');
        await DataService.saveChildren(connection.id, validChildren);
      }
      
      toast.success('아이 정보가 저장되었습니다.');
      onClose();
    } catch (error) {
      console.error('아이 정보 저장 오류:', error);
      toast.error('아이 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">아이 정보 관리</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {children.map((child, index) => (
              <div key={child.id || index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">
                    아이 {index + 1}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {children.length > 1 && (
                      <button
                        onClick={() => handleRemoveChild(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {editingIndex === index ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">이름</label>
                      <input
                        type="text"
                        value={child.name || ''}
                        onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                        className={inputBaseClasses}
                        placeholder="아이 이름"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">나이</label>
                        <input
                          type="number"
                          value={child.age || ''}
                          onChange={(e) => handleChildChange(index, 'age', parseInt(e.target.value) || undefined)}
                          className={inputBaseClasses}
                          placeholder="나이"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">성별</label>
                        <select
                          value={child.gender || ''}
                          onChange={(e) => handleChildChange(index, 'gender', e.target.value as Gender)}
                          className={selectBaseClasses}
                        >
                          <option value="">성별 선택</option>
                          {GENDER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">기관 유형</label>
                      <select
                        value={child.institutionType || '해당없음'}
                        onChange={(e) => handleChildChange(index, 'institutionType', e.target.value as InstitutionType)}
                        className={selectBaseClasses}
                      >
                        {INSTITUTION_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {child.institutionType && child.institutionType !== '해당없음' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">기관명</label>
                        <input
                          type="text"
                          value={child.institutionName || ''}
                          onChange={(e) => handleChildChange(index, 'institutionName', e.target.value)}
                          className={inputBaseClasses}
                          placeholder="기관명 입력 (예: 사랑 어린이집)"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">특이사항</label>
                      <textarea
                        value={child.specialNeeds || ''}
                        onChange={(e) => handleChildChange(index, 'specialNeeds', e.target.value)}
                        rows={3}
                        className={inputBaseClasses}
                        placeholder="알러지, 특별히 주의할 점 등"
                      />
                    </div>

                    <button
                      onClick={() => setEditingIndex(null)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      편집 완료
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p><strong>이름:</strong> {child.name || '이름 없음'}</p>
                    {child.age && <p><strong>나이:</strong> {child.age}세</p>}
                    {child.gender && <p><strong>성별:</strong> {child.gender}</p>}
                    {child.institutionType && child.institutionType !== '해당없음' && (
                      <p><strong>기관:</strong> {child.institutionType} - {child.institutionName || '기관명 없음'}</p>
                    )}
                    {child.specialNeeds && <p><strong>특이사항:</strong> {child.specialNeeds}</p>}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleAddChild}
              className="w-full flex items-center justify-center px-4 py-3 border border-dashed border-gray-300 text-sm font-medium rounded-md text-primary hover:bg-indigo-50"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              아이 추가
            </button>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildrenManager;
