// SVG module declarations for TypeScript
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '@/public/*.svg' {
  const content: string;
  export default content;
}
