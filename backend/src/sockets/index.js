export const setupSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client -> Server: join_group
    socket.on('join_group', (payload) => {
      if (payload && payload.group_id) {
        socket.join(payload.group_id);
        console.log(`Socket ${socket.id} joined group ${payload.group_id}`);
      }
    });

    // Client -> Server: leave_group
    socket.on('leave_group', (payload) => {
      if (payload && payload.group_id) {
        socket.leave(payload.group_id);
        console.log(`Socket ${socket.id} left group ${payload.group_id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
