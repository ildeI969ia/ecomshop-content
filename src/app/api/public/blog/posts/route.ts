import { NextRequest, NextResponse } from "next/server";
import { getPublishedBlogPosts } from "@/lib/blog/public-blog-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const posts = await getPublishedBlogPosts(limit);

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("[api/public/blog/posts] Error al obtener posts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron cargar los artículos del blog."
      },
      { status: 500 }
    );
  }
}
