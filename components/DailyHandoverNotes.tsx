import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { 
  DailyHandoverNote, 
  DayOfWeek 
} from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import toast from 'react-hot-toast';

interface DailyHandoverNotesProps {
  connectionId: string;
}

export const DailyHandoverNotes: React.FC<DailyHandoverNotesProps> = ({ connectionId }) => {
  const { user, userProfile } = useAuth();
  const { 
    dailyHandoverNotes, 
    createDailyHandoverNote, 
    updateDailyHandoverNote, 
    deleteDailyHandoverNote
  } = useData();

  // 안전한 기본값 설정
  const safeNotes = Array.isArray(dailyHandoverNotes) ? dailyHandoverNotes : [];

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | ''>('');
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<DailyHandoverNote[]>([]);

  // 오늘 날짜 정보
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const todayDayOfWeek = DAYS_OF_WEEK[today.getDay()]; // 일요일=0, 월요일=1, ...

  // 메모 필터링
  useEffect(() => {
    if (selectedDay === '') {
      // 당일 작성분만 표시
      const todayNotes = safeNotes.filter(note => 
        note.date === todayString
      );
      setFilteredNotes(todayNotes);
    } else {
      // 선택한 요일별 검색
      const dayNotes = safeNotes.filter(note => 
        note.dayOfWeek === selectedDay
      );
      setFilteredNotes(dayNotes);
    }
  }, [safeNotes, selectedDay, todayString]);

  // 새 메모 추가
  const handleAddNote = async () => {
    if (!newNote.trim() || !user?.uid || !userProfile?.name) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      await createDailyHandoverNote({
        dayOfWeek: todayDayOfWeek as DayOfWeek,
        authorId: user.uid,
        authorName: userProfile.name,
        content: newNote.trim(),
        date: todayString,
        connectionId
      });
      
      setNewNote('');
      toast.success('메모가 추가되었습니다.');
    } catch (error) {
      console.error('메모 추가 중 오류:', error);
      toast.error('메모 추가에 실패했습니다.');
    }
  };

  // 메모 수정
  const handleEditNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      await updateDailyHandoverNote(noteId, {
        content: editingContent.trim(),
        updatedAt: new Date()
      });
      
      setEditingNoteId(null);
      setEditingContent('');
      toast.success('메모가 수정되었습니다.');
    } catch (error) {
      console.error('메모 수정 중 오류:', error);
      toast.error('메모 수정에 실패했습니다.');
    }
  };

  // 메모 삭제
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteDailyHandoverNote(noteId);
      toast.success('메모가 삭제되었습니다.');
    } catch (error) {
      console.error('메모 삭제 중 오류:', error);
      toast.error('메모 삭제에 실패했습니다.');
    }
  };

  // 편집 시작
  const startEditing = (note: DailyHandoverNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  // 편집 취소
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">인수인계 메모</h2>
        
        {/* 요일별 검색 필터 */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value as DayOfWeek | '')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">오늘 작성분</option>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}요일별 검색
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 새 메모 작성 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-1">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="오늘의 인수인계 메모를 작성하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={2}
            />
          </div>
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            추가
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          💡 {selectedDay === '' ? `오늘(${todayDayOfWeek}요일)` : `${selectedDay}요일`} 메모가 표시됩니다.
        </div>
      </div>

      {/* 메모 목록 */}
      <div className="space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>
              {selectedDay === '' 
                ? '오늘 작성된 인수인계 메모가 없습니다.' 
                : `${selectedDay}요일에 작성된 메모가 없습니다.`
              }
            </p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const isMyNote = note.authorId === user?.uid;
            const isEditing = editingNoteId === note.id;
            
            return (
              <div 
                key={note.id} 
                className={`p-4 rounded-lg border ${
                  isMyNote ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isMyNote ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {note.dayOfWeek}요일
                      </span>
                      <span className="text-sm text-gray-600">
                        {note.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditNote(note.id)}
                            className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-xs hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                  
                  {/* 작성자만 수정/삭제 가능 */}
                  {isMyNote && !isEditing && (
                    <div className="flex space-x-1 ml-3">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                        title="수정"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-full hover:bg-red-200 transition-colors"
                        title="삭제"
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        💡 본인이 작성한 메모만 수정하고 삭제할 수 있습니다. 모든 인수인계 메모는 연결된 모든 사용자가 조회할 수 있습니다.
      </div>
    </div>
  );
};

export default DailyHandoverNotes;