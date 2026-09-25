import { NextRequest, NextResponse } from "next/server";
import { UtmClickRepository, UtmClickRecord } from "@/server/repositories/utm-click-repository";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { channel, pieceId, slug, utmSource, utmMedium } = json;

    if (!channel || !slug) {
      return NextResponse.json({ error: "channel y slug son obligatorios" }, { status: 400 });
    }

    const clickRepo = new UtmClickRepository();
    const clickRecord: UtmClickRecord = {
      id: `click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel,
      pieceId: pieceId || slug,
      slug,
      utmSource: utmSource || channel,
      utmMedium: utmMedium || "link_click",
      timestamp: new Date().toISOString()
    };

    await clickRepo.recordClick(clickRecord);

    return NextResponse.json({ success: true, clickId: clickRecord.id });
  } catch (err: any) {
    console.error("[API TrackUTMClick] Error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
