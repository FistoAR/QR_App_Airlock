import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSidebarStore = create(
  persist(
    (set, get) => ({
      isExpanded: true,
      isHovered: false,
      isPinned: true,
      
      toggle: () => set({ isExpanded: !get().isExpanded }),
      
      expand: () => set({ isExpanded: true }),
      
      collapse: () => set({ isExpanded: false }),
      
      setHovered: (hovered) => {
        const { isPinned } = get();
        if (!isPinned) {
          set({ isHovered: hovered, isExpanded: hovered });
        }
      },
      
      togglePin: () => {
        const { isPinned, isExpanded } = get();
        set({ 
          isPinned: !isPinned,
          isExpanded: !isPinned ? isExpanded : true
        });
      },
    }),
    {
      name: 'sidebar-storage',
    }
  )
);