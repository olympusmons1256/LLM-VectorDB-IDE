// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { localStorageUtil } from '@/lib/localStorage';
import { AuthContextType, User } from '@/lib/types';

// Create the context with a default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  isAuthenticated: false,
  getUserByEmail: () => null,
  createInvitedUser: async () => ({ id: '', email: '', name: '' })
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const router = useRouter();

  // Load registered users on mount
  useEffect(() => {
    const users = localStorageUtil.getItem<User[]>('registered-users') || [];
    setRegisteredUsers(users);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const savedUser = localStorageUtil.getItem<User>('user');
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const getUserByEmail = useCallback((email: string): User | null => {
    return registeredUsers.find(u => u.email === email) || null;
  }, [registeredUsers]);

  const login = async (email: string, password: string) => {
    try {
      // Check if user exists in localStorage
      const foundUser = getUserByEmail(email);

      if (!foundUser) {
        throw new Error('User not found. Please sign up.');
      }

      // In a real app, you'd verify the password here
      setUser(foundUser);
      localStorageUtil.setItem('user', foundUser);
      router.push('/project');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const createInvitedUser = async (email: string, name?: string): Promise<User> => {
    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return existingUser;
    }

    // Create new user without logging in
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name: name || email.split('@')[0]
    };

    // Add new user to registered users
    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    localStorageUtil.setItem('registered-users', updatedUsers);

    return newUser;
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      // Check if user already exists
      const existingUser = getUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name
      };

      // Add new user to registered users
      const updatedUsers = [...registeredUsers, newUser];
      setRegisteredUsers(updatedUsers);
      localStorageUtil.setItem('registered-users', updatedUsers);

      // Set current user and save
      setUser(newUser);
      localStorageUtil.setItem('user', newUser);

      // Redirect to project page
      router.push('/project');
    } catch (error) {
      console.error('Signup failed', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorageUtil.removeItem('user');
    router.push('/login');
  };

  const value = {
    user,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    getUserByEmail,
    createInvitedUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};