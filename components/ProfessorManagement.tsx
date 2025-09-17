import React, { useState, useEffect, FormEvent } from 'react';
import { Professor, Vacation } from '../types';

const ProfessorManagement: React.FC = () => {
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [isProfessorModalOpen, setIsProfessorModalOpen] = useState(false);
    const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
    const [currentProfessor, setCurrentProfessor] = useState<Professor | null>(null);
    const [professorName, setProfessorName] = useState('');
    const [professorEmail, setProfessorEmail] = useState('');
    const [vacationStartDate, setVacationStartDate] = useState('');
    const [vacationEndDate, setVacationEndDate] = useState('');

    useEffect(() => {
        const storedProfessors = localStorage.getItem('professors');
        if (storedProfessors) {
            setProfessors(JSON.parse(storedProfessors));
        }
    }, []);

    const updateLocalStorage = (data: Professor[]) => {
        localStorage.setItem('professors', JSON.stringify(data));
    };

    // Professor Modal Handlers
    const openProfessorModal = (prof: Professor | null) => {
        setCurrentProfessor(prof);
        setProfessorName(prof ? prof.name : '');
        setProfessorEmail(prof ? prof.email : '');
        setIsProfessorModalOpen(true);
    };

    const closeProfessorModal = () => {
        setIsProfessorModalOpen(false);
        setCurrentProfessor(null);
        setProfessorName('');
        setProfessorEmail('');
    };
    
    // Professor CRUD
    const handleProfessorSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!professorName.trim() || !professorEmail.trim()) return;

        let updatedProfessors;
        if (currentProfessor) { // Update
            updatedProfessors = professors.map(p =>
                p.id === currentProfessor.id ? { ...p, name: professorName, email: professorEmail } : p
            );
        } else { // Create
            const newProfessor: Professor = {
                id: new Date().toISOString(),
                name: professorName,
                email: professorEmail,
                vacations: [],
            };
            updatedProfessors = [...professors, newProfessor];
        }
        setProfessors(updatedProfessors);
        updateLocalStorage(updatedProfessors);
        closeProfessorModal();
    };

    const deleteProfessor = (profId: string) => {
        if (window.confirm('정말로 이 교수를 삭제하시겠습니까?')) {
            const updatedProfessors = professors.filter(p => p.id !== profId);
            setProfessors(updatedProfessors);
            updateLocalStorage(updatedProfessors);
        }
    };
    
    // Vacation Modal Handlers
    const openVacationModal = (prof: Professor) => {
        setCurrentProfessor(prof);
        setIsVacationModalOpen(true);
    };

    const closeVacationModal = () => {
        setIsVacationModalOpen(false);
        setCurrentProfessor(null);
        setVacationStartDate('');
        setVacationEndDate('');
    };

    // Vacation CRUD
    const handleVacationSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!currentProfessor || !vacationStartDate || !vacationEndDate) return;

        const newVacation: Vacation = {
            id: new Date().toISOString(),
            startDate: vacationStartDate,
            endDate: vacationEndDate,
        };
        
        const updatedProfessors = professors.map(p => 
            p.id === currentProfessor.id 
                ? { ...p, vacations: [...p.vacations, newVacation].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) } 
                : p
        );

        setProfessors(updatedProfessors);
        updateLocalStorage(updatedProfessors);
        setVacationStartDate('');
        setVacationEndDate('');
        // Keep the modal open to add more vacations, but update the professor in state
        const updatedCurrentProfessor = updatedProfessors.find(p => p.id === currentProfessor.id);
        if(updatedCurrentProfessor) setCurrentProfessor(updatedCurrentProfessor);
    };

    const deleteVacation = (profId: string, vacId: string) => {
        const updatedProfessors = professors.map(p => {
            if (p.id === profId) {
                return { ...p, vacations: p.vacations.filter(v => v.id !== vacId) };
            }
            return p;
        });
        setProfessors(updatedProfessors);
        updateLocalStorage(updatedProfessors);
        // Update current professor if it's the one being edited
        if (currentProfessor && currentProfessor.id === profId) {
            const updatedCurrentProfessor = updatedProfessors.find(p => p.id === profId);
            if(updatedCurrentProfessor) setCurrentProfessor(updatedCurrentProfessor);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">교수 목록</h2>
                <button
                    onClick={() => openProfessorModal(null)}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    새 교수 추가
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">휴가</th>
                            <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {professors.length > 0 ? professors.map(prof => (
                            <tr key={prof.id}>
                                <td className="py-4 px-6 whitespace-nowrap">{prof.name}</td>
                                <td className="py-4 px-6 whitespace-nowrap">{prof.email}</td>
                                <td className="py-4 px-6 whitespace-nowrap">{prof.vacations.length} 건</td>
                                <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openVacationModal(prof)} className="text-green-600 hover:text-green-900 mr-4">휴가 관리</button>
                                    <button onClick={() => openProfessorModal(prof)} className="text-indigo-600 hover:text-indigo-900 mr-4">수정</button>
                                    <button onClick={() => deleteProfessor(prof.id)} className="text-red-600 hover:text-red-900">삭제</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="py-4 px-6 text-center text-gray-500">등록된 교수가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Professor Create/Edit Modal */}
            {isProfessorModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{currentProfessor ? '교수 정보 수정' : '새 교수 추가'}</h3>
                        <form onSubmit={handleProfessorSubmit}>
                            <div>
                                <label htmlFor="prof-name" className="block text-sm font-medium text-gray-700">이름</label>
                                <input
                                    id="prof-name"
                                    type="text"
                                    value={professorName}
                                    onChange={(e) => setProfessorName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="mt-4">
                                <label htmlFor="prof-email" className="block text-sm font-medium text-gray-700">이메일</label>
                                <input
                                    id="prof-email"
                                    type="email"
                                    value={professorEmail}
                                    onChange={(e) => setProfessorEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                />
                            </div>
                            <div className="mt-6 flex justify-end space-x-4">
                                <button type="button" onClick={closeProfessorModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">취소</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Vacation Management Modal */}
            {isVacationModalOpen && currentProfessor && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                         <div className="flex justify-between items-start">
                             <h3 className="text-lg font-bold mb-4">{currentProfessor.name} 교수 휴가 관리</h3>
                              <button onClick={closeVacationModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                         </div>
                        <form onSubmit={handleVacationSubmit} className="mb-4 p-4 border rounded-md bg-gray-50">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">시작일</label>
                                    <input type="date" id="start-date" value={vacationStartDate} onChange={e => setVacationStartDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                                </div>
                                <div>
                                     <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">종료일</label>
                                    <input type="date" id="end-date" value={vacationEndDate} onChange={e => setVacationEndDate(e.target.value)} min={vacationStartDate} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 h-10">휴가 추가</button>
                             </div>
                        </form>
                        
                        <h4 className="font-semibold mb-2 text-gray-700">등록된 휴가 목록</h4>
                        <div className="max-h-60 overflow-y-auto border rounded-md">
                            {currentProfessor.vacations.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {currentProfessor.vacations.map(vac => (
                                        <li key={vac.id} className="flex justify-between items-center p-3">
                                            <span className="text-gray-800">{vac.startDate} ~ {vac.endDate}</span>
                                            <button onClick={() => deleteVacation(currentProfessor.id, vac.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">삭제</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-center py-8">등록된 휴가가 없습니다.</p>
                            )}
                        </div>
                         <div className="mt-6 flex justify-end">
                             <button type="button" onClick={closeVacationModal} className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400">닫기</button>
                         </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default ProfessorManagement;