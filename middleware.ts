import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/submit(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/privacidade(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isPublicPostRoute = createRouteMatcher([
  "/api/submissions",
  "/api/ai/analyze",
  "/api/insights/generate(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  if (req.method === "POST" && isPublicPostRoute(req)) return;

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
