import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

/**
 * Global Type Definitions & Module Augmentations
 * Proje genelindeki custom tipleri ve Node.js/Nitro built-in objelerine
 * yaptığımız eklentileri (augmentation) burada tanımlıyoruz.
 */

declare global {
  // NOTE: Socket.io instance'ını tüm API route'larından (Nitro) erişilebilir
  // kılmak ve dev ortamında HMR (Hot Module Replacement) sırasında multiple instance 
  // oluşumunu (memory leak) engellemek için global scope'a attach ediyoruz.
  var $io: Server;
}

// Module Augmentation: Node.js'in native HTTP Server interface'ini extend ediyoruz.
declare module 'http' {
  interface Server {
    // TypeScript compiler'ın "Property 'io' does not exist on type 'Server'" 
    // hatasını suppress etmek ve type-safety sağlamak için custom property tanımı.
    io?: Server; 
  }
}

// Bu dosyanın bir module olarak algılanması için boş export atıyoruz (TS Requirement)
export {};