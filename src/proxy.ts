import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret-change-me");

/**
 * Employee accounts (role EMPLOYEE) may only: open the Kassa page, sell
 * (products/customers lookups + POST /api/sales) and mark their OWN attendance.
 * Everything else under /admin and /api is admin/cashier-only.
 */
function employeeMayCall(method: string, path: string, employeeId: string): boolean {
  if (path.startsWith("/api/auth/") && !path.startsWith("/api/auth/password")) return true;
  if (path === "/api/products") return method === "GET";
  if (path === "/api/customers") return method === "GET" || method === "POST";
  if (path === "/api/sales") return method === "POST";
  if (path === `/api/employees/${employeeId}/attendance`) return method === "POST" || method === "PATCH";
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("savdo_session")?.value;
  if (!token) return NextResponse.next();

  let role: string | undefined;
  let employeeId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret);
    role = payload.role as string | undefined;
    employeeId = payload.employeeId as string | undefined;
  } catch {
    return NextResponse.next();
  }
  if (role !== "EMPLOYEE" || !employeeId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (employeeMayCall(req.method, pathname, employeeId)) return NextResponse.next();
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  // Pages: only the Kassa page (/admin) itself.
  if (pathname !== "/admin") return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/((?!public|telegram).*)"],
};
