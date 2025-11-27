// import React from "react";
// import { LuClock } from "react-icons/lu";
// import type {FileItem} from "@/app/Dashboard/components/filegrid";

// interface RecentItem {
//   id: string;
//   name: string;
//   type: string;
//   isFolder: boolean;
//   visitedAt: Date;
// }

// interface Props {
//   recentlyVisited: RecentItem[];
//   folders: Array<{ id: string; name: string; fileCount: number }>;
//   files: FileItem[];
//   onFolderSelect?: (f: { id: string; name: string; fileCount: number }) => void;
//   onFileSelect?: (f: FileItem) => void;
// }

// export default function RecentlyVisited({ recentlyVisited, folders, files, onFolderSelect, onFileSelect }: Props) {
//   if (!recentlyVisited || recentlyVisited.length === 0) return null;

//   return (
//     <section aria-labelledby="recently-visited" className="mb-6 sm:mb-10">
//       <h2 id="recently-visited" className="mb-4 sm:mb-6 flex gap-2 text-sm font-medium text-muted-foreground">
//         <LuClock className="size-4 text-muted-foreground" />
//         Recently visited
//       </h2>

//       <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible">
//         {recentlyVisited.slice(0, 4).map((item, index) => {
//           const imageSrc = item.isFolder ? "/BigFolder.svg" : "/RecentFiles/rSVG.svg";

//           const now = new Date();
//           const diffInHours = Math.floor((now.getTime() - new Date(item.visitedAt).getTime()) / (1000 * 60 * 60));
//           let timeAgo = "Just now";
//           if (diffInHours === 1) timeAgo = "1 hour ago";
//           else if (diffInHours < 24) timeAgo = `${diffInHours} hours ago`;
//           else if (diffInHours < 48) timeAgo = "1 day ago";
//           else timeAgo = `${Math.floor(diffInHours / 24)} days ago`;

//           const actionText = item.isFolder ? "Opened" : index === 3 ? "Last updated" : "Opened";

//           return (
//             <div key={item.id} className="flex flex-col items-center w-[180px] h-[170px] rounded-lg border bg-[#F4F4F5] cursor-pointer p-[12px] gap-[20px]" onClick={() => {
//               if (item.isFolder) {
//                 const folder = folders.find((f) => f.id === item.id);
//                 if (folder && onFolderSelect) onFolderSelect(folder);
//               } else {
//                 const file = files.find((f) => f.id === item.id);
//                 if (file && onFileSelect) onFileSelect(file);
//               }
//             }}>
//               <div className="flex items-center justify-center w-[156px] h-[90px] rounded-lg bg-[#E5E7EB] p-[10px]">
//                 <img src={imageSrc} alt={item.isFolder ? "Folder" : "File"} className="w-[78px] h-[78px] object-contain" />
//               </div>
//               <div className="w-[156px] h-[36px] flex flex-col items-center justify-center">
//                 <p className="text-xs sm:text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
//                 <p className="text-xs text-muted-foreground">{actionText} {timeAgo}</p>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </section>
//   );
// }
