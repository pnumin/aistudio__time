import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Subject, Professor, Holiday, ScheduleEntry, UserRole, User } from '../types';

const timeSlots = [
    { start: '09:00', end: '09:50' }, { start: '10:00', end: '10:50' }, { start: '11:00', end: '11:50' },
    // 12:00-13:00 is lunch
    { start: '13:00', end: '13:50' }, { start: '14:00', end: '14:50' }, { start: '15:00', end: '15:50' },
    { start: '16:00', end: '16:50' }, { start: '17:00', end: '17:50' },
];

const generateTimetableLogic = (
  startDate: Date,
  endDate: Date,
  subjects: Subject[],
  professors: Professor[],
  holidays: Holiday[]
): { timetable: ScheduleEntry[], error: string | null } => {
    // 1. Topological Sort for prerequisites
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    subjects.forEach(s => {
        inDegree.set(s.id, 0);
        graph.set(s.id, []);
    });

    subjects.forEach(s => {
        s.prerequisiteIds?.forEach(prereqId => {
            if (graph.has(prereqId) && subjectMap.has(s.id)) {
                graph.get(prereqId)!.push(s.id);
                inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
            }
        });
    });

    const queue: string[] = [];
    subjects.forEach(s => {
        if (inDegree.get(s.id) === 0) {
            queue.push(s.id);
        }
    });

    const sortedSubjectIds: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedSubjectIds.push(u);
        graph.get(u)?.forEach(v => {
            inDegree.set(v, (inDegree.get(v) || 1) - 1);
            if (inDegree.get(v) === 0) {
                queue.push(v);
            }
        });
    }

    if (sortedSubjectIds.length !== subjects.length) {
        return { timetable: [], error: "선수과목 관계에 순환이 있어 시간표를 생성할 수 없습니다. 과목 설정을 확인해주세요." };
    }
    
    // 2. Schedule generation
    const newTimetable: ScheduleEntry[] = [];
    const subjectHoursLeft = new Map<string, number>(subjects.map(s => [s.id, s.totalHours]));
    const professorSchedule = new Map<string, string>(); // Key: "profId:YYYY-MM-DD:HH:MM", Value: subjectId

    const vacationMap = new Map<string, { start: number, end: number }[]>();
    professors.forEach(p => {
        vacationMap.set(p.id, p.vacations.map(v => ({
            start: new Date(v.startDate).setHours(0,0,0,0),
            end: new Date(v.endDate).setHours(0,0,0,0)
        })));
    });

    let currentDate = new Date(startDate);
    let dailySubjectHours = new Map<string, number>(); // Key: "profId:subjectId", Value: count

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        
        dailySubjectHours.clear(); // Reset daily count

        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Check for weekdays
            const holidaysOnThisDay = holidays.filter(h => h.date === dateStr);
            const isFullDayHoliday = holidaysOnThisDay.some(h => !h.startTime || !h.endTime);

            if (!isFullDayHoliday) {
                for (const slot of timeSlots) {
                    const isHolidaySlot = holidaysOnThisDay.some(h => {
                        // Check for partial day holiday overlap
                        return h.startTime && h.endTime && slot.start >= h.startTime && slot.start < h.endTime;
                    });

                    if (isHolidaySlot) continue; // Skip this slot if it's a partial holiday

                    for (const prof of professors) {
                        const profIsOnVacation = vacationMap.get(prof.id)?.some(v => {
                            const currentDateTime = currentDate.setHours(0,0,0,0);
                            return currentDateTime >= v.start && currentDateTime <= v.end;
                        });
                        if (profIsOnVacation) continue;

                        const scheduleKey = `${prof.id}:${dateStr}:${slot.start}`;
                        if (professorSchedule.has(scheduleKey)) continue;

                        for (const subjectId of sortedSubjectIds) {
                            const subject = subjectMap.get(subjectId)!;
                            if (subject.professorId !== prof.id || (subjectHoursLeft.get(subject.id) || 0) === 0) {
                                continue;
                            }

                            const prereqsDone = (subject.prerequisiteIds ?? []).every(prereqId => (subjectHoursLeft.get(prereqId) || 0) === 0);
                            if (!prereqsDone) continue;
                            
                            // Check daily hour limit for this subject and professor
                            const dailyKey = `${prof.id}:${subject.id}`;
                            const dailyHours = dailySubjectHours.get(dailyKey) || 0;
                            if (dailyHours >= 3) {
                                continue;
                            }

                            // Schedule it
                            newTimetable.push({
                                id: `${dateStr}-${slot.start}-${prof.id}`,
                                subjectId: subject.id,
                                professorId: prof.id,
                                date: dateStr,
                                startTime: slot.start,
                                endTime: slot.end,
                            });
                            professorSchedule.set(scheduleKey, subject.id);
                            subjectHoursLeft.set(subject.id, (subjectHoursLeft.get(subject.id) || 1) - 1);
                            
                            // Update daily count
                            dailySubjectHours.set(dailyKey, dailyHours + 1);
                            
                            break; // Move to next professor for this slot
                        }
                    }
                }
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const allHoursScheduled = Array.from(subjectHoursLeft.values()).every(h => h === 0);
    if (!allHoursScheduled) {
        return { timetable: [], error: "기간 내에 모든 수업을 배정할 수 없습니다. 기간을 늘리거나 과목 시간을 조절해주세요." };
    }

    return { timetable: newTimetable, error: null };
};

interface TimetableManagementProps {
    user: User;
}

const TimetableManagement: React.FC<TimetableManagementProps> = ({ user }) => {
    const [timetable, setTimetable] = useState<ScheduleEntry[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    
    const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const storedSubjects = localStorage.getItem('subjects');
        if (storedSubjects) setSubjects(JSON.parse(storedSubjects));
        
        const storedProfessors = localStorage.getItem('professors');
        if (storedProfessors) setProfessors(JSON.parse(storedProfessors));

        const storedHolidays = localStorage.getItem('holidays');
        if (storedHolidays) setHolidays(JSON.parse(storedHolidays));

        const storedTimetable = localStorage.getItem('timetable');
        if (storedTimetable) setTimetable(JSON.parse(storedTimetable));

        if (process.env.API_KEY) {
          setAi(new GoogleGenAI({apiKey: process.env.API_KEY}));
        }
    }, []);

    const updateLocalStorage = (data: ScheduleEntry[]) => {
        localStorage.setItem('timetable', JSON.stringify(data));
    };

    const handleGenerateTimetable = () => {
        if (!startDate || !endDate) {
            setError('시작일과 종료일을 모두 선택해주세요.');
            return;
        }
        setError('');
        setIsLoading(true);
        if (new Date(startDate) >= new Date(endDate)) {
          setError('종료일은 시작일보다 이후여야 합니다.');
          setIsLoading(false);
          return;
        }
        const result = generateTimetableLogic(new Date(startDate), new Date(endDate), subjects, professors, holidays);
        if (result.error) {
            setError(result.error);
            setTimetable([]);
        } else {
            setTimetable(result.timetable);
            updateLocalStorage(result.timetable);
        }
        setIsLoading(false);
    };
    
    const handleAIAssistedGeneration = async () => {
      if (!startDate || !endDate) {
            setError('AI 생성을 위해 시작일과 종료일을 모두 선택해주세요.');
            return;
      }
      if (!ai) {
          setError('Gemini AI가 설정되지 않았습니다. API 키를 확인해주세요.');
          return;
      }
      setError('');
      setIsLoading(true);

      const prompt = `
        You are a timetable scheduler for an educational institute.
        Create a detailed class schedule from ${startDate} to ${endDate}.
        Follow these rules strictly:
        1.  Classes are held on weekdays (Monday to Friday).
        2.  Do not schedule classes on weekends or during the provided holidays. Some holidays might be for a full day (no startTime/endTime), while others might be for a specific time range (with startTime/endTime). Respect these specific times.
        3.  The daily schedule consists of 8 one-hour slots: 09:00-09:50, 10:00-10:50, 11:00-11:50, 13:00-13:50, 14:00-14:50, 15:00-15:50, 16:00-16:50, 17:00-17:50. The period from 12:00 to 13:00 is a lunch break.
        4.  Each subject has a total number of hours that must be completed. Assign one hour of class per available time slot.
        5.  Subjects have prerequisites. A subject can only begin after all of its prerequisite subjects have been fully completed.
        6.  A professor cannot teach if they are on vacation. Do not schedule their classes during their vacation period.
        7.  A single subject cannot be scheduled for more than 3 hours in total on the same day for the same professor.
        8.  Different professors can teach their respective classes simultaneously in the same time slot.

        Data:
        - Subjects (name, totalHours, professor, prerequisites): ${JSON.stringify(subjects.map(s => ({ name: s.name, totalHours: s.totalHours, professor: professors.find(p => p.id === s.professorId)?.name || 'N/A', prerequisites: s.prerequisiteIds?.map(pId => subjects.find(sub => sub.id === pId)?.name).filter(Boolean) || [] })))}
        - Professors (name, vacations): ${JSON.stringify(professors.map(p => ({ name: p.name, vacations: p.vacations })))}
        - Holidays (name, date, startTime, endTime): ${JSON.stringify(holidays)}

        Output a JSON array of schedule entry objects. Each object must have the following keys: "date" (YYYY-MM-DD), "startTime" (HH:MM), "endTime" (HH:MM), and "subjectName".
        Return ONLY the raw JSON array, without any surrounding text or markdown.
      `;

      try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json" } });
        const textResponse = response.text.trim();
        const cleanedJson = textResponse.replace(/^${"```"}json\\s*|${"```"}\\s*$/g, '');
        const aiGeneratedSchedule = JSON.parse(cleanedJson);
        const formattedTimetable: ScheduleEntry[] = aiGeneratedSchedule.map((item: any) => ({
          id: `${item.date}-${item.startTime}-${item.subjectName}`, // simple id
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          subjectId: subjects.find(s => s.name === item.subjectName)?.id || '',
          professorId: subjects.find(s => s.name === item.subjectName)?.professorId || null,
        }));
        setTimetable(formattedTimetable);
        updateLocalStorage(formattedTimetable);
      } catch (e) {
        console.error("AI generation failed:", e);
        setError("AI 시간표 생성에 실패했습니다. 입력 데이터를 확인하거나 일반 생성 기능을 이용해주세요.");
      } finally {
        setIsLoading(false);
      }
    };
    
    const { getSubjectInfo } = useMemo(() => {
        const colors = ['bg-sky-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100', 'bg-teal-100', 'bg-red-100', 'bg-yellow-100', 'bg-indigo-100', 'bg-gray-100'];
        const colorMap = new Map<string, string>();
        subjects.forEach((subject, index) => {
            colorMap.set(subject.id, colors[index % colors.length]);
        });
        const getInfo = (subjectId: string | null) => {
            if (!subjectId) return { name: '-', professor: '-', color: 'bg-gray-50' };
            const subject = subjects.find(s => s.id === subjectId);
            if (!subject) return { name: '알 수 없는 과목', professor: '-', color: 'bg-gray-50' };
            const professor = professors.find(p => p.id === subject.professorId);
            return {
                name: subject.name,
                professor: professor ? professor.name : '배정되지 않음',
                color: colorMap.get(subject.id) || 'bg-gray-50',
            };
        };
        return { getSubjectInfo: getInfo };
    }, [subjects, professors]);

    const filteredTimetable = useMemo(() => {
        if (user.role === UserRole.PROFESSOR) {
            const currentProfessor = professors.find(p => p.email === user.email);
            if (currentProfessor) {
                return timetable.filter(entry => entry.professorId === currentProfessor.id);
            }
            return [];
        }
        return timetable;
    }, [timetable, user, professors]);


    const isAdmin = user.role === UserRole.ADMIN;
    
    const renderCalendar = () => {
        if (viewMode === 'weekly') return renderWeeklyView();
        if (viewMode === 'monthly') return renderMonthlyView();
        return null;
    };

    const renderWeeklyView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
        
        const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return day;
        });

        const weekTimetable = filteredTimetable.filter(entry => {
            const entryDate = new Date(entry.date);
            const weekStartDate = new Date(weekDays[0]);
            weekStartDate.setHours(0,0,0,0);
            const weekEndDate = new Date(weekDays[6]);
            weekEndDate.setHours(23,59,59,999);
            return entryDate >= weekStartDate && entryDate <= weekEndDate;
        });

        return (
            <div className="overflow-x-auto">
                <div className="grid grid-cols-8 min-w-[1000px]">
                    <div className="text-xs font-medium text-gray-500 border-r border-b"></div>
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="p-2 text-center border-b">
                            <div className="font-semibold">{['일', '월', '화', '수', '목', '금', '토'][day.getDay()]}</div>
                            <div className="text-gray-600">{day.getDate()}</div>
                        </div>
                    ))}
                    {timeSlots.map(slot => (
                        <React.Fragment key={slot.start}>
                            <div className="flex items-center justify-center p-2 text-xs font-medium text-gray-500 border-r border-b">{slot.start}</div>
                            {weekDays.map(day => {
                                const entries = weekTimetable.filter(e => e.date === day.toISOString().split('T')[0] && e.startTime === slot.start);
                                return (
                                    <div key={day.toISOString() + slot.start} className={`p-1 border-b space-y-1 ${day.getDay() !== 0 && day.getDay() !== 6 ? 'border-r' : ''}`}>
                                        {entries.map(entry => {
                                             const subjectInfo = getSubjectInfo(entry.subjectId);
                                             return (
                                                <div key={entry.id} className={`rounded p-1 text-xs ${subjectInfo.color}`}>
                                                    <p className="font-bold text-gray-800">{subjectInfo.name}</p>
                                                    <p className="text-gray-600">{subjectInfo.professor}</p>
                                                </div>
                                             );
                                        })}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    const renderMonthlyView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 for Sunday
        
        const gridCells: (Date | null)[] = Array(startDayOfWeek).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)));
        
        return (
            <div className="grid grid-cols-7 border-t border-l">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="text-center font-bold p-2 border-b border-r bg-gray-50">{day}</div>)}
                {gridCells.map((day, index) => (
                    <div key={index} className={`h-32 border-b border-r p-1 overflow-y-auto ${!day || day.getMonth() !== month ? 'bg-gray-50' : ''}`}>
                        {day && (
                            <>
                                <span className="font-semibold">{day.getDate()}</span>
                                {holidays
                                    .filter(h => h.date === day.toISOString().split('T')[0])
                                    .map(holiday => (
                                        <div key={holiday.id} className="text-xs text-red-600 font-bold">
                                            {holiday.name}
                                            {holiday.startTime && holiday.endTime && ` (${holiday.startTime}-${holiday.endTime})`}
                                        </div>
                                    ))
                                }
                                {filteredTimetable
                                    .filter(e => e.date === day.toISOString().split('T')[0])
                                    .sort((a,b) => a.startTime.localeCompare(b.startTime))
                                    .map(entry => {
                                        const subjectInfo = getSubjectInfo(entry.subjectId);
                                        return (
                                            <div key={entry.id} className={`text-[10px] p-0.5 rounded mt-0.5 ${subjectInfo.color}`}>
                                                <span className="font-semibold">{entry.startTime}</span> {subjectInfo.name}
                                            </div>
                                        );
                                })}
                            </>
                        )}
                    </div>
                ))}
            </div>
        );
    };
    
    const navigateDate = (amount: number, unit: 'day' | 'month') => {
        const newDate = new Date(currentDate);
        if (unit === 'day') newDate.setDate(newDate.getDate() + amount);
        if (unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
        setCurrentDate(newDate);
    };
    
    const navigateWeek = (amount: number) => navigateDate(amount * 7, 'day');

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            {isAdmin && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">시간표 생성</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      <div>
                          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">과정 시작일</label>
                          <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                      </div>
                      <div>
                          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">과정 종료일</label>
                          <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={handleGenerateTimetable} disabled={isLoading} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-300">
                            {isLoading ? '생성 중...' : '일반 생성'}
                        </button>
                         <button onClick={handleAIAssistedGeneration} disabled={isLoading || !ai} title={!ai ? "API Key가 설정되지 않았습니다" : "Gemini AI를 사용하여 생성"} className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300">
                            {isLoading ? '생성 중...' : 'AI 생성'}
                        </button>
                      </div>
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      {viewMode === 'weekly' 
                        ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
                        : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
                      }
                    </h2>
                    <div className="flex items-center border rounded-md">
                        <button onClick={() => viewMode === 'weekly' ? navigateWeek(-1) : navigateDate(-1, 'month')} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md">‹</button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium text-gray-700 border-l border-r hover:bg-gray-100">오늘</button>
                        <button onClick={() => viewMode === 'weekly' ? navigateWeek(1) : navigateDate(1, 'month')} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md">›</button>
                    </div>
                </div>
                <div>
                    <span className="relative z-0 inline-flex shadow-sm rounded-md">
                        <button type="button" onClick={() => setViewMode('monthly')} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium ${viewMode === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>월간</button>
                        <button type="button" onClick={() => setViewMode('weekly')} className={`-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border text-sm font-medium ${viewMode === 'weekly' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>주간</button>
                    </span>
                </div>
            </div>
            
            {filteredTimetable.length > 0 ? renderCalendar() : (
                <div className="text-center py-16 text-gray-500">
                    {user.role === UserRole.ADMIN && '시간표를 생성해주세요.'}
                    {user.role === UserRole.STUDENT && '생성된 시간표가 없습니다.'}
                    {user.role === UserRole.PROFESSOR && '배정된 강의가 없습니다.'}
                </div>
            )}
        </div>
    );
};

export default TimetableManagement;