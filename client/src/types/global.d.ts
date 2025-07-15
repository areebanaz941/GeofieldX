// src/types/global.d.ts
import Map from 'ol/Map';

declare global {
  interface Window {
    olMap: Map | null;
  }
}

declare module 'shpjs' {
  export function parseShp(buffer: ArrayBuffer): Promise<any>;
  export function parseDbf(buffer: ArrayBuffer): Promise<any>;
  export function combine(arrOfObj: any[]): any;
}

export {};