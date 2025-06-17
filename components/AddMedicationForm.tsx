import React, { useState, useEffect } from 'react';
import { Medication, MedicationType, MedicationStorage, ChildInfo } from '../types';
import { MEDICATION_TYPES_OPTIONS, MEDICATION_STORAGE_OPTIONS } from '../constants';

interface AddMedicationFormProps {
  onSubmit: (medication: Omit<Medication, 'id' | 'administered'>) => void;
  childrenInfo: ChildInfo[];
  medicationToEdit?: Medication | null; // For editing existing medication
  onClose: () => void; // To close modal after submission or cancellation
}

export const AddMedicationForm: React.FC<AddMedicationFormProps> = ({ onSubmit, childrenInfo, medicationToEdit, onClose }) => {
  const [symptoms, setSymptoms] = useState('');
  const [selectedMedTypes, setSelectedMedTypes] = useState<MedicationType[]>([]);
  const [dosage, setDosage] = useState('');
  const [timing, setTiming] = useState('');
  const [storage, setStorage] = useState<MedicationStorage>(MedicationStorage.ROOM_TEMP);
  const [notes, setNotes] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(
    medicationToEdit?.childId || (childrenInfo.length > 0 ? childrenInfo[0].id : undefined)
  );
  const [date, setDate] = useState<string>(
    medicationToEdit?.date || new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (medicationToEdit) {
      setSymptoms(medicationToEdit.symptoms);
      setSelectedMedTypes(medicationToEdit.medicationTypes);
      setDosage(medicationToEdit.dosage || '');
      setTiming(medicationToEdit.timing);
      setStorage(medicationToEdit.storage);
      setNotes(medicationToEdit.notes || '');
      setSelectedChildId(medicationToEdit.childId);
      setDate(medicationToEdit.date || new Date().toISOString().split('T')[0]);
    } else {
      // Reset form for adding new
      setSymptoms('');
      setSelectedMedTypes([]);
      setDosage('');
      setTiming('');
      setStorage(MedicationStorage.ROOM_TEMP);
      setNotes('');
      setSelectedChildId(childrenInfo.length > 0 ? childrenInfo[0].id : undefined);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [medicationToEdit, childrenInfo]);


  const handleMedTypeChange = (type: MedicationType) => {
    setSelectedMedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms || selectedMedTypes.length === 0 || !timing) {
        alert('증상, 약 종류, 투약 시간은 필수입니다.');
        return;
    }
    if (!date) {
        alert('투약 날짜를 선택하세요.');
        return;
    }
    onSubmit({
      symptoms,
      medicationTypes: selectedMedTypes,
      dosage: selectedMedTypes.includes(MedicationType.LIQUID) ? dosage : undefined, // Only save dosage if liquid
      timing,
      storage,
      notes,
      childId: selectedChildId,
      date,
    });
    // onClose(); // Modal will be closed by Dashboard based on onAddMedication/onUpdateMedication
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {childrenInfo.length > 1 && (
        <div>
            <label htmlFor="child" className="block text-sm font-medium text-gray-700">대상 아이</label>
            <select
                id="child"
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
                {childrenInfo.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                ))}
                 {childrenInfo.length === 0 && <option value="" disabled>등록된 아이 없음</option>}
            </select>
        </div>
      )}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">투약 날짜</label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">증상 (예: 콧물, 기침)</label>
        <input
          type="text"
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">약 종류 (다중 선택 가능)</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:space-x-4">
          {MEDICATION_TYPES_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMedTypes.includes(opt.value)}
                onChange={() => handleMedTypeChange(opt.value)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      {selectedMedTypes.includes(MedicationType.LIQUID) && (
        <div>
          <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">물약 용량 (예: 5ml)</label>
          <input
            type="text"
            id="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
      )}
      <div>
        <label htmlFor="timing" className="block text-sm font-medium text-gray-700">투약 시간 (예: 저녁 식사 후)</label>
        <input
          type="text"
          id="timing"
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="storage" className="block text-sm font-medium text-gray-700">보관 방법</label>
        <select
          id="storage"
          value={storage}
          onChange={(e) => setStorage(e.target.value as MedicationStorage)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          {MEDICATION_STORAGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
       <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">비고 (주의사항 등)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="물약이 여러 개인 경우 상세 정보, 기타 주의사항 등을 입력하세요."
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
         <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {medicationToEdit ? '수정하기' : '추가하기'}
        </button>
      </div>
    </form>
  );
};