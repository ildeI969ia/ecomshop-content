/**
 * Phase 05B — Storage & Asset Security Tests (contrato HONESTO)
 *
 * Este archivo sustituye la versión anterior que certificaba un contrato falso:
 * llamaba a uploadFile() y sólo comprobaba mimeType/storagePath, por lo que
 * pasaba en verde aunque el binario NO se hubiera subido a ningún sitio.
 *
 * Ahora se verifica la regla de oro: si el objeto no está en GCS, uploadFile
 * LANZA StorageProviderError (nunca devuelve una publicUrl fabricada).
 *
 * Ejecución:
 *   npx tsx scripts/test-phase-05b-storage.ts
 *   $env:RUN_GCS_INTEGRATION=1; npx tsx scripts/test-phase-05b-storage.ts   # roundtrip real
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AssetSchema, Asset } from "../src/server/domain/types.ts";
import {
  GoogleCloudStorageProvider,
  StorageProviderError,
  classifyStorageError,
  normalizeObjectPath,
  DEFAULT_GCS_BUCKET_NAME,
} from "../src/server/services/storage-provider.ts";

const RUN_INTEGRATION = process.env.RUN_GCS_INTEGRATION === "1";

describe("Phase 05B — Storage & Asset Security (contrato honesto)", () => {
  it("valida el esquema Asset y sus campos requeridos", () => {
    const asset: Asset = {
      id: "asset-101",
      workspaceId: "default-ecomspain",
      filename: "rack_hotel_marbella.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 102400,
      storagePath: "workspaces/default-ecomspain/assets/asset-101_rack.jpg",
      publicUrl: `https://storage.googleapis.com/${DEFAULT_GCS_BUCKET_NAME}/workspaces/default-ecomspain/assets/asset-101_rack.jpg`,
      type: "image",
      campaignId: "camp-001",
      aiGenerated: false,
      ownerId: "user-carlos",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "user-carlos",
      updatedBy: "user-carlos",
    };

    const parsed = AssetSchema.safeParse(asset);
    assert.equal(parsed.success, true);
  });

  it("neutraliza path traversal al normalizar rutas", () => {
    assert.equal(normalizeObjectPath("../../etc/passwd", DEFAULT_GCS_BUCKET_NAME), "etc/passwd");
    assert.ok(!normalizeObjectPath("../x/../y.png", DEFAULT_GCS_BUCKET_NAME).includes(".."));
  });

  it("normaliza gs:// y URLs públicas al objeto del bucket", () => {
    const bucket = DEFAULT_GCS_BUCKET_NAME;
    assert.equal(
      normalizeObjectPath(`gs://${bucket}/workspaces/ws/assets/a.jpg`, bucket),
      "workspaces/ws/assets/a.jpg"
    );
    assert.equal(
      normalizeObjectPath(`https://storage.googleapis.com/${bucket}/workspaces/ws/assets/a.jpg`, bucket),
      "workspaces/ws/assets/a.jpg"
    );
    // URL externa (stock de terceros): no es gestionable por nuestro bucket
    assert.equal(normalizeObjectPath("https://images.unsplash.com/photo-123", bucket), "");
  });

  it("clasifica errores de Storage en causas accionables", () => {
    const notFound = classifyStorageError({ code: 404, message: "The specified bucket does not exist." });
    assert.equal(notFound.kind, "BUCKET_NOT_FOUND");
    assert.ok(notFound.hint.includes("gcloud storage buckets create"));

    assert.equal(classifyStorageError({ code: 403, message: "Forbidden" }).kind, "PERMISSION_DENIED");
    assert.equal(
      classifyStorageError(new Error("Could not load the default credentials. Browse to ...")).kind,
      "NO_CREDENTIALS"
    );
    assert.equal(classifyStorageError(new Error("algo raro")).kind, "UNKNOWN");
  });

  it("RECHAZA la subida si el bucket no existe (antes devolvía una URL fabricada)", async () => {
    const previous = process.env.GCS_BUCKET_NAME;
    const bogusBucket = `ecomshop-nonexistent-probe-${Date.now()}`;
    process.env.GCS_BUCKET_NAME = bogusBucket;

    try {
      const provider = new GoogleCloudStorageProvider();
      assert.equal(provider.getBucketName(), bogusBucket);

      await assert.rejects(
        () =>
          provider.uploadFile({
            buffer: Buffer.from("contenido de prueba"),
            destinationPath: "probe/test.txt",
            mimeType: "text/plain",
          }),
        (err: unknown) => {
          assert.ok(err instanceof StorageProviderError, "debe lanzar StorageProviderError");
          assert.ok(
            ["UPLOAD_FAILED", "VERIFY_FAILED", "STORAGE_UNAVAILABLE"].includes(err.code),
            `código inesperado: ${err.code}`
          );
          return true;
        }
      );
    } finally {
      if (previous === undefined) delete process.env.GCS_BUCKET_NAME;
      else process.env.GCS_BUCKET_NAME = previous;
    }
  });

  it("rechaza buffers vacíos y rutas inválidas sin tocar la red", async () => {
    const provider = new GoogleCloudStorageProvider();

    await assert.rejects(
      () => provider.uploadFile({ buffer: Buffer.alloc(0), destinationPath: "x/y.txt", mimeType: "text/plain" }),
      (err: unknown) => err instanceof StorageProviderError && err.code === "UPLOAD_FAILED"
    );

    await assert.rejects(
      () => provider.uploadFile({ buffer: Buffer.from("x"), destinationPath: "   ", mimeType: "text/plain" }),
      (err: unknown) => err instanceof StorageProviderError && err.code === "UPLOAD_FAILED"
    );
  });

  it("la sonda de salud nunca lanza y reporta el estado real", async () => {
    const provider = new GoogleCloudStorageProvider();
    const health = await provider.checkStorageHealth();

    assert.equal(health.bucketName, provider.getBucketName());
    assert.equal(typeof health.reachable, "boolean");
    if (!health.reachable) {
      assert.ok(health.error?.message, "debe incluir el error de la sonda");
    }
  });

  it(
    "[integración] sube, verifica por tamaño y borra un objeto real",
    { skip: RUN_INTEGRATION ? false : "define RUN_GCS_INTEGRATION=1 para ejecutar" },
    async () => {
      const provider = new GoogleCloudStorageProvider();
      const objectPath = `_health/integration-${Date.now()}.txt`;
      const payload = Buffer.from(`ecomshop integration probe ${new Date().toISOString()}`);

      const result = await provider.uploadFile({
        buffer: payload,
        destinationPath: objectPath,
        mimeType: "text/plain",
        cacheControl: "no-store",
      });

      assert.equal(result.verified, true, "la subida debe quedar verificada");
      assert.equal(result.sizeBytes, payload.length);
      assert.equal(result.storagePath, objectPath);
      assert.ok(result.publicUrl?.includes(objectPath), "publicUrl debe apuntar al objeto");

      assert.equal(await provider.deleteFile(objectPath), true);
      // Idempotente: borrar algo que ya no existe no es un error
      assert.equal(await provider.deleteFile(objectPath), true);
    }
  );
});
