### Dokumentasi screenshot
Semua tugas ini dijalankan melalui terminal utama yang tersambung dengan kubernetes melalui kubeconfig dengan spesifikasi 3 VM Linux (1 Control dan 2 Worker).

Selain itu untuk OpenAPI dilihat melalui port forwarding dari laman vm ke mesin utama
[forwarding-1](./docs/forwarding-1.png)
[forwarding-2](./docs/forwarding-2.png)
[forwarding-3](./docs/forwarding-3.png)
[forwarding-4](./docs/forwarding-4.png)

#### OpenAPI Catalog Service
[catalog-1](./docs/catalog-1.png)
[catalog-2](./docs/catalog-2.png)
[catalog-3](./docs/catalog-3.png)

#### OpenAPI Order Service
[order-1](./docs/order-1.png)
[order-2](./docs/order-2.png)
[order-3](./docs/order-3.png)
[order-4](./docs/order-4.png)

#### OpenAPI Notification Service

[notif-1](./docs/notif-1.png)
[notif-2](./docs/notif-2.png)
[notif-3](./docs/notif-3.png)

#### `kubectl get pods -o wide -n suilens-2306152506`
[notif-3](./docs/wide.png)

#### `kubectl get all -n suilens-2306152506`
[notif-3](./docs/all.png)

#### `Frontend belum ada order`
[web-1](./docs/web-0.png)
#### `Frontend sudah ada order`
[web-2](./docs/web-1.png)


# suilens-microservice-tutorial

Microservices tutorial implementation for Assignment 1 Part 2.2.

## Kubernetes Deployment (1 Control Plane + 2 Worker)

Bagian ini berjalan pada 3 VM Linux (1 Control dan 2 Worker). Selain itu, dalam kasus ini saya membuat worker-2 dengan besar storage 13GB dan membagi load services ke kedua worker tanpa replika

### 1. Inisiasi cluster (kubeadm)
Sebagaimana dilakukan pada tutorial

### 2. Build dan push image aplikasi
```bash
export REGISTRY=raihanakbartampansekali

docker build -t $REGISTRY/suilens-catalog-service:latest ./services/catalog-service
docker build -t $REGISTRY/suilens-order-service:latest ./services/order-service
docker build -t $REGISTRY/suilens-notification-service:latest ./services/notification-service
docker build -t $REGISTRY/suilens-frontend:latest ./frontend/suilens-frontend

docker push $REGISTRY/suilens-catalog-service:latest
docker push $REGISTRY/suilens-order-service:latest
docker push $REGISTRY/suilens-notification-service:latest
docker push $REGISTRY/suilens-frontend:latest
```

### 4. Deploy ke namespace `suilens-2306152506`
Ambil kubeconfig dari control-plane dan masukkan pada file `~/.kube/config-suilens` lalu export tersebut sebagai config.
```bash
export KUBECONFIG=~/.kube/config-suilens
```
### 3. Deploy ke namespace `suilens-2306152506`

```bash
export NPM=2306152506
export NS=suilens-2306152506
export REGISTRY=raihanakbartampansekali

kubectl create namespace $NS

sed "s|REPLACE_WITH_REGISTRY|$REGISTRY|g" k8s/suilens.yaml | kubectl apply -n $NS -f -
kubectl wait --for=condition=available --timeout=300s deployment --all -n $NS
kubectl wait --for=condition=complete --timeout=180s job/catalog-seed -n $NS
```

Verifikasi deployment:

```bash
kubectl get all -n $NS
kubectl get pods -o wide -n $NS
```

### 4. Akses OpenAPI services dari local machine

```bash
kubectl port-forward svc/catalog-service 3001:3001 -n $NS
kubectl port-forward svc/order-service 3002:3002 -n $NS
kubectl port-forward svc/notification-service 3003:3003 -n $NS
kubectl port-forward svc/frontend 5173:5173 -n $NS
```

Buka:

- `http://localhost:3001/openapi`
- `http://localhost:3002/openapi`
- `http://localhost:3003/openapi`
- `http://localhost:5173`

## Run

```bash
docker compose up --build -d
```

## Migrate + Seed (from host)

```bash
(cd services/catalog-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/order-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/notification-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/catalog-service && bun run src/db/seed.ts)
```

## Smoke Test

```bash
curl http://localhost:3001/api/lenses | jq
LENS_ID=$(curl -s http://localhost:3001/api/lenses | jq -r '.[0].id')

curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Raihan Akbar",
    "customerEmail": "2306152506@gmail.com",
    "lensId": "'"$LENS_ID"'",
    "startDate": "2025-03-01",
    "endDate": "2025-03-05"
  }' | jq

docker compose logs notification-service --tail 20
```

## OpenAPI Docs

Setiap service sekarang menyediakan dokumentasi OpenAPI/Swagger UI di endpoint berikut:

- Catalog Service: `http://localhost:3001/openapi`
- Order Service: `http://localhost:3002/openapi`
- Notification Service: `http://localhost:3003/openapi`

## WebSocket Notifications

Notification service menyediakan stream WebSocket real-time di:

- `ws://localhost:3003/ws/notifications`

Frontend sudah otomatis terhubung ke stream ini dan akan menampilkan notifikasi baru saat ada event `order.placed`.

## Stop

```bash
docker compose down
```
