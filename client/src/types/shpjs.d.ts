// src/types/shpjs.d.ts
declare module 'shpjs' {
  /**
   * Parse a .shp buffer into GeoJSON
   */
  export function parseShp(buffer: ArrayBuffer): Promise<any>;
  
  /**
   * Parse a .dbf buffer into a JSON object
   */
  export function parseDbf(buffer: ArrayBuffer): Promise<any>;
  
  /**
   * Combine a parsed .shp file and a parsed .dbf file
   */
  export function combine(arrOfObj: any[]): any;
}