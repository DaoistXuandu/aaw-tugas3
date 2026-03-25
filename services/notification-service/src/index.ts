import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { eq, desc } from "drizzle-orm";
import { startConsumer } from "./consumer";
import { db } from "./db";
import { notifications } from "./db/schema";
import {
  broadcastNotification,
  registerSocket,
  unregisterSocket,
} from "./realtime";

const notificationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  orderId: t.String({ format: "uuid" }),
  type: t.String(),
  recipient: t.String({ format: "email" }),
  message: t.String(),
  sentAt: t.String(),
});

const errorSchema = t.Object({
  error: t.String(),
});

const healthSchema = t.Object({
  status: t.String(),
  service: t.String(),
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/openapi",
      documentation: {
        info: {
          title: "Suilens Notification Service API",
          version: "1.0.0",
          description:
            "API notifikasi Suilens. WebSocket real-time tersedia pada /ws/notifications.",
        },
        tags: [{ name: "Notifications" }, { name: "Health" }],
      },
    }),
  )
  .get(
    "/api/notifications",
    async () => {
      const rows = await db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.sentAt));

      return rows.map((row) => ({
        ...row,
        sentAt: row.sentAt.toISOString(),
      }));
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Ambil semua notifikasi",
      },
      response: {
        200: t.Array(notificationSchema),
      },
    },
  )
  .get(
    "/api/notifications/:id",
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, params.id));

      if (!result[0]) {
        set.status = 404;
        return { error: "Notification not found" };
      }

      return {
        ...result[0],
        sentAt: result[0].sentAt.toISOString(),
      };
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "Ambil detail notifikasi berdasarkan ID",
      },
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: notificationSchema,
        404: errorSchema,
      },
    },
  )
  .ws("/ws/notifications", {
    open(ws) {
      registerSocket(ws);
      ws.send(
        JSON.stringify({
          event: "connected",
          timestamp: new Date().toISOString(),
          message: "Connected to Suilens notifications stream",
        }),
      );
    },
    close(ws) {
      unregisterSocket(ws);
    },
  })
  .get(
    "/health",
    () => ({ status: "ok", service: "notification-service" }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check notification service",
      },
      response: {
        200: healthSchema,
      },
    },
  )
  .listen(3003);

await startConsumer({
  onNotificationCreated: (notification) => {
    broadcastNotification(notification);
  },
});

console.log(`Notification Service running on port ${app.server?.port}`);
