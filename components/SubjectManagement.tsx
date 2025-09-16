import React, { useState, useEffect, FormEvent } from 'react';
import { Subject, Professor } from '../types';

const SubjectManagement: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

    // Form state
    const [subjectName, setSubjectName] = useState('');
    const [subjectDescription, setSubjectDescription] = useState('');
    const [totalHours, setTotalHours] = useState<number | ''>('');
    const [assignedProfessorId, setAssignedProfessorId] = useState<string | null>(null);
    const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>([]);

    useEffect(() => {
        const storedSubjects = localStorage.getItem('subjects');
        if (storedSubjects) {
            setSubjects(JSON.parse(storedSubjects));
        }
        const storedProfessors = localStorage.getItem('professors');
        if (storedProfessors) {
            setProfessors(JSON.parse(storedProfessors));
        }
    }, []);

    const updateLocalStorage = (data: Subject[]) => {
        localStorage.setItem('subjects', JSON.stringify(data));
    };

    const openModal = (subject: Subject | null) => {
        setCurrentSubject(subject);
        setSubjectName(subject ? subject.name : '');
        setSubjectDescription(subject ? subject.description ?? '' : '');
        setTotalHours(subject ? subject.totalHours : '');
        setAssignedProfessorId(subject ? subject.professorId : null);
        setSelectedPrerequisites(subject ? subject.prerequisiteIds ?? [] : []);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSubject(null);
        setSubjectName('');
        setSubjectDescription('');
        setTotalHours('');
        setAssignedProfessorId(null);
        setSelectedPrerequisites([]);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!subjectName.trim() || totalHours === '' || totalHours <= 0) return;

        let updatedSubjects;
        if (currentSubject) { // Update
            updatedSubjects = subjects.map(s =>
                s.id === currentSubject.id ? { ...s, name: subjectName, description: subjectDescription, totalHours, professorId: assignedProfessorId, prerequisiteIds: selectedPrerequisites } : s
            );
        } else { // Create
            const newSubject: Subject = {
                id: new Date().toISOString(),
                name: subjectName,
                description: subjectDescription,
                totalHours: totalHours,
                professorId: assignedProfessorId,
                prerequisiteIds: selectedPrerequisites,
            };
            updatedSubjects = [...subjects, newSubject];
        }
        setSubjects(updatedSubjects);
        updateLocalStorage(updatedSubjects);
        closeModal();
    };

    const deleteSubject = (subjectId: string) => {
        if (window.confirm('정말로 이 과목을 삭제하시겠습니까?')) {
            const updatedSubjects = subjects.filter(s => s.id !== subjectId);
            setSubjects(updatedSubjects);
            updateLocalStorage(updatedSubjects);
        }
    };

    const getProfessorName = (profId: string | null) => {
        if (!profId) return '배정되지 않음';
        const professor = professors.find(p => p.id === profId);
        return professor ? professor.name : '알 수 없는 교수';
    };

    const getPrerequisiteNames = (prereqIds?: string[]): string => {
        if (!prereqIds || prereqIds.length === 0) return '없음';
        return prereqIds
            .map(id => subjects.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">과목 목록</h2>
                <button
                    onClick={() => openModal(null)}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    새 과목 추가
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">과목명</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 시간</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담당 교수</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">선수과목</th>
                            <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {subjects.length > 0 ? subjects.map(subject => (
                            <tr key={subject.id}>
                                <td className="py-4 px-6 whitespace-nowrap font-medium text-gray-900">{subject.name}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 truncate max-w-xs">{subject.description}</td>
                                <td className="py-4 px-6 whitespace-nowrap">{subject.totalHours} 시간</td>
                                <td className="py-4 px-6 whitespace-nowrap">{getProfessorName(subject.professorId)}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">{getPrerequisiteNames(subject.prerequisiteIds)}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(subject)} className="text-indigo-600 hover:text-indigo-900 mr-4">수정</button>
                                    <button onClick={() => deleteSubject(subject.id)} className="text-red-600 hover:text-red-900">삭제</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="py-4 px-6 text-center text-gray-500">등록된 과목이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Subject Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4">{currentSubject ? '과목 정보 수정' : '새 과목 추가'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="subject-name" className="block text-sm font-medium text-gray-700">과목명</label>
                                <input
                                    id="subject-name" type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required autoFocus
                                />
                            </div>
                             <div>
                                <label htmlFor="subject-description" className="block text-sm font-medium text-gray-700">과목 설명</label>
                                <textarea
                                    id="subject-description" value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="total-hours" className="block text-sm font-medium text-gray-700">총 시간</label>
                                <input
                                    id="total-hours" type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required min="1"
                                />
                            </div>
                            <div>
                                <label htmlFor="professor" className="block text-sm font-medium text-gray-700">담당 교수</label>
                                <select
                                    id="professor" value={assignedProfessorId ?? ''} onChange={(e) => setAssignedProfessorId(e.target.value || null)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">교수 선택 (없음)</option>
                                    {professors.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700">선수과목</label>
                                <select
                                    id="prerequisites"
                                    multiple
                                    value={selectedPrerequisites}
                                    onChange={(e) => setSelectedPrerequisites(Array.from(e.target.selectedOptions, option => option.value))}
                                    className="mt-1 block w-full h-32 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {subjects.filter(s => s.id !== currentSubject?.id).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">Ctrl(Cmd) 또는 Shift 키를 사용하여 여러 개를 선택할 수 있습니다.</p>
                            </div>
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

export default SubjectManagement;