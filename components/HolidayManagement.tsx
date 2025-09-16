import React, { useState, useEffect, FormEvent } from 'react';
import { Holiday } from '../types';

const HolidayManagement: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<Holiday | null>(null);
    
    // Form state
    const [holidayName, setHolidayName] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayStartTime, setHolidayStartTime] = useState('');
    const [holidayEndTime, setHolidayEndTime] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const storedHolidays = localStorage.getItem('holidays');
        if (storedHolidays) {
            setHolidays(JSON.parse(storedHolidays));
        }
    }, []);

    const updateLocalStorage = (data: Holiday[]) => {
        localStorage.setItem('holidays', JSON.stringify(data));
    };
    
    const sortedHolidays = [...holidays].sort((a, b) => {
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

    const openModal = (holiday: Holiday | null) => {
        setCurrentHoliday(holiday);
        setHolidayName(holiday ? holiday.name : '');
        setHolidayDate(holiday ? holiday.date : '');
        setHolidayStartTime(holiday ? holiday.startTime ?? '' : '');
        setHolidayEndTime(holiday ? holiday.endTime ?? '' : '');
        setFormError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentHoliday(null);
        setHolidayName('');
        setHolidayDate('');
        setHolidayStartTime('');
        setHolidayEndTime('');
        setFormError(null);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!holidayName.trim() || !holidayDate) return;

        if ((holidayStartTime && !holidayEndTime) || (!holidayStartTime && holidayEndTime)) {
            setFormError('시작 시간과 종료 시간을 모두 입력하거나 모두 비워두세요.');
            return;
        }
        if (holidayStartTime && holidayEndTime && holidayStartTime >= holidayEndTime) {
            setFormError('종료 시간은 시작 시간보다 이후여야 합니다.');
            return;
        }

        let updatedHolidays;
        const holidayData: Omit<Holiday, 'id'> = {
            name: holidayName,
            date: holidayDate,
            startTime: holidayStartTime || undefined,
            endTime: holidayEndTime || undefined,
        };

        if (currentHoliday) { // Update
            updatedHolidays = holidays.map(h =>
                h.id === currentHoliday.id ? { ...h, ...holidayData } : h
            );
        } else { // Create
            const newHoliday: Holiday = {
                id: new Date().toISOString(),
                ...holidayData
            };
            updatedHolidays = [...holidays, newHoliday];
        }
        setHolidays(updatedHolidays);
        updateLocalStorage(updatedHolidays);
        closeModal();
    };

    const deleteHoliday = (holidayId: string) => {
        if (window.confirm('정말로 이 휴일을 삭제하시겠습니까?')) {
            const updatedHolidays = holidays.filter(h => h.id !== holidayId);
            setHolidays(updatedHolidays);
            updateLocalStorage(updatedHolidays);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">교육원 지정 휴일 목록</h2>
                <button
                    onClick={() => openModal(null)}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    새 휴일 추가
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜 및 시간</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">휴일명</th>
                            <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedHolidays.length > 0 ? sortedHolidays.map(holiday => (
                            <tr key={holiday.id}>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    {holiday.date}
                                    {holiday.startTime && holiday.endTime && (
                                        <span className="ml-2 text-sm text-gray-600">({holiday.startTime} - {holiday.endTime})</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap font-medium text-gray-900">{holiday.name}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(holiday)} className="text-indigo-600 hover:text-indigo-900 mr-4">수정</button>
                                    <button onClick={() => deleteHoliday(holiday.id)} className="text-red-600 hover:text-red-900">삭제</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">등록된 휴일이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Holiday Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{currentHoliday ? '휴일 정보 수정' : '새 휴일 추가'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="holiday-name" className="block text-sm font-medium text-gray-700">휴일명</label>
                                <input
                                    id="holiday-name" type="text" value={holidayName} onChange={(e) => setHolidayName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required autoFocus
                                />
                            </div>
                            <div>
                                <label htmlFor="holiday-date" className="block text-sm font-medium text-gray-700">날짜</label>
                                <input
                                    id="holiday-date" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required
                                />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="holiday-start-time" className="block text-sm font-medium text-gray-700">시작 시간</label>
                                    <input
                                        id="holiday-start-time" type="time" value={holidayStartTime} onChange={(e) => setHolidayStartTime(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="holiday-end-time" className="block text-sm font-medium text-gray-700">종료 시간</label>
                                    <input
                                        id="holiday-end-time" type="time" value={holidayEndTime} onChange={(e) => setHolidayEndTime(e.target.value)} min={holidayStartTime}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">시간을 지정하지 않으면 종일 휴일로 처리됩니다.</p>

                            {formError && <p className="text-sm text-red-600">{formError}</p>}

                            <div className="mt-6 flex justify-end space-x-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">취소</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayManagement;