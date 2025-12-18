import { createCookieSessionStorage } from "@remix-run/node";
// Create session storage with a cookie
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? process.env.DOMAIN_URL : "localhost",
    secrets: [process.env.REQ_COOKIE || ""],
    secure: process.env.NODE_ENV === "production",
  },
});

// Function to get or create session ID
export async function getOrCreateSessionId(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));

  let sessionId = session.get("sessionId");
  if (!sessionId) {
    // Generate new session ID if none exists
    sessionId = Math.floor(Math.random() * 15000) + 1;
    session.set("sessionId", sessionId);
  }

  return {
    sessionId,
    session,
    // Helper to create response headers with the session cookie
    getHeaders: () => sessionStorage.commitSession(session)
  };
}