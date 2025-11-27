"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  ChevronsRight,
  FileText,
  Folder,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileItem } from "./filegrid";
// import { useSidebar } from "@/components/ui/sidebar";
import Image from "next/image";

// Set up the worker for react-pdf - only on client side
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  folderName?: string;
  onMaximizeChange?: (isMaximized: boolean) => void;
}

export function PDFViewer({
  isOpen,
  onClose,
  file,
  folderName,
  onMaximizeChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [dragPosition, setDragPosition] = useState(90); // Initial height in vh
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // const { state } = useSidebar();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Drag handlers for mobile PDF viewer
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const windowHeight = window.innerHeight;
    const newHeight = ((windowHeight - clientY) / windowHeight) * 100;

    // Check if dragged to top (less than 10vh from top)
    if (newHeight > 90) {
      setIsFullscreen(true);
      return;
    }

    // Check if dragged to bottom (less than 20vh from bottom) - close the viewer
    if (newHeight < 20 && !isFullscreen) {
      handleClose();
      setIsDragging(false);
      return;
    }

    // Exit fullscreen if dragging down from fullscreen
    if (isFullscreen && newHeight < 85) {
      setIsFullscreen(false);
    }

    // Limit height between 30vh and 95vh when not in fullscreen
    if (!isFullscreen) {
      const clampedHeight = Math.max(30, Math.min(95, newHeight));
      setDragPosition(clampedHeight);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClose = useCallback(() => {
    setIsMaximized(false);
    if (onMaximizeChange) {
      onMaximizeChange(false);
    }
    setDragPosition(90); // Reset to default position
    setIsFullscreen(false); // Reset fullscreen state
    onClose();
  }, [onMaximizeChange, onClose]);

  useEffect(() => {
    const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging) return;

      const clientY =
        "touches" in e
          ? (e as TouchEvent).touches[0].clientY
          : (e as MouseEvent).clientY;
      const windowHeight = window.innerHeight;
      const newHeight = ((windowHeight - clientY) / windowHeight) * 100;

      // Check if dragged to top (less than 10vh from top)
      if (newHeight > 90) {
        setIsFullscreen(true);
        return;
      }

      // Check if dragged to bottom (less than 20vh from bottom) - close the viewer
      if (newHeight < 20 && !isFullscreen) {
        handleClose();
        setIsDragging(false);
        return;
      }

      // Exit fullscreen if dragging down from fullscreen
      if (isFullscreen && newHeight < 85) {
        setIsFullscreen(false);
      }

      // Limit height between 30vh and 95vh when not in fullscreen
      if (!isFullscreen) {
        const clampedHeight = Math.max(30, Math.min(95, newHeight));
        setDragPosition(clampedHeight);
      }
    };

    const handleGlobalEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("touchmove", handleGlobalMove);
      document.addEventListener("mousemove", handleGlobalMove);
      document.addEventListener("touchend", handleGlobalEnd);
      document.addEventListener("mouseup", handleGlobalEnd);
    }

    return () => {
      document.removeEventListener("touchmove", handleGlobalMove);
      document.removeEventListener("mousemove", handleGlobalMove);
      document.removeEventListener("touchend", handleGlobalEnd);
      document.removeEventListener("mouseup", handleGlobalEnd);
    };
  }, [isDragging, isFullscreen, handleClose]);

  if (!isOpen || !file) return null;

  const displayName = folderName || file.name;

  // Calculate width based on sidebar state
  // const sidebarWidth = state === "collapsed" ? "3rem" : "16rem";
  // const maxWidth = `calc(100% - ${sidebarWidth})`;

  console.log("PDFViewer - File data:", file);
  console.log("PDFViewer - File URL:", file.url);
  console.log("PDFViewer - File Type:", file.type);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error);
  }

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  const handleMaximize = () => {
    const newMaximizedState = !isMaximized;
    setIsMaximized(newMaximizedState);
    if (onMaximizeChange) {
      onMaximizeChange(newMaximizedState);
    }
  };

  return (
    <>
      {/* Backdrop/Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 shadow-lg z-40 md:hidden"
          onClick={handleClose}
        />
      )}

      <div
        className={`fixed bg-white dark:bg-[#09090B] shadow-lg transform transition-all duration-300 ease-in-out z-50
          ${/* Mobile - from bottom, no X translation */ ""}
          bottom-0 left-0 right-0 w-full rounded-t-2xl border-t translate-x-0
          ${/* Desktop - from right */ ""}
          md:top-0 md:bottom-auto md:left-auto md:right-0 md:h-full md:w-[400px] md:rounded-none md:border-t-0 md:border-l
          ${/* Mobile Animation - ONLY Y axis */ ""}
          ${isOpen ? "translate-y-0" : "translate-y-full"}
          ${/* Desktop Animation - ONLY X axis, reset Y */ ""}
          md:translate-y-0 ${
            isOpen ? "md:translate-x-0" : "md:translate-x-full"
          }
          ${isMaximized ? "" : "md:w-[400px]"}
        `}
        style={{
          height:
            isMobile && isOpen && !isFullscreen
              ? `${dragPosition}vh`
              : isMobile && isFullscreen
              ? "100vh"
              : undefined,
        }}
      >
        {/* Draggable handle for mobile - hide in fullscreen */}
        <div
          className={`md:hidden flex justify-center py-2 cursor-touch active:cursor-grabbing ${
            isFullscreen ? "opacity-0 pointer-events-none" : ""
          }`}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09090B]">
          {/* Left side: File/folder name */}
          <div className="flex items-center gap-3">
            <h2
              className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                isMaximized ? "max-w-[600px]" : "max-w-[200px]"
              }`}
            >
              {displayName}
            </h2>
          </div>

          {/* Right side: Download, Maximize/Minimize, and Close icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="p-1 text-gray-500 dark:text-white hover:text-gray-700 transition-colors cursor-pointer"
              aria-label="Download file"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1 text-gray-500 dark:text-white hover:text-gray-700 transition-colors cursor-pointer"
              aria-label={isMaximized ? "Minimize viewer" : "Maximize viewer"}
            >
              {isMaximized ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-1 text-gray-500 dark:text-white hover:text-gray-700 transition-colors hidden md:block cursor-pointer"
              aria-label="Close viewer"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="h-[calc(100%-80px)] md:h-[calc(100%-64px)] overflow-auto scrollbar-hide bg-gray-50 dark:bg-[#09090B]">
          {/* PDF Viewer */}
          {file.type === "PDF" ? (
            file.url ? (
              <div className="p-4">
                <Document
                  file={file.url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-600 dark:text-white">
                          Loading PDF...
                        </p>
                      </div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center bg-white dark:bg-[#09090B] rounded-lg border border-red-200 p-6">
                        <p className="text-sm text-red-600 mb-2">
                          Failed to load PDF
                        </p>
                        <p className="text-xs text-gray-500">
                          The PDF file could not be loaded
                        </p>
                      </div>
                    </div>
                  }
                  className="flex flex-col items-center"
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={isMaximized ? 800 : 360}
                      className="mb-4 shadow-lg"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
                {numPages > 0 && (
                  <div className="text-center mt-4 mb-4 text-sm text-gray-600 bg-white rounded-lg py-2">
                    Total Pages: {numPages}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-2">
                    No preview available
                  </p>
                  <p className="text-xs text-gray-400">PDF URL not provided</p>
                </div>
              </div>
            )
          ) : file.type === "FOLDER" && file.files ? (
            /* Folder Contents */
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Folder Contents
                </h3>
                <p className="text-xs text-gray-500">
                  {file.files.length} items
                </p>
              </div>
              <div className="space-y-2">
                {file.files.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {item.type === "FOLDER" ? (
                      <Folder className="h-5 w-5 text-blue-600 shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.type}{" "}
                        {item.size
                          ? `• ${(item.size / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : file.type === "PNG" ? (
            /* Image Viewer */
            file.url ? (
              <div className="p-6 flex items-center justify-center">
                <Image
                  src={file.url}
                  alt={file.name}
                  width={1000}
                  height={1000}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  unoptimized
                  onError={(e) => {
                    console.error("Image load error");
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-2">
                    No preview available
                  </p>
                  <p className="text-xs text-gray-400">
                    Image URL not provided
                  </p>
                </div>
              </div>
            )
          ) : file.type === "TXT" ? (
            /* Text File Viewer */
            file.url ? (
              <div className="p-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <iframe
                    src={file.url}
                    className="w-full h-[600px] border-0"
                    title={file.name}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-2">
                    No preview available
                  </p>
                  <p className="text-xs text-gray-400">
                    Text file URL not provided
                  </p>
                </div>
              </div>
            )
          ) : (
            /* Default File Info - for DOCX, XLSX, PPTX, etc. */
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="mb-4">
                  <span
                    className={`inline-block rounded px-3 py-1.5 text-xs font-medium ${
                      file.type === "DOCX"
                        ? "bg-blue-100 text-blue-600"
                        : file.type === "XLSX"
                        ? "bg-green-100 text-green-600"
                        : file.type === "PPTX"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {file.type}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 wrap-break-words">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {file.size && file.size > 0
                    ? `${(file.size / 1024).toFixed(0)} KB`
                    : "Unknown size"}
                </p>
                {file.uploadedAt && (
                  <p className="text-xs text-gray-400 mb-4">
                    Uploaded on {file.uploadedAt.toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-gray-400">
                  Preview not available for {file.type} files
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Click the download icon to save this file
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
