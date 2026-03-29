import { Role } from "@prisma/client";

export function hasRole(userRole: Role, allowed: Role[]) {
  return allowed.includes(userRole);
}

export const roleLanding: Record<Role, string> = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  parent: "/dashboard/parent",
  admin: "/dashboard/admin"
};
