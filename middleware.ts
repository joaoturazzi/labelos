import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/submit(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isPublicPostRoute = createRouteMatcher([
  "/api/submissions",
  "/api/ai/analyze",
]);

export default clerkMiddleware(async (auth, req) => {
  // Fully public routes
  if (isPublicRoute(req)) return;

  // POST to /api/submissions and /api/ai/analyze are public (portal + fire-and-forget)
  if (req.method === "POST" && isPublicPostRoute(req)) return;

  // Everything else requires auth
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
