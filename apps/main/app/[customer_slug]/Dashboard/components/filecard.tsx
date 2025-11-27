// import { cn } from "@/lib/utils";
// import { Folder } from "lucide-react";

// type Tone = "blue" | "red" | "amber" | "neutral";

// const toneClasses: Record<Tone, { badge: string; icon: string; ring: string }> =
//   {
//     blue: {
//       badge: "bg-[oklch(var(--chart-3))]/20 text-[oklch(var(--chart-3))]",
//       icon: "text-[oklch(var(--chart-3))]",
//       ring: "ring-[oklch(var(--chart-3))]/30",
//     },
//     red: {
//       badge:
//         "bg-[oklch(var(--destructive))]/15 text-[oklch(var(--destructive))]",
//       icon: "text-[oklch(var(--destructive))]",
//       ring: "ring-[oklch(var(--destructive))]/30",
//     },
//     amber: {
//       badge: "bg-[oklch(var(--chart-4))]/20 text-[oklch(var(--chart-4))]",
//       icon: "text-[oklch(var(--chart-4))]",
//       ring: "ring-[oklch(var(--chart-4))]/30",
//     },
//     neutral: {
//       badge: "bg-muted text-muted-foreground",
//       icon: "text-muted-foreground",
//       ring: "ring-border/40",
//     },
//   };

// export function FileCard({
//   title,
//   meta,
//   tone = "neutral",
// }: {
//   title: string;
//   meta: string;
//   tone?: Tone;
// }) {
//   const t = toneClasses[tone];
//   return (
//     <article
//       className={cn(
//         "flex h-full flex-col items-center justify-between rounded-md bg-muted p-4 ring-1",
//         t.ring
//       )}
//       aria-label={title}
//     >
//       <div
//         className={cn(
//           "mb-4 grid size-16 place-items-center rounded-md bg-background",
//           t.ring
//         )}
//       >
//         <Folder className={cn("size-7", t.icon)} aria-hidden="true" />
//         <span className="sr-only">Folder</span>
//       </div>

//       <div className="flex w-full flex-col items-center gap-1 text-center">
//         <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
//           {title}
//         </h3>
//         <p className="text-[11px] leading-4 text-muted-foreground">{meta}</p>
//       </div>

//       <div
//         className={cn(
//           "mt-3 rounded px-2 py-0.5 text-[10px] leading-5",
//           t.badge
//         )}
//       >
//         Recently visited
//       </div>
//     </article>
//   );
// }
