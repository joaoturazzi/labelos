import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, artists, artistPosts, artistInsights } from "@/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, ownerId))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = (page - 1) * limit;
    const artistIdsParam = searchParams.get("artistIds");
    const platformsParam = searchParams.get("platforms");
    const onlyInsights = searchParams.get("onlyInsights") === "true";

    // Get artist IDs for this label
    let labelArtistIds: string[];
    const allArtists = await db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(eq(artists.labelId, label.id));

    if (artistIdsParam) {
      const filterIds = artistIdsParam.split(",");
      labelArtistIds = allArtists
        .filter((a) => filterIds.includes(a.id))
        .map((a) => a.id);
    } else {
      labelArtistIds = allArtists.map((a) => a.id);
    }

    if (labelArtistIds.length === 0) {
      return NextResponse.json({ items: [], hasMore: false, artists: [] });
    }

    const platformFilter = platformsParam?.split(",").filter(Boolean);

    // Fetch posts
    let posts: Record<string, unknown>[] = [];
    if (!onlyInsights) {
      let postsQuery = db
        .select()
        .from(artistPosts)
        .where(
          and(
            eq(artistPosts.labelId, label.id),
            inArray(artistPosts.artistId, labelArtistIds),
            ...(platformFilter && platformFilter.length > 0
              ? [inArray(artistPosts.platform, platformFilter)]
              : [])
          )
        )
        .orderBy(desc(artistPosts.postedAt), desc(artistPosts.collectedAt))
        .limit(limit + 10)
        .offset(offset);

      const postResults = await postsQuery;
      posts = postResults.map((p) => ({
        ...p,
        _type: "post" as const,
        _sortDate: p.postedAt || p.collectedAt,
      }));
    }

    // Fetch insights
    const insightResults = await db
      .select()
      .from(artistInsights)
      .where(
        and(
          eq(artistInsights.labelId, label.id),
          inArray(artistInsights.artistId, labelArtistIds)
        )
      )
      .orderBy(desc(artistInsights.generatedAt))
      .limit(limit)
      .offset(offset);

    const insights = insightResults.map((i) => ({
      ...i,
      _type: "insight" as const,
      _sortDate: i.generatedAt,
    }));

    // Merge and sort by date
    const combined = [...posts, ...insights]
      .sort((a, b) => {
        const dateA = new Date(a._sortDate as string || 0).getTime();
        const dateB = new Date(b._sortDate as string || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);

    // Build artist name map
    const artistMap: Record<string, string> = {};
    for (const a of allArtists) {
      artistMap[a.id] = a.name;
    }

    return NextResponse.json({
      items: combined,
      hasMore: combined.length === limit,
      artists: allArtists,
      artistMap,
    });
  } catch (err) {
    console.error("GET /api/feed error:", err);
    return NextResponse.json({ error: "Erro ao buscar feed" }, { status: 500 });
  }
}
