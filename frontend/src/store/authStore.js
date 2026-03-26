import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { token, user } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Login failed'
          };
        }
      },
      
      register: async (name, email, password) => {
        try {
          const response = await api.post('/auth/register', { name, email, password });
          const { token, user } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Registration failed'
          };
        }
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        delete api.defaults.headers.common['Authorization'];
      },
      
      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isLoading: false });
          return;
        }
        
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Initialize auth check
useAuthStore.getState().checkAuth();