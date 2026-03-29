import { AuditEventType, AuditStatus, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log-service";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_TTL_SECONDS = Number(process.env.PARENT_LINK_CODE_TTL_SECONDS ?? "240");
const MAX_PARENTS_PER_STUDENT = 2;

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function buildCodeValue() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }

  return code;
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = buildCodeValue();
    const exists = await prisma.parentLinkCode.findUnique({
      where: {
        code
      },
      select: {
        id: true
      }
    });

    if (!exists) {
      return code;
    }
  }

  throw new Error("LINK_CODE_GENERATION_FAILED");
}

async function cleanupExpiredCodes(studentId?: string) {
  await prisma.parentLinkCode.deleteMany({
    where: {
      ...(studentId ? { studentId } : {}),
      usedAt: null,
      expiresAt: {
        lte: new Date()
      }
    }
  });
}

async function createIndividualNotification(input: {
  title: string;
  body: string;
  userIds: string[];
}) {
  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      scope: "individual"
    }
  });

  await prisma.notificationReceipt.createMany({
    data: input.userIds.map((userId) => ({
      notificationId: notification.id,
      userId
    }))
  });
}

export async function getStudentParentLinkOverview(studentId: string) {
  await cleanupExpiredCodes(studentId);

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: {
      id: studentId
    },
    include: {
      parentLinks: {
        include: {
          parent: {
            include: {
              user: true
            }
          }
        }
      },
      parentLinkCodes: {
        where: {
          usedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  return {
    linkedParents: student.parentLinks.map((link) => ({
      id: link.id,
      relation: link.relation,
      parentId: link.parentId,
      fullName: link.parent.user.fullName,
      username: link.parent.user.username
    })),
    activeCode: student.parentLinkCodes[0]
      ? {
          code: student.parentLinkCodes[0].code,
          expiresAt: student.parentLinkCodes[0].expiresAt,
          createdAt: student.parentLinkCodes[0].createdAt
        }
      : null,
    remainingSlots: Math.max(0, MAX_PARENTS_PER_STUDENT - student.parentLinks.length),
    canGenerateCode: student.parentLinks.length < MAX_PARENTS_PER_STUDENT
  };
}

export async function getParentChildrenOverview(parentId: string) {
  const parent = await prisma.parentProfile.findUniqueOrThrow({
    where: {
      id: parentId
    },
    include: {
      links: {
        include: {
          student: {
            include: {
              user: true,
              schoolClass: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  return {
    linkedChildren: parent.links.map((link) => ({
      id: link.id,
      relation: link.relation,
      studentId: link.studentId,
      fullName: link.student.user.fullName,
      className: link.student.schoolClass.name,
      studentCode: link.student.studentCode
    }))
  };
}

export async function generateParentLinkCode(studentId: string) {
  await cleanupExpiredCodes(studentId);

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: {
      id: studentId
    },
    include: {
      parentLinks: true
    }
  });

  if (student.parentLinks.length >= MAX_PARENTS_PER_STUDENT) {
    throw new Error("STUDENT_PARENT_LIMIT_REACHED");
  }

  await prisma.parentLinkCode.deleteMany({
    where: {
      studentId,
      usedAt: null
    }
  });

  const code = await generateUniqueCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  const record = await prisma.parentLinkCode.create({
    data: {
      studentId,
      code,
      expiresAt
    }
  });

  return {
    code: record.code,
    expiresAt: record.expiresAt,
    ttlSeconds: CODE_TTL_SECONDS
  };
}

export async function consumeParentLinkCode(parentId: string, rawCode: string, relation = "parent") {
  const code = normalizeCode(rawCode);
  const now = new Date();

  const record = await prisma.parentLinkCode.findUnique({
    where: {
      code
    },
    include: {
      student: {
        include: {
          user: true,
          schoolClass: true,
          parentLinks: true
        }
      }
    }
  });

  if (!record) {
    throw new Error("LINK_CODE_INVALID");
  }

  if (record.usedAt) {
    throw new Error("LINK_CODE_USED");
  }

  if (record.expiresAt <= now) {
    await cleanupExpiredCodes(record.studentId);
    throw new Error("LINK_CODE_EXPIRED");
  }

  if (record.student.parentLinks.length >= MAX_PARENTS_PER_STUDENT) {
    throw new Error("STUDENT_PARENT_LIMIT_REACHED");
  }

  const existingLink = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: {
        parentId,
        studentId: record.studentId
      }
    }
  });

  if (existingLink) {
    throw new Error("LINK_ALREADY_EXISTS");
  }

  const link = await prisma.$transaction(async (tx) => {
    const consumed = await tx.parentLinkCode.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: {
          gt: now
        }
      },
      data: {
        usedAt: now,
        usedByParentId: parentId
      }
    });

    if (consumed.count !== 1) {
      throw new Error("LINK_CODE_USED");
    }

    return tx.parentStudentLink.create({
      data: {
        parentId,
        studentId: record.studentId,
        classId: record.student.classId,
        relation
      }
    });
  });

  const parent = await prisma.parentProfile.findUniqueOrThrow({
    where: {
      id: parentId
    },
    include: {
      user: true
    }
  });

  await createIndividualNotification({
    title: "Родитель привязан / Ата-ана байланыстырылды",
    body: `${parent.user.fullName} linked to ${record.student.user.fullName}.`,
    userIds: [parent.userId, record.student.userId]
  });

  await createAuditLog({
    eventType: AuditEventType.parent_link,
    action: "parent-linked",
    status: AuditStatus.success,
    actorUserId: parent.userId,
    actorRole: Role.parent,
    targetUserId: record.student.userId,
    entityType: "parent-student-link",
    entityId: link.id,
    message: `${parent.user.fullName} linked to ${record.student.user.fullName}`,
    metadata: {
      relation
    }
  });

  return {
    linkId: link.id,
    child: {
      id: record.studentId,
      fullName: record.student.user.fullName,
      className: record.student.schoolClass.name
    }
  };
}

export async function unlinkParentStudentLink(linkId: string, actor: {
  role: "student" | "parent";
  userId: string;
}) {
  const link = await prisma.parentStudentLink.findUnique({
    where: {
      id: linkId
    },
    include: {
      parent: {
        include: {
          user: true
        }
      },
      student: {
        include: {
          user: true,
          schoolClass: true
        }
      }
    }
  });

  if (!link) {
    throw new Error("LINK_NOT_FOUND");
  }

  if (actor.role === "student" && link.student.userId !== actor.userId) {
    throw new Error("FORBIDDEN");
  }

  if (actor.role === "parent" && link.parent.userId !== actor.userId) {
    throw new Error("FORBIDDEN");
  }

  await prisma.parentStudentLink.delete({
    where: {
      id: linkId
    }
  });

  await createIndividualNotification({
    title: "Привязка удалена / Байланыс ажыратылды",
    body: `${link.parent.user.fullName} and ${link.student.user.fullName} are no longer linked.`,
    userIds: [link.parent.userId, link.student.userId]
  });

  await createAuditLog({
    eventType: AuditEventType.parent_link,
    action: "parent-unlinked",
    status: AuditStatus.warning,
    actorUserId: actor.userId,
    actorRole: actor.role === "parent" ? Role.parent : Role.student,
    targetUserId: actor.role === "parent" ? link.student.userId : link.parent.userId,
    entityType: "parent-student-link",
    entityId: link.id,
    message: `${link.parent.user.fullName} unlinked from ${link.student.user.fullName}`,
    metadata: {
      initiatedBy: actor.role
    }
  });

  return {
    ok: true
  };
}
