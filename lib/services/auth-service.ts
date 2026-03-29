import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function authenticateUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    return null;
  }

  if (user.isBlocked) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return user;
}

function buildStudentCode() {
  return `REG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function registerUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: "student" | "teacher" | "parent";
  email?: string | null;
  classId?: string | null;
}) {
  const existingByUsername = await prisma.user.findUnique({
    where: {
      username: input.username
    },
    select: {
      id: true
    }
  });

  if (existingByUsername) {
    throw new Error("USERNAME_TAKEN");
  }

  if (input.email) {
    const existingByEmail = await prisma.user.findUnique({
      where: {
        email: input.email
      },
      select: {
        id: true
      }
    });

    if (existingByEmail) {
      throw new Error("EMAIL_TAKEN");
    }
  }

  if (input.role === Role.student && !input.classId) {
    throw new Error("CLASS_REQUIRED");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: input.username,
        passwordHash,
        role: input.role,
        fullName: input.fullName,
        email: input.email ?? null
      }
    });

    if (input.role === Role.student) {
      await tx.studentProfile.create({
        data: {
          userId: user.id,
          classId: input.classId!,
          studentCode: buildStudentCode(),
          verifiedProfile: false
        }
      });
    }

    if (input.role === Role.parent) {
      await tx.parentProfile.create({
        data: {
          userId: user.id
        }
      });
    }

    if (input.role === Role.teacher) {
      await tx.teacherProfile.create({
        data: {
          userId: user.id
        }
      });
    }

    return user;
  });
}
