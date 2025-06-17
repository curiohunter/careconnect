import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { 
  DailyHandoverNote, 
  DayOfWeek 
} from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Modal } from './Modal';

interface HandoverSystemProps {
  connectionId: string;
}

export const HandoverSystem: React.FC<HandoverSystemProps> = ({ connectionId }) => {
  const { user } = useAuth();
  const { 
    handoverRecords, 
    createHandoverRecord, 
    updateHandoverRecord, 
    markHandoverAsRead 
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [handoverType, setHandoverType] = useState<'DAILY' | 'EMERGENCY' | 'SPECIAL'>('DAILY');
  const [editingRecord, setEditingRecord] = useState<HandoverRecord | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    tags: string[];
    targetUserId: string;
  }>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    tags: [],
    targetUserId: '',
  });

  // 인수인계 목록 필터링
  const safeHandoverRecords = Array.isArray(handoverRecords) ? handoverRecords : [];
  const filteredRecords = user?.uid 
    ? safeHandoverRecords.filter(record => 
        record.fromUserId === user.uid || 
        record.toUserId === user.uid
      )
    : [];

  // 보낸 인수인계
  const sentRecords = filteredRecords.filter(record => 
    record.fromUserId === user?.uid
  );

  // 받은 인수인계
  const receivedRecords = filteredRecords.filter(record => 
    record.toUserId === user?.uid
  );

  // 읽지 않은 인수인계 개수
  const unreadCount = receivedRecords.filter(record => 
    !record.readBy[user?.uid || '']
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) return;
    
    try {
      const timeSlot: TimeSlot = {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };
      
      const content: HandoverContent = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        tags: formData.tags,
      };
      
      if (editingRecord) {
        await updateHandoverRecord(editingRecord.id, {
          content,
          status: 'PENDING',
          updatedAt: new Date(),
        });
      } else {
        await createHandoverRecord({
          connectionId,
          fromUserId: user.uid,
          toUserId: formData.targetUserId,
          timeSlot,
          content,
          status: 'PENDING',
          readBy: { [user.uid]: new Date() }, // 발신자는 자동으로 읽음 처리
        });
      }
      
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('인수인계 처리 중 오류:', error);
    }
  };

  const handleMarkAsRead = async (recordId: string) => {
    try {
      await markHandoverAsRead(recordId);
    } catch (error) {
      console.error('읽음 표시 처리 중 오류:', error);
    }
  };

  const openEditModal = (record: HandoverRecord) => {
    setEditingRecord(record);
    setFormData({
      title: record.content.title,
      description: record.content.description,
      priority: record.content.priority || 'MEDIUM',
      tags: record.content.tags || [],
      targetUserId: record.toUserId,
    });
    setHandoverType(getHandoverType(record));
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      tags: [],
      targetUserId: '',
    });
    setEditingRecord(null);
    setHandoverType('DAILY');
  };

  // 인수인계 유형 파악
  const getHandoverType = (record: HandoverRecord): 'DAILY' | 'EMERGENCY' | 'SPECIAL' => {
    if (record.content.priority === 'HIGH') return 'EMERGENCY';
    if (record.content.tags?.includes('special')) return 'SPECIAL';
    return 'DAILY';
  };

  // 인수인계 유형별 스타일
  const typeStyles = {
    DAILY: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-500',
    },
    EMERGENCY: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-500',
    },
    SPECIAL: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      badge: 'bg-purple-100 text-purple-800',
      icon: 'text-purple-500',
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">인수인계 시스템</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            인수인계 작성
          </button>
          
          {unreadCount > 0 && (
            <div className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full">
              <span className="mr-1">읽지 않음</span>
              <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {unreadCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 탭 영역 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button 
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              true ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 ({filteredRecords.length})
          </button>
          <button 
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              false ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            받은 인수인계 ({receivedRecords.length})
          </button>
          <button 
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              false ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            보낸 인수인계 ({sentRecords.length})
          </button>
        </nav>
      </div>

      {/* 인수인계 목록 */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>인수인계 내역이 없습니다.</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const type = getHandoverType(record);
            const styles = typeStyles[type];
            const isUnread = record.toUserId === user?.uid && !record.readBy[user.uid];
            const isFromMe = record.fromUserId === user?.uid;

            return (
              <div 
                key={record.id} 
                className={`p-4 rounded-lg border ${styles.border} ${styles.bg} ${
                  isUnread ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
                        {type === 'DAILY' ? '일일 인수인계' : type === 'EMERGENCY' ? '긴급 인수인계' : '특별 인수인계'}
                      </span>
                      {isUnread && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          새 인수인계
                        </span>
                      )}
                      {isFromMe && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          내가 작성함
                        </span>
                      )}
                    </div>
                    <h3 className={`font-medium mt-2 ${styles.text}`}>{record.content.title}</h3>
                    <p className="text-gray-600 mt-1">{record.content.description}</p>
                    
                    {record.content.tags && record.content.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {record.content.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {isUnread && (
                      <button 
                        onClick={() => handleMarkAsRead(record.id)}
                        className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                        title="읽음으로 표시"
                      >
                        <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                      </button>
                    )}
                    
                    {isFromMe && (
                      <button 
                        onClick={() => openEditModal(record)}
                        className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                        title="수정"
                      >
                        <PencilIcon className="w-5 h-5 text-blue-500" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                  <div>
                    {isFromMe ? 
                      `${record.toUserId}에게 전송됨` : 
                      `${record.fromUserId}(으)로부터 수신됨`
                    }
                  </div>
                  <div>
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* 인수인계 작성/수정 모달 */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
        title={editingRecord ? "인수인계 수정" : "새 인수인계 작성"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              인수인계 유형
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setHandoverType('DAILY')}
                className={`flex-1 py-2 px-3 rounded-md ${
                  handoverType === 'DAILY' 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                일일 인수인계
              </button>
              <button
                type="button"
                onClick={() => setHandoverType('EMERGENCY')}
                className={`flex-1 py-2 px-3 rounded-md ${
                  handoverType === 'EMERGENCY' 
                    ? 'bg-red-100 text-red-800 border-2 border-red-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                긴급 인수인계
              </button>
              <button
                type="button"
                onClick={() => setHandoverType('SPECIAL')}
                className={`flex-1 py-2 px-3 rounded-md ${
                  handoverType === 'SPECIAL' 
                    ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                특별 인수인계
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({
                ...formData, 
                priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">낮음</option>
              <option value="MEDIUM">중간</option>
              <option value="HIGH">높음 (긴급)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({
                ...formData, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 식단, 투약, 알레르기"
            />
          </div>
          
          <div>
            <label htmlFor="targetUserId" className="block text-sm font-medium text-gray-700 mb-1">
              수신자 ID
            </label>
            <input
              type="text"
              id="targetUserId"
              value={formData.targetUserId}
              onChange={(e) => setFormData({...formData, targetUserId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={editingRecord !== null}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
            >
              {editingRecord ? '수정하기' : '전송하기'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HandoverSystem;