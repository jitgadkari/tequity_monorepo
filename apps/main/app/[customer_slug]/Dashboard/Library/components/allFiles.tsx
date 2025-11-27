// import React, { useMemo, useState } from "react";
// import { IoGridOutline } from "react-icons/io5";
// import { FaListUl } from "react-icons/fa";
// import { MoreHorizontal } from "lucide-react";
// import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import type {FileItem} from "@/app/Dashboard/components/filegrid";

// interface Props {
//   files: FileItem[];
//   onFileDelete?: (id: string) => void;
// }

// export default function LibraryAllFiles({ files, onFileDelete }: Props) {
//   const [fileView, setFileView] = useState<"grid" | "list">("grid");
//   const [activeFileType, setActiveFileType] = useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = useState("");

//   const fileTypeMap: Record<string, string[]> = {
//     Documents: ["PDF", "DOCX", "TXT", "PPTX"],
//     Photos: ["JPG", "JPEG", "PNG", "GIF", "SVG"],
//     Videos: ["MP4", "MOV", "AVI", "WMV"],
//     "Compressed ZIPs": ["ZIP", "RAR", "7Z", "TAR", "GZ"],
//     Audio: ["MP3", "WAV", "AAC", "OGG", "WMA"],
//     Excel: ["XLSX", "XLS", "CSV"],
//   };

//   const filteredFiles = useMemo(() => {
//     const q = searchQuery.trim().toLowerCase();
//     return files.filter((file) => {
//       const ext = file.name.split(".").pop()?.toUpperCase() || file.type || "";
//       const typeMatch = activeFileType ? fileTypeMap[activeFileType]?.includes(ext) : true;
//       const searchMatch = q ? file.name.toLowerCase().includes(q) : true;
//       return typeMatch && searchMatch;
//     });
//   }, [files, activeFileType, searchQuery]);

//   const formatFileSize = (bytes?: number) => {
//     if (!bytes) return "-";
//     const kb = bytes / 1024;
//     if (kb < 1024) return `${kb.toFixed(0)} KB`;
//     return `${(kb / 1024).toFixed(2)} MB`;
//   };

//   return (
//     <section aria-labelledby="all-files" className="space-y-3 sm:space-y-4">
//       <div className="flex items-center justify-between">
//         <h3 className="text-sm font-medium">All Files</h3>
//         <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#27272A] p-1 rounded-md">
//           <button onClick={() => setFileView("grid")} className={`p-1.5 rounded ${fileView === 'grid' ? 'bg-white' : ''}`} aria-label="Grid view">
//             <IoGridOutline />
//           </button>
//           <button onClick={() => setFileView("list")} className={`p-1.5 rounded ${fileView === 'list' ? 'bg-white' : ''}`} aria-label="List view">
//             <FaListUl />
//           </button>
//         </div>
//       </div>

//       {/* Type tabs (simple) */}
//       <div className="flex gap-2 overflow-x-auto pb-3">
//         <button onClick={() => setActiveFileType(null)} className={activeFileType === null ? 'bg-[#F4F4F5] px-3 py-1 rounded' : 'px-3 py-1 rounded'}>All Files</button>
//         {Object.keys(fileTypeMap).map((tab) => (
//           <button key={tab} onClick={() => setActiveFileType(activeFileType === tab ? null : tab)} className={activeFileType === tab ? 'bg-[#F4F4F5] px-3 py-1 rounded' : 'px-3 py-1 rounded'}>{tab}</button>
//         ))}
//       </div>

//       {fileView === "grid" ? (
//         <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 ${filteredFiles.length === 0 ? 'min-h-[200px] flex items-center justify-center' : ''}`}>
//           {filteredFiles.length === 0 ? (
//             <div className="col-span-full text-center py-8 text-gray-500">{activeFileType ? `No ${activeFileType.toLowerCase()} files found` : 'No files found'}</div>
//           ) : (
//             filteredFiles.map((file) => (
//               <div key={file.id} className="group relative flex items-center rounded-lg bg-[#F4F4F5] p-3 cursor-pointer">
//                 <div className="w-6 h-6 flex items-center justify-center">
//                   {/* small icon based on type - keep it simple */}
//                   <img src={file.type === 'PDF' ? '/Files/PDF-icon.svg' : '/Files/file.svg'} className="max-w-[34px] max-h-[34px] object-contain" alt="icon" />
//                 </div>
//                 <div className="flex-1 min-w-0 ml-2">
//                   <p className="truncate text-sm font-medium">{file.name}</p>
//                 </div>

//                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                   <DropdownMenu.Root>
//                     <DropdownMenu.Trigger asChild>
//                       <button className="p-1 text-gray-500 rounded">
//                         <MoreHorizontal />
//                       </button>
//                     </DropdownMenu.Trigger>
//                     <DropdownMenu.Portal>
//                       <DropdownMenu.Content align="end" className="min-w-[180px] bg-white dark:bg-[#09090B] rounded-md shadow-lg border p-1 z-50">
//                         <DropdownMenu.Item className="p-2">Star</DropdownMenu.Item>
//                         <DropdownMenu.Item className="p-2">Download</DropdownMenu.Item>
//                         <DropdownMenu.Item className="p-2 text-red-600" onSelect={() => onFileDelete && onFileDelete(file.id || file.name)}>
//                           Delete
//                         </DropdownMenu.Item>
//                       </DropdownMenu.Content>
//                     </DropdownMenu.Portal>
//                   </DropdownMenu.Root>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       ) : (
//         <div className="rounded-md">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead className="w-[30px]"></TableHead>
//                 <TableHead>Name</TableHead>
//                 <TableHead className="w-[70px]">Size</TableHead>
//                 <TableHead className="w-[100px]">Date Created</TableHead>
//                 <TableHead className="w-[40px]"></TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {filteredFiles.map((file) => (
//                 <TableRow key={file.id}>
//                   <TableCell>
//                     <input type="checkbox" className="w-4 h-4" />
//                   </TableCell>
//                   <TableCell>
//                     <div className="flex items-center gap-2">
//                       <img src={file.type === 'PDF' ? '/Files/PDF-icon.svg' : '/Files/file.svg'} className="h-[16px] w-[16px]" />
//                       <span className="truncate">{file.name}</span>
//                     </div>
//                   </TableCell>
//                   <TableCell>{formatFileSize(file.size)}</TableCell>
//                   <TableCell>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '-'}</TableCell>
//                   <TableCell>
//                     <div className="flex items-center justify-center">
//                       <DropdownMenu.Root>
//                         <DropdownMenu.Trigger asChild>
//                           <button className="p-1 text-gray-500 rounded">
//                             <MoreHorizontal />
//                           </button>
//                         </DropdownMenu.Trigger>
//                         <DropdownMenu.Portal>
//                           <DropdownMenu.Content align="end" className="min-w-[180px] bg-white dark:bg-[#09090B] rounded-md shadow-lg border p-1 z-50">
//                             <DropdownMenu.Item className="p-2">Star</DropdownMenu.Item>
//                             <DropdownMenu.Item className="p-2">Download</DropdownMenu.Item>
//                             <DropdownMenu.Item className="p-2 text-red-600" onSelect={() => onFileDelete && onFileDelete(file.id || file.name)}>
//                               Delete
//                             </DropdownMenu.Item>
//                           </DropdownMenu.Content>
//                         </DropdownMenu.Portal>
//                       </DropdownMenu.Root>
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </div>
//       )}
//     </section>
//   );
// }

// function formatFileSize(bytes?: number) {
//   if (!bytes) return "-";
//   const kb = bytes / 1024;
//   if (kb < 1024) return `${kb.toFixed(0)} KB`;
//   return `${(kb / 1024).toFixed(2)} MB`;
// }
