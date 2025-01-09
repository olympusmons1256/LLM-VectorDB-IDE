// utils/constants.ts
export const APP_STORAGE_KEYS = {
    USER: 'user',
    CURRENT_PROJECT: 'currentProject',
    PROJECT_STATE_PREFIX: 'project-state-',
  };
  
  export const API_ENDPOINTS = {
    LOGIN: '/api/auth/login',
    PROJECTS: '/api/projects',
  };
  
  export const ERROR_MESSAGES = {
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    UNAUTHORIZED: 'You must be logged in to access this page.',
    PROJECT_NOT_FOUND: 'Project not found.',
  };