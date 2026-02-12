import type { Server } from "socket.io";

export function attachRealtime(io: Server) {
  io.on("connection", (socket) => {
    socket.on("join_event", ({ eventId }) => {
      socket.join(`event:${eventId}`);
    });

    socket.on("leave_event", ({ eventId }) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on("disconnect", () => {});
  });
}

// Helper broadcaster used by services
export function broadcastEvent(io: Server, eventId: string, eventName: string, payload: any) {
  io.to(`event:${eventId}`).emit(eventName, payload);
}
