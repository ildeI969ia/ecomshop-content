import { MetadataRoute } from "next";
import { getPublishedBlogPosts } from "@/lib/blog/public-blog-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ecomshop.es";

  // Rutas estáticas clave
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7
    }
  ];

  try {
    const posts = await getPublishedBlogPosts(100);
    const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt || post.createdAt),
      changeFrequency: "weekly",
      priority: 0.8
    }));

    return [...staticRoutes, ...postRoutes];
  } catch (error) {
    console.error("[sitemap] Error generating dynamic sitemap:", error);
    return staticRoutes;
  }
}
