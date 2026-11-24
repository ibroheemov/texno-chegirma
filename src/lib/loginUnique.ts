import { prisma } from "./prisma";

/** Logins are shared between admin users and employees, so keep them unique across both. */
export async function isLoginTaken(login: string, exceptEmployeeId?: string) {
  const [user, employee] = await Promise.all([
    prisma.user.findUnique({ where: { login }, select: { id: true } }),
    prisma.employee.findFirst({
      where: { login, ...(exceptEmployeeId ? { id: { not: exceptEmployeeId } } : {}) },
      select: { id: true },
    }),
  ]);
  return Boolean(user || employee);
}
