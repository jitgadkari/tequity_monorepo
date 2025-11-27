"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authFetch } from "@/lib/client-auth";

export interface FileItem {
  id?: string;
  name: string;
  type: string;
  size?: number;
  category?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FolderItem {
  id: string;
  name: string;
  fileCount?: number;
}

interface FilesContextType {
  files: FileItem[];
  folders: FolderItem[];
  isLoading: boolean;
  dataroomId: string | null;
  setDataroomId: (id: string) => void;
  setFiles: (files: FileItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  loadFiles: () => Promise<void>;
  loadFolders: () => Promise<void>;
  addFiles: (newFiles: FileItem[]) => void;
  deleteFile: (fileId: string) => Promise<boolean>;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export function FilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataroomId, setDataroomId] = useState<string | null>(null);

  // Load dataroom ID on mount
  useEffect(() => {
    const loadDataroomId = async () => {
      console.log('[FilesContext] Loading dataroom ID...');
      // First try localStorage
      const storedDataroomId = localStorage.getItem('tequity_dataroom_id');
      if (storedDataroomId) {
        console.log('[FilesContext] Found dataroomId in localStorage:', storedDataroomId);
        setDataroomId(storedDataroomId);
        return;
      }

      // Otherwise, get from user's datarooms
      try {
        console.log('[FilesContext] Fetching dataroom from /auth/me...');
        const response = await authFetch<{
          datarooms: Array<{ id: string; name: string; role: string }>;
        }>('/auth/me');

        console.log('[FilesContext] /auth/me response:', response);

        if (response.success && response.data?.datarooms?.[0]) {
          const firstDataroom = response.data.datarooms[0];
          console.log('[FilesContext] Setting dataroomId from API:', firstDataroom.id);
          setDataroomId(firstDataroom.id);
          localStorage.setItem('tequity_dataroom_id', firstDataroom.id);
        } else {
          console.warn('[FilesContext] No datarooms found in response');
        }
      } catch (error) {
        console.error('[FilesContext] Error loading dataroom ID:', error);
      }
    };

    loadDataroomId();
  }, []);

  // Load files from backend
  const loadFiles = useCallback(async () => {
    console.log('[FilesContext] loadFiles called, dataroomId:', dataroomId);
    if (!dataroomId) {
      console.log('[FilesContext] No dataroomId, skipping loadFiles');
      return;
    }

    setIsLoading(true);
    try {
      const url = `/files?dataroomId=${dataroomId}`;
      console.log('[FilesContext] Fetching files from:', url);

      const response = await authFetch<{
        files: Array<{
          id: string;
          name: string;
          originalName: string;
          fileType: string;
          fileSize: number;
          mimeType: string;
          category: string;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(url);

      console.log('[FilesContext] Files API response:', JSON.stringify(response, null, 2));
      console.log('[FilesContext] response.success:', response.success);
      console.log('[FilesContext] response.data:', response.data);
      console.log('[FilesContext] response.data?.files:', response.data?.files);

      if (response.success && response.data?.files) {
        console.log('[FilesContext] Loaded', response.data.files.length, 'files');
        const loadedFiles: FileItem[] = response.data.files.map((file) => {
          console.log('[FilesContext] Mapping file:', file);
          return {
            id: file.id,
            name: file.originalName || file.name,
            type: file.mimeType || file.fileType,
            size: file.fileSize,
            category: file.category,
            status: file.status,
            createdAt: new Date(file.createdAt),
            updatedAt: new Date(file.updatedAt),
          };
        });
        console.log('[FilesContext] About to setFiles with:', loadedFiles);
        setFiles(loadedFiles);
        console.log('[FilesContext] setFiles called successfully');
      } else {
        console.warn('[FilesContext] No files in response or request failed');
        console.warn('[FilesContext] response.success:', response.success);
        console.warn('[FilesContext] response.data:', response.data);
        console.warn('[FilesContext] Has files array:', !!response.data?.files);
      }
    } catch (error) {
      console.error('[FilesContext] Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataroomId]);

  // Load folders from backend
  const loadFolders = useCallback(async () => {
    if (!dataroomId) return;

    try {
      const response = await authFetch<{
        folders: Array<{
          id: string;
          name: string;
          _count?: { files: number };
        }>;
      }>(`/folders?dataroomId=${dataroomId}`);

      if (response.success && response.data?.folders) {
        const loadedFolders: FolderItem[] = response.data.folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          fileCount: folder._count?.files || 0,
        }));
        setFolders(loadedFolders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, [dataroomId]);

  // Load files and folders when dataroomId is available
  useEffect(() => {
    console.log('[FilesContext] dataroomId changed:', dataroomId);
    if (dataroomId) {
      console.log('[FilesContext] Loading files and folders...');
      loadFiles();
      loadFolders();
    }
  }, [dataroomId, loadFiles, loadFolders]);

  // Add files to the list (after upload)
  const addFiles = useCallback((newFiles: FileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const response = await authFetch(`/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setFiles((prev) => prev.filter((file) => file.id !== fileId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }, []);

  return (
    <FilesContext.Provider
      value={{
        files,
        folders,
        isLoading,
        dataroomId,
        setDataroomId,
        setFiles,
        setFolders,
        loadFiles,
        loadFolders,
        addFiles,
        deleteFile,
      }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (context === undefined) {
    throw new Error("useFiles must be used within a FilesProvider");
  }
  return context;
}

export function useFilesOptional() {
  return useContext(FilesContext);
}
