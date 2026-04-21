/// <reference types="vite/client" />

declare module '*.vert' {
  const value: string;
  export default value;
}

declare module '*.frag' {
  const value: string;
  export default value;
}

declare module 'alea' {
  export default function alea(seed: string | number): () => number;
}
