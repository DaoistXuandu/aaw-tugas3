import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { lenses } from "./db/schema";
import { eq } from "drizzle-orm";

const lensSchema = t.Object({
  id: t.String({ format: "uuid" }),
  modelName: t.String(),
  manufacturerName: t.String(),
  minFocalLength: t.Number(),
  maxFocalLength: t.Number(),
  maxAperture: t.String(),
  mountType: t.String(),
  dayPrice: t.String(),
  weekendPrice: t.String(),
  description: t.Nullable(t.String()),
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
          title: "Suilens Catalog Service API",
          version: "1.0.0",
          description: "API katalog lensa untuk aplikasi Suilens.",
        },
        tags: [{ name: "Lenses" }, { name: "Health" }],
      },
    }),
  )
  .get(
    "/api/lenses",
    async () => {
      return db.select().from(lenses);
    },
    {
      detail: {
        tags: ["Lenses"],
        summary: "Ambil semua data lensa",
      },
      response: {
        200: t.Array(lensSchema),
      },
    },
  )
  .get(
    "/api/lenses/:id",
    async ({ params, set }) => {
      const results = await db
        .select()
        .from(lenses)
        .where(eq(lenses.id, params.id));
      if (!results[0]) {
        set.status = 404;
        return { error: "Lens not found" };
      }
      return results[0];
    },
    {
      detail: {
        tags: ["Lenses"],
        summary: "Ambil detail lensa berdasarkan ID",
      },
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: lensSchema,
        404: errorSchema,
      },
    },
  )
  .get(
    "/health",
    () => ({ status: "ok", service: "catalog-service" }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check catalog service",
      },
      response: {
        200: healthSchema,
      },
    },
  )
  .listen(3001);

console.log(`Catalog Service running on port ${app.server?.port}`);
