import { Server } from "socket.io";

/**
 * Socket.io Engine Middleware
 * NOTE: Nitro server katmanında WebSocket desteğini initialize ediyoruz.
 * Singleton pattern kullanarak uygulamanın tüm katmanlarından $io instance'ına erişim sağlıyoruz.
 */

let io: Server;

export default defineEventHandler((event) => {
  // @ts-ignore
  if (!globalThis.$io) {
    // Extract native HTTP server from Nitro event context
    // @ts-ignore
    const httpServer = event.node.res.socket?.server;
    
    if (httpServer && !httpServer.io) {
      io = new Server(httpServer, {
        path: "/socket.io", // Default transport path
        cors: { 
          origin: "*", // NOTE: Production aşamasında burası domain bazlı kısıtlanmalıdır.
          methods: ["GET", "POST"] 
        }
      });

      // NOTE: Global scope'a attach ederek API route'larından (Nitro) erişimi enable ediyoruz.
      // @ts-ignore
      globalThis.$io = io;
      httpServer.io = io;

      io.on("connection", (socket) => {
        console.log(`🔌 [Socket] New connection established: ${socket.id}`);

        /**
         * Event: time-selected
         * Client bir slotu tıkladığında (inceleme aşaması), diğer client'lara 'soft-lock' broadcast eder.
         */
        socket.on("time-selected", (data) => {
          // NOTE: Socket state içinde seçili saati cache'liyoruz (disconnect durumunda release etmek için).
          socket.data.selectedTime = data; 
          socket.broadcast.emit("time-selected", data);
        });

        /**
         * Event: time-cleared
         * Client seçimi manuel olarak bıraktığında veya randevuyu tamamladığında kilidi kaldırır.
         */
        socket.on("time-cleared", (data) => {
          socket.data.selectedTime = null;
          socket.broadcast.emit("time-cleared", data);
        });

        /**
         * Event: disconnect
         * NOTE: Graceful cleanup logic.
         * Eğer kullanıcı randevuyu onaylamadan sekmeyi kapatırsa veya bağlantısı koparsa,
         * rezerve ettiği (sarı) slotun kilitli kalmaması için otomatik olarak release ediyoruz.
         */
        socket.on("disconnect", () => {
          if (socket.data.selectedTime) {
            console.log(`🧹 [Socket] Auto-clearing locked slot for disconnected client: ${socket.id}`);
            socket.broadcast.emit("time-cleared", socket.data.selectedTime);
          }
          console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
        });
      });

      console.log("✅ [Socket] Engine initialized and ready to serve.");
    }
  }
});