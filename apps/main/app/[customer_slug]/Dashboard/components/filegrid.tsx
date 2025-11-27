import { FileType } from "lucide-react";

const formatFileSize = (bytes: number = 0): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export type FileType = 
  | 'PDF' | 'DOCX' | 'DOC' | 'XLSX' | 'XLS' | 'PPTX' | 'PPT' 
  | 'JPG' | 'JPEG' | 'PNG' | 'GIF' | 'SVG' | 'MP4' | 'MOV' | 'AVI' | 'WMV'
  | 'MP3' | 'WAV' | 'AAC' | 'OGG' | 'WMA' | 'ZIP' | 'RAR' | '7Z' | 'TAR' | 'GZ'
  | 'CSV' | 'TXT' | 'FOLDER';

export type FileItem = {
  name: string;
  type: FileType;
  size?: number;
  uploadedAt?: Date;
  id?: string;
  url?: string;
  hasText?: boolean; // Indicates if the file contains text content
  files?: FileItem[]; // For folders containing files
};

const typeTone: Record<FileType, string> = {
  // Document types
  PDF: "bg-red-100 text-red-600",
  DOCX: "bg-blue-100 text-blue-600",
  DOC: "bg-blue-100 text-blue-600",
  TXT: "bg-gray-100 text-gray-600",
  
  // Spreadsheet types
  XLSX: "bg-green-100 text-green-600",
  XLS: "bg-green-100 text-green-600",
  CSV: "bg-green-100 text-green-600",
  
  // Presentation types
  PPTX: "bg-orange-100 text-orange-600",
  PPT: "bg-orange-100 text-orange-600",
  
  // Image types
  JPG: "bg-purple-100 text-purple-600",
  JPEG: "bg-purple-100 text-purple-600",
  PNG: "bg-purple-100 text-purple-600",
  GIF: "bg-purple-100 text-purple-600",
  SVG: "bg-purple-100 text-purple-600",
  
  // Video types
  MP4: "bg-pink-100 text-pink-600",
  MOV: "bg-pink-100 text-pink-600",
  AVI: "bg-pink-100 text-pink-600",
  WMV: "bg-pink-100 text-pink-600",
  
  // Audio types
  MP3: "bg-indigo-100 text-indigo-600",
  WAV: "bg-indigo-100 text-indigo-600",
  AAC: "bg-indigo-100 text-indigo-600",
  OGG: "bg-indigo-100 text-indigo-600",
  WMA: "bg-indigo-100 text-indigo-600",
  
  // Archive types
  ZIP: "bg-amber-100 text-amber-600",
  RAR: "bg-amber-100 text-amber-600",
  '7Z': "bg-amber-100 text-amber-600",
  TAR: "bg-amber-100 text-amber-600",
  GZ: "bg-amber-100 text-amber-600",
  
  // Special types
  FOLDER: "bg-blue-50 text-blue-600"
};

interface FileGridProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
}
export function FileGrid({ files, onFileSelect }: FileGridProps) {
  const handleFileClick = (file: FileItem) => {
    console.log("File clicked:", file);
    onFileSelect(file);
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => handleFileClick(file)}
          className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 hover:bg-muted/80 cursor-pointer transition-colors"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleFileClick(file)}
        >
          <span
            className={`rounded px-2 py-0.5 text-[10px] ${typeTone[file.type]}`}
          >
            {file.type}
          </span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
