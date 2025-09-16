export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface Vacation {
  id:string;
  startDate: string;
  endDate: string;
}

export interface Professor {
  id: string;
  name: string;
  vacations: Vacation[];
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  totalHours: number;
  professorId: string | null;
  prerequisiteIds?: string[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

export interface ScheduleEntry {
  id: string;
  subjectId: string;
  professorId: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}