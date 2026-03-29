import { AuditEventType, AuditStatus, Role, ScoreType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit-log-service";
import { syncStudentBilimClass } from "@/lib/bilimclass/service";
import { average } from "@/lib/utils";

async function requireAdmin() {
  return requireSession([Role.admin]);
}

function buildStudentCode() {
  return `ADM-${Date.now().toString().slice(-8)}`;
}

function calculateNormalizedFromRaw(scoreType: ScoreType, rawScore: string | null) {
  if (!rawScore) {
    return null;
  }

  if (scoreType === ScoreType.mark) {
    const numeric = Number(rawScore);
    return Number.isFinite(numeric) ? (numeric / 5) * 100 : null;
  }

  if (scoreType === ScoreType.credit) {
    return rawScore === "1" ? 100 : 35;
  }

  return null;
}

export async function getAdminManagementData() {
  await requireAdmin();

  const [users, parentLinks, grades, auditLogs, connections, classes] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        studentProfile: {
          include: {
            schoolClass: true,
            parentLinks: true,
            bilimClassConnections: {
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            },
            grades: {
              where: {
                isHidden: false
              },
              take: 20
            }
          }
        },
        parentProfile: {
          include: {
            links: true
          }
        },
        teacherProfile: true,
        adminProfile: true
      }
    }),
    prisma.parentStudentLink.findMany({
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
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.gradeRecord.findMany({
      take: 60,
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        subject: true,
        student: {
          include: {
            user: true,
            schoolClass: true
          }
        }
      }
    }),
    prisma.auditLog.findMany({
      take: 120,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        actorUser: true,
        targetUser: true
      }
    }),
    prisma.bilimClassConnection.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        student: {
          include: {
            user: true,
            schoolClass: true
          }
        },
        syncLogs: {
          take: 1,
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    }),
    prisma.schoolClass.findMany({
      orderBy: {
        gradeLevel: "asc"
      }
    })
  ]);

  const userRows = users.map((user) => ({
    id: user.id,
    studentProfileId: user.studentProfile?.id ?? null,
    parentProfileId: user.parentProfile?.id ?? null,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedReason: user.blockedReason,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    lastUserAgent: user.lastUserAgent,
    createdAt: user.createdAt,
    className: user.studentProfile?.schoolClass.name ?? null,
    classId: user.studentProfile?.classId ?? null,
    verifiedProfile: user.studentProfile?.verifiedProfile ?? null,
    linkedParents: user.studentProfile?.parentLinks.length ?? 0,
    linkedChildren: user.parentProfile?.links.length ?? 0,
    averageScore: user.studentProfile ? average(user.studentProfile.grades.map((grade) => grade.normalizedScore)) : null,
    latestBilimStatus: user.studentProfile?.bilimClassConnections[0]?.lastStatus ?? null,
    latestBilimSync: user.studentProfile?.bilimClassConnections[0]?.lastSyncedAt ?? null
  }));

  const gradeRows = grades.map((grade) => ({
    id: grade.id,
    studentId: grade.studentId,
    studentName: grade.student.user.fullName,
    className: grade.student.schoolClass.name,
    subjectName: grade.subject.name,
    rawScore: grade.rawScore,
    normalizedScore: grade.normalizedScore,
    finalScore: grade.finalScore,
    scoreType: grade.scoreType,
    source: grade.source,
    periodType: grade.periodType,
    periodNumber: grade.periodNumber,
    recordedAt: grade.recordedAt,
    updatedAt: grade.updatedAt,
    isHidden: grade.isHidden,
    adminNote: grade.adminNote
  }));

  const parentLinkRows = parentLinks.map((link) => ({
    id: link.id,
    parentId: link.parentId,
    parentUserId: link.parent.userId,
    parentName: link.parent.user.fullName,
    studentId: link.studentId,
    studentUserId: link.student.userId,
    studentName: link.student.user.fullName,
    className: link.student.schoolClass.name,
    relation: link.relation,
    createdAt: link.createdAt
  }));

  const logRows = auditLogs.map((log) => ({
    id: log.id,
    eventType: log.eventType,
    action: log.action,
    status: log.status,
    actorName: log.actorUser?.fullName ?? null,
    actorRole: log.actorRole,
    targetName: log.targetUser?.fullName ?? null,
    message: log.message,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  }));

  const criticalAlerts = auditLogs
    .filter((log) => log.status !== AuditStatus.success)
    .slice(0, 8)
    .map((log) => ({
      id: log.id,
      title: log.action,
      message: log.message,
      status: log.status,
      createdAt: log.createdAt
    }));

  return {
    users: userRows,
    parentLinks: parentLinkRows,
    grades: gradeRows,
    auditLogs: logRows,
    criticalAlerts,
    bilimConnections: connections.map((connection) => ({
      id: connection.id,
      studentId: connection.student?.id ?? null,
      studentName: connection.student?.user.fullName ?? null,
      className: connection.student?.schoolClass.name ?? null,
      mode: connection.mode,
      lastStatus: connection.lastStatus,
      lastSyncedAt: connection.lastSyncedAt,
      latestError: connection.syncLogs[0]?.errorMessage ?? null
    })),
    classes: classes.map((schoolClass) => ({
      id: schoolClass.id,
      name: schoolClass.name
    }))
  };
}

export async function updateAdminUser(
  adminUserId: string,
  input: {
    userId: string;
    fullName?: string;
    email?: string | null;
    role?: Role;
    isBlocked?: boolean;
    blockedReason?: string | null;
    classId?: string | null;
    phone?: string | null;
    verifiedProfile?: boolean;
  }
) {
  await requireAdmin();

  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    include: {
      studentProfile: true,
      parentProfile: true,
      teacherProfile: true,
      adminProfile: true
    }
  });

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isBlocked !== undefined ? { isBlocked: input.isBlocked } : {}),
        ...(input.blockedReason !== undefined ? { blockedReason: input.blockedReason } : {})
      }
    });

    const nextRole = input.role ?? existing.role;

    if (nextRole === Role.parent && !existing.parentProfile) {
      await tx.parentProfile.create({
        data: {
          userId: existing.id,
          phone: input.phone ?? null
        }
      });
    }

    if (nextRole === Role.teacher && !existing.teacherProfile) {
      await tx.teacherProfile.create({
        data: {
          userId: existing.id
        }
      });
    }

    if (nextRole === Role.admin && !existing.adminProfile) {
      await tx.adminProfile.create({
        data: {
          userId: existing.id
        }
      });
    }

    if (nextRole === Role.student) {
      if (existing.studentProfile) {
        await tx.studentProfile.update({
          where: {
            id: existing.studentProfile.id
          },
          data: {
            ...(input.classId !== undefined && input.classId ? { classId: input.classId } : {}),
            ...(input.verifiedProfile !== undefined ? { verifiedProfile: input.verifiedProfile } : {})
          }
        });
      } else {
        if (!input.classId) {
          throw new Error("STUDENT_CLASS_REQUIRED");
        }

        await tx.studentProfile.create({
          data: {
            userId: existing.id,
            classId: input.classId,
            studentCode: buildStudentCode(),
            verifiedProfile: input.verifiedProfile ?? false
          }
        });
      }
    }

    if (nextRole === Role.parent && input.phone !== undefined) {
      await tx.parentProfile.upsert({
        where: {
          userId: existing.id
        },
        create: {
          userId: existing.id,
          phone: input.phone
        },
        update: {
          phone: input.phone
        }
      });
    }

    return user;
  });

  await createAuditLog({
    eventType: AuditEventType.user_update,
    action: "admin-user-update",
    status: AuditStatus.success,
    actorUserId: adminUserId,
    actorRole: Role.admin,
    targetUserId: updatedUser.id,
    entityType: "user",
    entityId: updatedUser.id,
    message: `Admin updated user ${updatedUser.fullName}`,
    metadata: input
  });

  return updatedUser;
}

export async function performAdminBulkAction(
  adminUserId: string,
  input: {
    action: "block" | "unblock" | "sync-bilimclass";
    userIds: string[];
  }
) {
  await requireAdmin();

  if (!input.userIds.length) {
    throw new Error("NO_USERS_SELECTED");
  }

  if (input.action === "block" || input.action === "unblock") {
    const isBlocked = input.action === "block";
    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: input.userIds
        }
      },
      data: {
        isBlocked,
        blockedReason: isBlocked ? "Blocked by admin bulk action" : null
      }
    });

    await createAuditLog({
      eventType: AuditEventType.admin_action,
      action: `bulk-${input.action}`,
      status: AuditStatus.success,
      actorUserId: adminUserId,
      actorRole: Role.admin,
      entityType: "user-bulk",
      message: `Admin executed bulk ${input.action} for ${result.count} users`,
      metadata: input
    });

    return {
      count: result.count
    };
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      userId: {
        in: input.userIds
      }
    }
  });

  const results = [];
  for (const student of students) {
    try {
      const result = await syncStudentBilimClass(student.id);
      results.push({
        studentId: student.id,
        status: "success",
        result
      });
    } catch (error) {
      results.push({
        studentId: student.id,
        status: "failed",
        error: error instanceof Error ? error.message : "sync failed"
      });
    }
  }

  await createAuditLog({
    eventType: AuditEventType.admin_action,
    action: "bulk-sync-bilimclass",
    status: results.some((item) => item.status === "failed") ? AuditStatus.warning : AuditStatus.success,
    actorUserId: adminUserId,
    actorRole: Role.admin,
    entityType: "bilimclass-bulk",
    message: `Admin triggered BilimClass sync for ${results.length} students`,
    metadata: results
  });

  return {
    count: results.length,
    results
  };
}

export async function updateAdminGrade(
  adminUserId: string,
  input: {
    gradeId: string;
    rawScore?: string | null;
    normalizedScore?: number | null;
    finalScore?: number | null;
    isHidden?: boolean;
    adminNote?: string | null;
  }
) {
  await requireAdmin();

  const existing = await prisma.gradeRecord.findUniqueOrThrow({
    where: {
      id: input.gradeId
    }
  });

  const rawScore = input.rawScore !== undefined ? input.rawScore : existing.rawScore;
  const normalizedScore =
    input.normalizedScore !== undefined
      ? input.normalizedScore
      : calculateNormalizedFromRaw(existing.scoreType, rawScore);

  const updated = await prisma.gradeRecord.update({
    where: {
      id: input.gradeId
    },
    data: {
      ...(input.rawScore !== undefined ? { rawScore } : {}),
      normalizedScore,
      ...(input.finalScore !== undefined ? { finalScore: input.finalScore } : {}),
      ...(input.isHidden !== undefined ? { isHidden: input.isHidden } : {}),
      ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {})
    }
  });

  await createAuditLog({
    eventType: AuditEventType.grade_update,
    action: "admin-grade-update",
    status: AuditStatus.success,
    actorUserId: adminUserId,
    actorRole: Role.admin,
    entityType: "grade-record",
    entityId: updated.id,
    message: `Admin updated grade ${updated.id}`,
    metadata: input
  });

  return updated;
}

export async function createOrUpdateAdminParentLink(
  adminUserId: string,
  input: {
    parentId: string;
    studentId: string;
    relation: string;
  }
) {
  await requireAdmin();

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: {
      id: input.studentId
    },
    include: {
      parentLinks: true,
      user: true
    }
  });

  const parent = await prisma.parentProfile.findUniqueOrThrow({
    where: {
      id: input.parentId
    },
    include: {
      user: true
    }
  });

  const existing = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: {
        parentId: input.parentId,
        studentId: input.studentId
      }
    }
  });

  if (!existing && student.parentLinks.length >= 2) {
    throw new Error("STUDENT_PARENT_LIMIT_REACHED");
  }

  const link = existing
    ? await prisma.parentStudentLink.update({
        where: {
          id: existing.id
        },
        data: {
          relation: input.relation
        }
      })
    : await prisma.parentStudentLink.create({
        data: {
          parentId: input.parentId,
          studentId: input.studentId,
          classId: student.classId,
          relation: input.relation
        }
      });

  await createAuditLog({
    eventType: AuditEventType.admin_action,
    action: existing ? "admin-parent-link-updated" : "admin-parent-link-created",
    status: AuditStatus.success,
    actorUserId: adminUserId,
    actorRole: Role.admin,
    targetUserId: student.userId,
    entityType: "parent-student-link",
    entityId: link.id,
    message: `Admin linked ${parent.user.fullName} with ${student.user.fullName}`,
    metadata: input
  });

  return link;
}

export async function deleteAdminParentLink(adminUserId: string, linkId: string) {
  await requireAdmin();

  const link = await prisma.parentStudentLink.findUniqueOrThrow({
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
          user: true
        }
      }
    }
  });

  await prisma.parentStudentLink.delete({
    where: {
      id: linkId
    }
  });

  await createAuditLog({
    eventType: AuditEventType.admin_action,
    action: "admin-parent-link-deleted",
    status: AuditStatus.warning,
    actorUserId: adminUserId,
    actorRole: Role.admin,
    targetUserId: link.student.userId,
    entityType: "parent-student-link",
    entityId: link.id,
    message: `Admin unlinked ${link.parent.user.fullName} from ${link.student.user.fullName}`
  });

  return {
    ok: true
  };
}

export async function exportAdminDataset(target: "users" | "logs" | "grades") {
  await requireAdmin();
  const data = await getAdminManagementData();

  if (target === "users") {
    const rows = [
      "fullName,username,role,email,isBlocked,className,linkedParents,linkedChildren,lastLoginAt,lastLoginIp",
      ...data.users.map((row) =>
        [
          row.fullName,
          row.username,
          row.role,
          row.email ?? "",
          row.isBlocked ? "blocked" : "active",
          row.className ?? "",
          row.linkedParents,
          row.linkedChildren,
          row.lastLoginAt?.toISOString() ?? "",
          row.lastLoginIp ?? ""
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
    ];

    return rows.join("\n");
  }

  if (target === "grades") {
    const rows = [
      "studentName,className,subjectName,rawScore,normalizedScore,finalScore,isHidden,source,updatedAt",
      ...data.grades.map((row) =>
        [
          row.studentName,
          row.className,
          row.subjectName,
          row.rawScore ?? "",
          row.normalizedScore ?? "",
          row.finalScore ?? "",
          row.isHidden,
          row.source,
          row.updatedAt.toISOString()
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
    ];

    return rows.join("\n");
  }

  const rows = [
    "createdAt,eventType,action,status,actorName,actorRole,targetName,ipAddress,message",
    ...data.auditLogs.map((row) =>
      [
        row.createdAt.toISOString(),
        row.eventType,
        row.action,
        row.status,
        row.actorName ?? "",
        row.actorRole ?? "",
        row.targetName ?? "",
        row.ipAddress ?? "",
        row.message
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
  ];

  return rows.join("\n");
}
