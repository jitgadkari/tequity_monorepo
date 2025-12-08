/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiUploadCloud } from "react-icons/fi";
import { FileItem } from "./filegrid";
import { X, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import Image from "next/image";
import { UploadGraphic } from "./UploadGraphic";
import { toast } from "sonner";
import { getToken, getTenantSlug, authFetch, ensureToken } from "@/lib/client-auth";
import { useGoogleDrivePicker } from "@/hooks/useGoogleDrivePicker";

// File type icons - using public folder paths
const fileIcons: Record<string, string> = {
  pdf: "/Files/PDF-icon.svg",
  xls: "/Files/XLS-icon.svg",
  xlsx: "/Files/XLS-icon.svg",
  ppt: "/Files/PPT-icon.svg",
  pptx: "/Files/PPT-icon.svg",
  png: "/Files/PNG-icon.svg",
  jpg: "/Files/JPG-icon.svg",
  jpeg: "/Files/JPG-icon.svg",
  doc: "/Files/Docs-icon.svg",
  docx: "/Files/Docs-icon.svg",
  mp3: "/Files/MP3-icon.svg",
  txt: "/Files/TXT-icon.svg",
  svg: "/Files/SVG-icon.svg",
  zip: "/Files/ZIP-icon.svg",
};

function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const iconPath = fileIcons[extension] || "/Files/Docs-icon.svg";
  return <Image src={iconPath} alt={extension.toUpperCase()} width={48} height={48} className="w-12 h-12" />;
}

type FileType =
  | "PDF"
  | "DOCX"
  | "XLSX"
  | "PPTX"
  | "PNG"
  | "MP4"
  | "CSV"
  | "TXT";

export interface FolderItem {
  id: string;
  name: string;
  fileCount: number;
}

interface UploadDialogProps {
  onUpload: (files: FileItem[], folders: FolderItem[]) => void;
}

type UploadStatus = "pending" | "uploading" | "success" | "error";

export function UploadDialog({ onUpload }: UploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>(
    {}
  );
  const [uploadStatus, setUploadStatus] = useState<
    Record<number, UploadStatus>
  >({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"files" | "folder">("files");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dataroomId, setDataroomId] = useState<string | null>(null);
  const [uploadedFileIds, setUploadedFileIds] = useState<Record<number, string>>({});

  // Google Drive Picker configuration - removed, now using env vars in hook

  // Handle files selected from Google Drive
  const handleDriveFilesSelected = async (driveFiles: any[], accessToken: string) => {
    console.log('[UploadDialog] Google Drive files selected:', driveFiles);
    toast.success(`Selected ${driveFiles.length} file(s) from Google Drive`);

    // Convert Drive files metadata to File-like objects for upload
    // We'll need to download the files from Google Drive and upload them to our backend
    const filePromises = driveFiles.map(async (driveFile) => {
      try {
        // Download file from Google Drive using fetch with proper binary handling
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`;
        const response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        // Get the file as a blob (binary data)
        const blob = await response.blob();
        const file = new File([blob], driveFile.name, { type: driveFile.mimeType });
        return file;
      } catch (error) {
        console.error('[UploadDialog] Error downloading file from Google Drive:', error);
        toast.error(`Failed to download: ${driveFile.name}`);
        return null;
      }
    });

    const downloadedFiles = (await Promise.all(filePromises)).filter(Boolean) as File[];

    if (downloadedFiles.length > 0) {
      setFiles((prevFiles) => [...prevFiles, ...downloadedFiles]);
      // Automatically start uploading downloaded files
      setTimeout(() => startUpload(downloadedFiles, files.length), 100);
    }
  };

  // Initialize Google Drive Picker with new simplified API
  const { openPicker, isReady, isLoading, error: pickerError } = useGoogleDrivePicker(
    handleDriveFilesSelected
  );

  // Show picker errors
  useEffect(() => {
    if (pickerError) {
      console.error('[UploadDialog] Google Drive Picker error:', pickerError);
      toast.error(pickerError);
    }
  }, [pickerError]);

  // Load dataroom ID on mount
  useEffect(() => {
    const loadDataroomId = async () => {
      console.log('[UploadDialog] Loading dataroom ID...');
      // First try localStorage
      const storedDataroomId = localStorage.getItem('tequity_dataroom_id');
      if (storedDataroomId) {
        console.log('[UploadDialog] Found dataroomId in localStorage:', storedDataroomId);
        setDataroomId(storedDataroomId);
        return;
      }

      // Ensure we have a token before making API calls
      const token = await ensureToken();
      if (!token) {
        console.warn('[UploadDialog] No token available, cannot fetch datarooms');
        // Fallback: use tenant slug as dataroom ID
        const tenantSlug = getTenantSlug();
        if (tenantSlug) {
          console.log('[UploadDialog] Using tenant slug as fallback dataroom ID:', tenantSlug);
          setDataroomId(tenantSlug);
        }
        return;
      }

      // Otherwise, get from user's datarooms
      try {
        console.log('[UploadDialog] Fetching dataroom from /auth/me...');
        const response = await authFetch<{
          datarooms: Array<{ id: string; name: string; role: string }>;
        }>('/auth/me');

        console.log('[UploadDialog] /auth/me response:', response);

        if (response.success && response.data?.datarooms?.[0]) {
          const firstDataroom = response.data.datarooms[0];
          console.log('[UploadDialog] Setting dataroomId:', firstDataroom.id);
          setDataroomId(firstDataroom.id);
          localStorage.setItem('tequity_dataroom_id', firstDataroom.id);
        } else {
          console.warn('[UploadDialog] No datarooms found in response');
          // Fallback: use tenant slug as dataroom ID
          const tenantSlug = getTenantSlug();
          if (tenantSlug) {
            console.log('[UploadDialog] Using tenant slug as fallback dataroom ID:', tenantSlug);
            setDataroomId(tenantSlug);
          }
        }
      } catch (error) {
        console.error('[UploadDialog] Error loading dataroom ID:', error);
      }
    };

    loadDataroomId();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      // Automatically start uploading new files
      setTimeout(() => startUpload(newFiles, files.length), 100);
    }
  };

  const retryUpload = async (fileIndex: number) => {
    const fileToRetry = files[fileIndex];
    if (!fileToRetry) return;

    // Reset the progress and status
    setUploadProgress(prev => ({
      ...prev,
      [fileIndex]: 0
    }));
    
    setUploadStatus(prev => ({
      ...prev,
      [fileIndex]: "uploading"
    }));

    // Create a new array with just this file to retry
    const filesToRetry = [fileToRetry];
    
    // Start the upload process for this file
    await startUpload(filesToRetry, fileIndex);
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
        // Automatically start uploading dropped files
        setTimeout(() => startUpload(droppedFiles, files.length), 100);
      }
    },
    [files.length]
  );

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  // Helper function to update progress with smooth animation
  const updateProgress = (index: number, progress: number, duration: number = 300) => {
    return new Promise<void>((resolve) => {
      const startTime = performance.now();
      const startProgress = uploadProgress[index] || 0;
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        const currentProgress = startProgress + (progress - startProgress) * progressRatio;
        
        setUploadProgress(prev => ({
          ...prev,
          [index]: Math.round(currentProgress * 10) / 10 // Round to 1 decimal for smoother animation
        }));
        
        if (progressRatio < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  };

  const startUpload = async (filesToUpload: File[], startIndex: number) => {
    console.log("[UploadDialog] startUpload called with", filesToUpload.length, "files, startIndex:", startIndex);
    console.log("[UploadDialog] dataroomId:", dataroomId);

    if (!dataroomId) {
      console.error("[UploadDialog] No dataroomId found!");
      toast.error("Dataroom not found. Please refresh the page.");
      return;
    }

    // Initialize status and progress for all files
    const initialStatus: Record<number, UploadStatus> = {};
    const initialProgress: Record<number, number> = {};
    
    filesToUpload.forEach((_, index) => {
      const actualIndex = startIndex + index;
      initialStatus[actualIndex] = "uploading";
      initialProgress[actualIndex] = 0;
    });
    
    setUploadStatus((prev) => ({ ...prev, ...initialStatus }));
    setUploadProgress((prev) => ({ ...prev, ...initialProgress }));
    setIsUploading(true);

    // Ensure we have a valid token (fetch from session if needed)
    const token = await ensureToken();
    const tenantSlug = getTenantSlug();
    console.log("[UploadDialog] token exists:", !!token, "tenantSlug:", tenantSlug);

    if (!token) {
      toast.error("Authentication error. Please refresh the page and try again.");
      setIsUploading(false);
      return;
    }

    for (let i = 0; i < filesToUpload.length; i++) {
      const actualIndex = startIndex + i;
      const file = filesToUpload[i];
      console.log(`[UploadDialog] Uploading file ${i + 1}/${filesToUpload.length}:`, file.name, "size:", file.size);

      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dataroomId", dataroomId);
        formData.append("processForRAG", "true");

        // Initial progress
        await updateProgress(actualIndex, 10, 200);

        const uploadUrl = `/api/${tenantSlug}/files/upload`;
        console.log("[UploadDialog] Uploading to:", uploadUrl);

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = 10 + (event.loaded / event.total) * 80; // 10-90% for upload
            setUploadProgress(prev => ({
              ...prev,
              [actualIndex]: Math.min(90, Math.round(percentComplete))
            }));
          }
        };

        const response = await new Promise<Response>((resolve, reject) => {
          xhr.open("POST", uploadUrl, true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(new Response(xhr.response, {
                status: xhr.status,
                statusText: xhr.statusText
              }));
            } else {
              reject(new Error(xhr.statusText));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error'));
          };
          
          xhr.send(formData);
        });

        console.log("[UploadDialog] Response status:", response.status);
        
        // Simulate processing progress
        await updateProgress(actualIndex, 95, 300);

        const result = await response.json();
        console.log("[UploadDialog] Response body:", result);

        if (response.ok && result.success) {
          await updateProgress(actualIndex, 100, 200);
          setUploadStatus((prev) => ({ ...prev, [actualIndex]: "success" }));
          console.log("[UploadDialog] Upload success! File ID:", result.data?.file?.id);

          // Store the uploaded file ID
          if (result.data?.file?.id) {
            setUploadedFileIds((prev) => ({
              ...prev,
              [actualIndex]: result.data.file.id,
            }));
          }
        } else {
          console.error("[UploadDialog] Upload error:", result.error, result);
          setUploadStatus((prev) => ({ ...prev, [actualIndex]: "error" }));
        }
      } catch (error) {
        console.error("[UploadDialog] Upload failed with exception:", error);
        setUploadStatus((prev) => ({ ...prev, [actualIndex]: "error" }));
      }
    }

    setIsUploading(false);
    console.log("[UploadDialog] All uploads completed");
  };

  const handleUpload = async () => {
    console.log("[UploadDialog] handleUpload (Done button) called");
    console.log("[UploadDialog] Current uploadStatus:", uploadStatus);
    console.log("[UploadDialog] Current uploadedFileIds:", uploadedFileIds);
    console.log("[UploadDialog] Files count:", files.length);

    const failedFiles = files.filter(
      (_, index) => uploadStatus[index] === "error"
    );
    const pendingFiles = files.filter(
      (_, index) => uploadStatus[index] === "pending"
    );

    console.log("[UploadDialog] Failed files:", failedFiles.length, "Pending files:", pendingFiles.length);

    if (failedFiles.length > 0 || pendingFiles.length > 0) {
      console.log("[UploadDialog] Cannot proceed - there are failed or pending files");
      return;
    }

    const successfulFiles = files.filter(
      (_, index) => uploadStatus[index] === "success"
    );
    console.log("[UploadDialog] Successful files:", successfulFiles.length);

    let fileItems: FileItem[] = [];
    let folderItems: FolderItem[] = [];

    if (uploadMode === "folder") {
      const folderMap = new Map<string, File[]>();

      successfulFiles.forEach((file: File) => {
        const path =
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name;
        const pathParts = path.split("/");

        if (pathParts.length > 1) {
          const folderName = pathParts[0];
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, []);
          }
          folderMap.get(folderName)!.push(file);
        }
      });

      folderItems = Array.from(folderMap.entries()).map(
        ([folderName, folderFiles], index) => ({
          id: `folder-${Date.now()}-${index}`,
          name: folderName,
          fileCount: folderFiles.length,
        })
      );
    } else {
      // Use real file IDs from backend uploads
      fileItems = successfulFiles.map((file, idx) => {
        const originalIndex = files.indexOf(file);
        const fileId = uploadedFileIds[originalIndex] || `file-${Date.now()}-${idx}`;
        const extension = file.name.split(".").pop()?.toUpperCase() || "TXT";
        const fileType = [
          "PDF",
          "DOCX",
          "XLSX",
          "PPTX",
          "PNG",
          "MP4",
          "CSV",
          "TXT",
        ].includes(extension)
          ? (extension as FileType)
          : "TXT";

        return {
          id: fileId,
          name: file.name,
          type: fileType,
          size: file.size,
          uploadedAt: new Date(),
        };
      });
    }

    console.log("[UploadDialog] Upload mode:", uploadMode);
    console.log("[UploadDialog] File items to pass to onUpload:", fileItems);
    console.log("[UploadDialog] Folder items to pass to onUpload:", folderItems);

    if (onUpload) {
      console.log("[UploadDialog] Calling onUpload callback...");
      onUpload(fileItems, folderItems);
      console.log("[UploadDialog] onUpload callback completed");
    } else {
      console.warn("[UploadDialog] No onUpload callback provided!");
    }

    toast.success("Files uploaded successfully");

    // Reset and close only if all uploads were successful
    console.log("[UploadDialog] Resetting state and closing dialog...");
    setFiles([]);
    setUploadProgress({});
    setUploadStatus({});
    setUploadedFileIds({});
    setIsUploading(false);
    setIsOpen(false);
  };

  const handleButtonClick = (mode: "files" | "folder") => {
    setUploadMode(mode);
    if (mode === "files") {
      fileInputRef.current?.click();
    } else {
      folderInputRef.current?.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setIsOpen(true)}>
          <button className="flex items-center gap-2 bg-[#F4F4F5] dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#27272A] dark:hover:text-white text-gray-700 hover:text-gray-900 transition-colors px-3 py-3 rounded-md dark:border-gray-700 cursor-pointer ">
            <FiUploadCloud className="h-4 w-4 dark:text-white" />
            Upload 
          </button>
        </div>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-32px)] max-w-[352px] h-[400px] sm:w-[560px] sm:max-w-[560px] p-[16px] border border-[#E2E8F0] dark:border-[#27272A] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] flex flex-col">
        <DialogTitle className="sr-only">Upload Files</DialogTitle>
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="*/*"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore - webkitdirectory is not in the types but is supported
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center w-full h-full">
          {/* Header */}
          <div className="flex flex-row items-center gap-3 w-full h-9 mb-0 shrink-0">
            <h2 className="flex-1 font-['Inter'] font-medium text-[20px] leading-[28px] tracking-[-0.12px] text-[#020617] dark:text-white">
              Upload
            </h2>
            <DialogDescription className="sr-only">
              Upload files to your library
            </DialogDescription>
          </div>

          {/* Upload Area - Only show when no files */}
          {files.length === 0 && (
            <div className="flex flex-col justify-center items-center flex-1 w-full p-6 gap-5 rounded-xl">
              {/* Graphic - Custom File Icons - Clickable */}
              <button
                type="button"
                onClick={() => handleButtonClick("files")}
                className="relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                <UploadGraphic />
              </button>

              {/* Text */}
              <div className="flex flex-col justify-center items-center gap-1.5 w-full">
                <p className="font-['Inter'] font-medium text-2xl leading-8 tracking-[-0.006em] text-[#09090B] dark:text-white">
                  Upload Files
                </p>
                <p className="font-['Inter'] font-normal text-sm leading-5 text-center text-[#71717A] w-full dark:text-white">
                  Click above to browse files or folders
                </p>
              </div>

              {/* Upload Options */}
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={() => handleButtonClick("files")}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2 h-10"
                  >
                    <FiUploadCloud className="h-4 w-4" />
                    Files
                  </Button>
                  <Button
                    onClick={() => handleButtonClick("folder")}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2 h-10"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Folder
                  </Button>
                </div>

                {/* Google Drive Button */}
                <Button
                  onClick={() => openPicker()}
                  disabled={!isReady}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-10 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.42 6.5L11.13 10 7.71 3.5zm6.58 0L8.23 15l3.42 6.5L18.21 10l-3.92-6.5zM1.5 21.5L4.92 15 8.34 21.5H1.5zm13.1 0L11.18 15l3.42 6.5h-0.1zm6.4-15L15.04 15l3.42 6.5L24.5 10l-3.5-3.5z"/>
                  </svg>
                  {isReady ? 'Google Drive' : 'Loading...'}
                </Button>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-[16px] w-full flex-1 overflow-hidden">
              {/* Files Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px] w-full overflow-y-auto flex-1 pr-2 scrollbar-hide">
                {files.map((file, index) => {
                  const status = uploadStatus[index] || "pending";
                  const progress = uploadProgress[index] || 0;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-start p-[12px] gap-[8px] bg-white border border-[#E2E8F0] rounded-xl relative h-[140px] dark:bg-[#18181B] dark:border-[#3F3F46] transition-colors duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5F6] dark:hover:bg-[#27272A] dark:hover:border-[#52525B] ${
                        status === "uploading" ? "overflow-hidden" : ""
                      }`}
                    >
                      {/* Progress bar background for uploading state */}
                      {status === "uploading" && (
                        <div className="absolute left-0 top-0 bottom-0 right-0 overflow-hidden rounded-xl">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 transition-all duration-300 ease-out"
                            style={{
                              width: `${progress}%`,
                              transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 dark:from-transparent dark:to-black/10" />
                        </div>
                      )}

                      <div className="flex flex-col justify-center items-start gap-[12px] w-full relative z-10">
                        {/* File icon and action button */}
                        <div className="flex flex-row justify-between items-center w-full">
                          <div className="w-12 h-12 flex-shrink-0">
                            {getFileIcon(file.name)}
                          </div>

                          {status === "pending" && (
                            <button
                              type="button"
                              className="flex items-center justify-center w-[40px] h-[36px] rounded-md hover:bg-gray-100 dark:hover:bg-[#27272A]"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <X className="h-4 w-4 text-[#020617] dark:text-white" />
                            </button>
                          )}
                          {status === "success" && (
                            <button
                              type="button"
                              className="flex items-center justify-center w-[40px] h-[36px] rounded-md hover:bg-gray-100 dark:hover:bg-[#27272A]"
                              onClick={() => removeFile(index)}
                            >
                              <CheckCircle className="h-4 w-4 text-[#008A2E] dark:text-[#4ADE80]" />
                            </button>
                          )}
                          {status === "error" && (
                            <button
                              type="button"
                              className="flex items-center justify-center w-[40px] h-[36px] rounded-md hover:bg-gray-100 dark:hover:bg-[#27272A]"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryUpload(index);
                              }}
                            >
                              <RefreshCw className="h-4 w-4 text-[#020617] dark:text-white" />
                            </button>
                          )}
                        </div>

                        {/* File info */}
                        <div className="flex flex-col items-start gap-[4px] w-full">
                          <p className="font-['Inter'] font-medium text-[12px] leading-[20px] text-[#020617] dark:text-white line-clamp-2 w-full overflow-ellipsis overflow-hidden">
                            {file.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => status === "error" && retryUpload(index)}
                            className={`w-full text-left ${status === "error" ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <p
                              className={`font-['Inter'] font-normal text-[10px] leading-[14px] w-full ${
                                status === "error"
                                  ? "text-[#E60000] dark:text-[#FF6B6B] hover:underline"
                                  : "text-[#64748B] dark:text-[#A1A1AA]"
                              }`}
                            >
                              {status === "error"
                                ? "Click to try again"
                                : `${(file.size / (1024 * 1024)).toFixed(1)}MB`}
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add files card - only show if less than 6 files */}
                {files.length < 6 && (
                  <button
                    type="button"
                    onClick={() => openPicker()}
                    disabled={!isReady}
                    className="flex flex-col justify-center items-center p-[12px] gap-[8px] bg-[#FAFAFA] rounded-xl hover:bg-gray-200 transition-colors h-[140px] cursor-pointer border border-[#E2E8F0] dark:bg-[#18181B] dark:border-[#3F3F46] dark:hover:bg-[#3F3F46]/60 hover:border-[#CBD5F6] dark:hover:border-[#52525B] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.71 3.5L1.15 15l3.42 6.5L11.13 10 7.71 3.5zm6.58 0L8.23 15l3.42 6.5L18.21 10l-3.92-6.5zM1.5 21.5L4.92 15 8.34 21.5H1.5zm13.1 0L11.18 15l3.42 6.5h-0.1zm6.4-15L15.04 15l3.42 6.5L24.5 10l-3.5-3.5z"/>
                    </svg>
                    <p className="font-['Inter'] font-normal text-[14px] leading-[20px] text-[#020617] dark:text-white">
                      Add from Drive
                    </p>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fixed Bottom Button Area */}
          {files.length > 0 && (
            <div className="flex-shrink-0 mt-auto pt-4 w-full">
              <Button
                className="w-full h-10 cursor-pointer bg-zinc-900 text-white rounded-lg font-['Inter'] font-medium text-[14px] leading-[20px] tracking-[-0.084px] hover:bg-zinc-800"
                onClick={handleUpload}
                disabled={files.some(
                  (_, index) =>
                    uploadStatus[index] === "uploading" ||
                    uploadStatus[index] === "error"
                )}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
