// src/components/AppHeader/index.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from './store';
import { CanvasSettingsModal } from '@/components/Settings/CanvasSettingsModal';

const DefaultAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
      <span className="text-sm font-medium">
        {initials}
      </span>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const canvasId = router.query.id as string;

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link 
          href="/"
          className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Canvas
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-4">
          {user && (
            <Link
              href="/canvas"
              className={`px-3 py-2 rounded-md transition-colors ${
                router.pathname.startsWith('/canvas')
                  ? 'text-blue-600 bg-blue-50 font-medium'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Canvases
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative">
              <button
                onClick={toggleMenu}
                className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <DefaultAvatar name={user.name} />
                <span className="text-gray-700">{user.name}</span>
              </button>

              {isMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-x-2">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      <CanvasSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        canvasId={canvasId}
      />
    </header>
  );
};

export default AppHeader;