import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (userData) => {
        // Extract email from the Google response
        let user = userData;
        
        // If it's the Google OAuth response, we need to get the profile
        if (userData && userData.access_token) {
          // We'll fetch the profile in App.jsx
          set({ user: userData });
        } else {
          set({ user: userData });
        }
      },
      setUserProfile: (profile) => {
        set((state) => ({
          user: { ...state.user, ...profile }
        }));
      },
      logout: () => {
        set({ user: null });
        localStorage.removeItem('quizUser');
      },
    }),
    {
      name: 'user-storage',
    }
  )
);