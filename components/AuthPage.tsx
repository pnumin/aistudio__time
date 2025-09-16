
import React, { useState } from 'react';
import { User, UserRole, StoredUser } from '../types';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole(UserRole.STUDENT);
    setError(null);
  };
  
  const toggleView = () => {
    setIsLoginView(!isLoginView);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (isLoginView) {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  const handleLogin = () => {
    const storedUsersJson = localStorage.getItem('users');
    if (!storedUsersJson) {
      setError('사용자 정보가 없습니다. 먼저 회원가입을 진행해주세요.');
      return;
    }
    
    const users: StoredUser[] = JSON.parse(storedUsersJson);
    const user = users.find(u => u.email === email);

    if (user && user.passwordHash === password) { // Simple password check for demo
      const { passwordHash, ...userToLogin } = user;
      onLogin(userToLogin);
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSignup = () => {
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    const storedUsersJson = localStorage.getItem('users');
    const users: StoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

    if (users.some(u => u.email === email)) {
      setError('이미 존재하는 이메일입니다.');
      return;
    }

    const newUser: StoredUser = {
      id: new Date().toISOString(),
      email,
      role,
      passwordHash: password, // Not a real hash, for demo purposes only
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    const { passwordHash, ...userToLogin } = newUser;
    onLogin(userToLogin);
  };

  const roleDisplayNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: '관리자',
    [UserRole.STUDENT]: '학생',
    [UserRole.PROFESSOR]: '교수',
  };

  const roleOptions = (Object.keys(UserRole) as Array<keyof typeof UserRole>).map((r) => (
    <option key={r} value={UserRole[r]}>
      {roleDisplayNames[UserRole[r]]}
    </option>
  ));


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            {isLoginView ? '로그인' : '회원가입'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">이메일 주소</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLoginView ? "current-password" : "new-password"}
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLoginView ? 'rounded-b-md' : ''} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {!isLoginView && (
              <>
                <div>
                  <label htmlFor="confirm-password" className="sr-only">비밀번호 확인</label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div>
                    <label htmlFor="role" className="sr-only">역할</label>
                     <select
                        id="role"
                        name="role"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                      >
                       {roleOptions}
                     </select>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoginView ? '로그인' : '회원가입'}
            </button>
          </div>
          <div className="text-sm text-center">
            <button type="button" onClick={toggleView} className="font-medium text-indigo-600 hover:text-indigo-500">
              {isLoginView ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
