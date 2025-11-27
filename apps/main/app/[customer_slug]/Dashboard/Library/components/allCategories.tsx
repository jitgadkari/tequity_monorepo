// import React from "react";
// import { IoGridOutline } from "react-icons/io5";
// import { FaListUl } from "react-icons/fa";

// interface Folder {
//   id: string;
//   name: string;
//   fileCount: number;
// }

// interface Props {
//   folders: Folder[];
//   onFolderSelect?: (folder: Folder) => void;
// }

// export default function LibraryAllCategories({ folders, onFolderSelect }: Props) {
//   const [folderView, setFolderView] = React.useState<"grid" | "list">("grid");

//   return (
//     <section aria-labelledby="all-folders" className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <button onClick={() => setFolderView(folderView === 'grid' ? 'list' : 'grid')} className="flex items-center gap-2 p-2 rounded-md text-sm font-medium">
//             All Categories
//           </button>
//         </div>
//         <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
//           <button onClick={() => setFolderView('grid')} className={`p-1.5 rounded ${folderView === 'grid' ? 'bg-white' : ''}`} aria-label="Grid view"><IoGridOutline /></button>
//           <button onClick={() => setFolderView('list')} className={`p-1.5 rounded ${folderView === 'list' ? 'bg-white' : ''}`} aria-label="List view"><FaListUl /></button>
//         </div>
//       </div>

//       {folderView === "grid" ? (
//         <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3">
//           {folders.map((folder) => (
//             <div key={folder.id} onClick={() => onFolderSelect && onFolderSelect(folder)} className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 cursor-pointer">
//               <img src="/Folder.svg" alt="Folder" className="h-[20px] w-[20px]" />
//               <div className="flex-1 min-w-0">
//                 <p className="truncate text-sm font-medium">{folder.name}</p>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <div className="rounded-md">
//           <div className="space-y-2">
//             {folders.map((folder) => (
//               <div key={folder.id} onClick={() => onFolderSelect && onFolderSelect(folder)} className="flex items-center gap-3 p-3 rounded cursor-pointer">
//                 <img src="/Folder.svg" alt="Folder" className="h-[16px] w-[16px]" />
//                 <div className="flex-1 min-w-0">
//                   <p className="truncate font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{folder.name}</p>
//                 </div>
//                 <div className="text-gray-500 text-xs">{folder.fileCount} items</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </section>
//   );
// }

