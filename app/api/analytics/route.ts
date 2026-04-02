import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, submissions } from "@/db/schema";
import { eq, desc, sql, and, gte, count } from "drizzle-orm";

export async function GET() {
  try {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, ownerId))
      .limit(1);

    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const allSubs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.labelId, label.id))
      .orderBy(desc(submissions.submittedAt));

    const now = new Date();

    // 1. Submissions per week (last 12 weeks)
    const weeklyData: { week: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekCount = allSubs.filter((s) => {
        if (!s.submittedAt) return false;
        const d = new Date(s.submittedAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeklyData.push({
        week: weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        count: weekCount,
      });
    }

    // 2. Status breakdown
    const statusCounts = {
      pending: 0,
      reviewing: 0,
      approved: 0,
      rejected: 0,
    };
    for (const s of allSubs) {
      const st = (s.status || "pending") as keyof typeof statusCounts;
      if (st in statusCounts) statusCounts[st]++;
    }

    // 3. Average AI score over time (monthly)
    const monthlyScores: { month: string; avg: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthSubs = allSubs.filter((s) => {
        if (!s.submittedAt || s.aiScore === null) return false;
        const d = new Date(s.submittedAt);
        return d >= monthStart && d < monthEnd;
      });

      const avg =
        monthSubs.length > 0
          ? Math.round(monthSubs.reduce((sum, s) => sum + (s.aiScore || 0), 0) / monthSubs.length)
          : 0;

      monthlyScores.push({
        month: monthStart.toLocaleDateString("pt-BR", { month: "short" }),
        avg,
        count: monthSubs.length,
      });
    }

    // 4. Genre distribution
    const genreCounts: Record<string, number> = {};
    for (const s of allSubs) {
      const genres = (s.genre || "Não informado").split(",").map((g) => g.trim());
      for (const g of genres) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
    const genreData = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // 5. Average time to decision (in hours)
    const decidedSubs = allSubs.filter(
      (s) => s.reviewedAt && s.submittedAt && (s.status === "approved" || s.status === "rejected")
    );
    const avgDecisionHours =
      decidedSubs.length > 0
        ? Math.round(
            decidedSubs.reduce((sum, s) => {
              const diff = new Date(s.reviewedAt!).getTime() - new Date(s.submittedAt!).getTime();
              return sum + diff / (1000 * 60 * 60);
            }, 0) / decidedSubs.length
          )
        : null;

    // 6. Summary stats
    const totalSubs = allSubs.length;
    const avgScore =
      allSubs.filter((s) => s.aiScore !== null).length > 0
        ? Math.round(
            allSubs
              .filter((s) => s.aiScore !== null)
              .reduce((sum, s) => sum + (s.aiScore || 0), 0) /
              allSubs.filter((s) => s.aiScore !== null).length
          )
        : null;
    const approvalRate =
      totalSubs > 0 ? Math.round((statusCounts.approved / totalSubs) * 100) : 0;

    return NextResponse.json({
      totalSubmissions: totalSubs,
      avgScore,
      approvalRate,
      avgDecisionHours,
      weeklySubmissions: weeklyData,
      statusBreakdown: statusCounts,
      monthlyScores,
      genreDistribution: genreData,
    });
  } catch (err) {
    console.error("GET /api/analytics error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
