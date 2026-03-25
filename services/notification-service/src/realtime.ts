export interface NotificationEvent {
    id: string;
    orderId: string;
    type: string;
    recipient: string;
    message: string;
    sentAt: string;
}

const sockets = new Set<{ send: (data: string) => void }>();

export function registerSocket(socket: { send: (data: string) => void }) {
    sockets.add(socket);
}

export function unregisterSocket(socket: { send: (data: string) => void }) {
    sockets.delete(socket);
}

export function broadcastNotification(notification: NotificationEvent) {
    const payload = JSON.stringify({
        event: "notification.created",
        data: notification,
        timestamp: new Date().toISOString(),
    });

    for (const socket of sockets) {
        socket.send(payload);
    }
}
