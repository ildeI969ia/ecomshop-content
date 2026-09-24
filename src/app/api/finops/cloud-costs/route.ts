import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { fetchCloudBillingSnapshot } from "@/server/services/cloud-billing";

let cachedSnapshot: { data: Awaited<ReturnType<typeof fetchCloudBillingSnapshot>>; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const GET = withAuthAndPermission("finops:view", async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  if (!forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.at < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedSnapshot.data,
      cached: true,
      cacheAgeSeconds: Math.floor((Date.now() - cachedSnapshot.at) / 1000),
    });
  }

  const projectId =
    process.env.GCP_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "ecomshop-marketing-prod";

  const snapshot = await fetchCloudBillingSnapshot(projectId);

  cachedSnapshot = { data: snapshot, at: Date.now() };

  return NextResponse.json({ ...snapshot, cached: false });
});
