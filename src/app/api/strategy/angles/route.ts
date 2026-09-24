import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { generateStrategicAngles } from "@/lib/gemini-agent";

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest) => {
  try {
    const { topicTitle, category } = await req.json();
    if (!topicTitle) {
      return NextResponse.json({ error: "Falta el título del tema" }, { status: 400 });
    }

    const angles = await generateStrategicAngles(topicTitle, category || "engenius");
    return NextResponse.json({ angles });
  } catch (error) {
    console.error("Error generating strategic angles:", error);
    return NextResponse.json({ error: "Error al generar ángulos estratégicos" }, { status: 500 });
  }
});
