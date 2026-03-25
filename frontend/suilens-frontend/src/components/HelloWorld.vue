<template>
  <v-container class="py-8" max-width="800">
    <v-card>
      <v-card-title>Live Order Notifications</v-card-title>
      <v-divider></v-divider>

      <v-card-text class="py-6" style="min-height: 500px">
        <v-alert
          v-if="connectionError"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          {{ connectionError }}
        </v-alert>

        <v-chip
          size="small"
          :color="isConnected ? 'success' : 'grey-darken-1'"
          variant="flat"
          class="mb-4"
        >
          {{ isConnected ? "WebSocket connected" : "WebSocket disconnected" }}
        </v-chip>

        <div
          v-if="notifications.length === 0"
          class="text-center text-grey py-8"
        >
          <p class="text-sm">No notifications yet</p>
        </div>

        <div v-else>
          <div
            v-for="(notification, index) in notifications"
            :key="index"
            class="mb-4 pb-4"
            :style="
              index < notifications.length - 1
                ? 'border-bottom: 1px solid #eee;'
                : ''
            "
          >
            <p class="text-sm ma-0">
              {{ notification.message }}
            </p>
            <p class="text-xs text-grey-darken-1 mt-1">
              {{ formatTime(notification.sentAt) }}
            </p>
          </div>
        </div>
      </v-card-text>

      <v-divider v-if="notifications.length > 0"></v-divider>
      <v-card-actions v-if="notifications.length > 0">
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" @click="clearNotifications">
          Clear
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const API_BASE = import.meta.env.VITE_NOTIFICATION_API || "http://localhost:3003";
const WS_URL = import.meta.env.VITE_NOTIFICATION_WS || toWsUrl(API_BASE);

function toWsUrl(httpUrl) {
  if (httpUrl.startsWith("https://")) {
    return `${httpUrl.replace("https://", "wss://")}/ws/notifications`;
  }
  return `${httpUrl.replace("http://", "ws://")}/ws/notifications`;
}

let socket;

const notifications = ref([]);
const isConnected = ref(false);
const connectionError = ref("");

async function loadInitialNotifications() {
  try {
    const response = await fetch(`${API_BASE}/api/notifications`);
    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }
    const data = await response.json();
    notifications.value = data;
  } catch {
    connectionError.value = "Gagal memuat notifikasi awal dari server.";
  }
}

function connectWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    isConnected.value = true;
    connectionError.value = "";
  };

  socket.onclose = () => {
    isConnected.value = false;
  };

  socket.onerror = () => {
    connectionError.value = "Koneksi WebSocket bermasalah. Cek notification-service.";
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.event === "notification.created" && payload.data) {
        notifications.value.unshift(payload.data);
      }
    } catch {
      // Ignore non-JSON websocket payloads.
    }
  };
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clearNotifications() {
  notifications.value = [];
}

onMounted(async () => {
  await loadInitialNotifications();
  connectWebSocket();
});

onBeforeUnmount(() => {
  socket?.close();
});
</script>
