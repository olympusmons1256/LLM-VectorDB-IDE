// components/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  FolderPlus,
  Search,
  Star,
  Trash2,
  FolderOpen,
  Settings,
  User,
  LogOut,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-screen w-80 bg-background border-r z-50",
        "transform transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-4">Project Management</h2>
            <div className="space-y-2">
              <button className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md">
                <FolderPlus className="h-4 w-4" />
                Create New Project
              </button>
              <button className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md">
                <UploadCloud className="h-4 w-4" />
                Import Project
              </button>
              {/* Remove Project Settings from here */}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="p-4">
              <h2 className="font-semibold mb-2">Projects</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                {/* Project list items here */}
              </div>
            </div>
          </div>

          <div className="border-t p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">Reid SantaBarbara</div>
                <div className="text-sm text-muted-foreground">reidsantabarbara@gmail.com</div>
              </div>
            </div>
            <div className="space-y-2">
              <button className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md">
                <Settings className="h-4 w-4" />
                User Settings
              </button>
              <button className="flex items-center gap-2 w-full p-2 hover:bg-accent text-red-500 rounded-md">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}