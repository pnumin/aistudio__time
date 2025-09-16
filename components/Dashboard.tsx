import React, { useState } from 'react';
import { User, UserRole } from '../types';
import ProfessorManagement from './ProfessorManagement';
import SubjectManagement from './SubjectManagement';
import HolidayManagement from './HolidayManagement';
import TimetableManagement from './TimetableManagement';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Tab = 'professors' | 'subjects' | 'holidays' | 'timetable';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timetable');

  const renderAdminDashboard = () => (
    <>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`${
              activeTab === 'timetable'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            시간표 생성/조회
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`${
              activeTab === 'subjects'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            과목 관리
          </button>
          <button
            onClick={() => setActiveTab('professors')}
            className={`${
              activeTab === 'professors'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            교수 관리
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`${
              activeTab === 'holidays'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            휴일 관리
          </button>
        </nav>
      </div>
      <div className="pt-8">
        {activeTab === 'timetable' && <TimetableManagement />}
        {activeTab === 'subjects' && <SubjectManagement />}
        {activeTab === 'professors' && <ProfessorManagement />}
        {activeTab === 'holidays' && <HolidayManagement />}
      </div>
    </>
  );

  const renderStudentDashboard = () => (
    <>
       <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            className={'border-indigo-500 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'}
          >
            시간표 조회
          </button>
        </nav>
      </div>
      <div className="pt-8">
        <TimetableManagement />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">시간표 관리 시스템</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              {user.email} ({user.role})
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {user.role === UserRole.ADMIN ? renderAdminDashboard() : renderStudentDashboard()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
