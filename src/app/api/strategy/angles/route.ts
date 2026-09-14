import { NextResponse } from "next/server";
import { generateStrategicAngles } from "@/lib/gemini-agent";

export async function POST(req: Request) {
  try {
    const { topicTitle, category, apiKey } = await req.json();
    if (!topicTitle) {
      return NextResponse.json({ error: "Falta el título del tema" }, { status: 400 });
    }

    const angles = await generateStrategicAngles(topicTitle, category || "engenius", apiKey);
    return NextResponse.json({ angles });
  } catch (error) {
    console.error("Error generating strategic angles:", error);
    return NextResponse.json({ error: "Error al generar ángulos estratégicos" }, { status: 500 });
  }
}
