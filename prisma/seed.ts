import { AuditEventType, AuditStatus, PrismaClient, RiskLevel, Role, ScheduleEntryType, ScoreType, TrendLabel } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { encryptBilimClassSecret } from "../lib/bilimclass/crypto";
import { hashPassword } from "../lib/auth/password";
import { SLOT_TEMPLATES } from "../lib/schedule/slot-templates";
import { resolveDatabaseUrl } from "../lib/db/database-url";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveDatabaseUrl()
    }
  }
});

async function resetDatabase() {
  await prisma.notificationReceipt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.scheduleChangeLog.deleteMany();
  await prisma.scheduleApplyHistory.deleteMany();
  await prisma.scheduleDraftEntry.deleteMany();
  await prisma.scheduleDraftBatch.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.scheduleGenerationRun.deleteMany();
  await prisma.ribbonGroupItem.deleteMany();
  await prisma.scheduleRibbon.deleteMany();
  await prisma.scheduleTemplateRequest.deleteMany();
  await prisma.teacherAbsence.deleteMany();
  await prisma.roomAvailability.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.teachingAssignment.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.leaderboardScore.deleteMany();
  await prisma.badgeAward.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.gradeRecord.deleteMany();
  await prisma.bilimClassSyncLog.deleteMany();
  await prisma.bilimClassConnection.deleteMany();
  await prisma.parentLinkCode.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.room.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.user.deleteMany();
}

function calculateNormalizedScore(scoreType: ScoreType, rawScore: string, max = 5) {
  if (scoreType === ScoreType.mark) {
    return (Number(rawScore) / max) * 100;
  }

  if (scoreType === ScoreType.credit) {
    return rawScore === "1" ? 100 : 35;
  }

  return null;
}

async function seed() {
  await resetDatabase();

  const demoPassword = await hashPassword("demo12345");

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: "student",
        passwordHash: demoPassword,
        role: Role.student,
        fullName: "Aqbota Serik",
        email: "student@aqbobek.local"
      }
    }),
    prisma.user.create({
      data: {
        username: "teacher",
        passwordHash: demoPassword,
        role: Role.teacher,
        fullName: "Miras Tulegen",
        email: "teacher@aqbobek.local"
      }
    }),
    prisma.user.create({
      data: {
        username: "parent",
        passwordHash: demoPassword,
        role: Role.parent,
        fullName: "Ainur Serikova",
        email: "parent@aqbobek.local"
      }
    }),
    prisma.user.create({
      data: {
        username: "parent2",
        passwordHash: demoPassword,
        role: Role.parent,
        fullName: "Serik Kudaibergen",
        email: "parent2@aqbobek.local"
      }
    }),
    prisma.user.create({
      data: {
        username: "admin",
        passwordHash: demoPassword,
        role: Role.admin,
        fullName: "Dana Bekmurat",
        email: "admin@aqbobek.local"
      }
    })
  ]);

  const [studentUser, teacherUser, parentUser, parentUserTwo, adminUser] = users;

  const class11b = await prisma.schoolClass.create({
    data: {
      name: "11 B",
      gradeLevel: 11,
      section: "B",
      parallelLabel: "11"
    }
  });

  const class10a = await prisma.schoolClass.create({
    data: {
      name: "10 A",
      gradeLevel: 10,
      section: "A",
      parallelLabel: "10"
    }
  });

  await Promise.all(
    [
      ["7 A", 7, "A"],
      ["7 B", 7, "B"],
      ["7 C", 7, "C"],
      ["7 D", 7, "D"],
      ["8 A", 8, "A"],
      ["8 B", 8, "B"],
      ["8 C", 8, "C"],
      ["8 D", 8, "D"],
      ["9 A", 9, "A"],
      ["9 B", 9, "B"],
      ["10 B", 10, "B"],
      ["11 A", 11, "A"]
    ].map(([name, gradeLevel, section]) =>
      prisma.schoolClass.create({
        data: {
          name: name as string,
          gradeLevel: gradeLevel as number,
          section: section as string,
          parallelLabel: String(gradeLevel)
        }
      })
    )
  );

  const teacherProfile = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser.id,
      title: "Physics & Math Teacher",
      expertise: "Physics, Algebra, Olympiad mentoring"
    }
  });

  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      phone: "+7 700 123 4567"
    }
  });

  await prisma.parentProfile.create({
    data: {
      userId: parentUserTwo.id,
      phone: "+7 701 987 6543"
    }
  });

  await prisma.adminProfile.create({
    data: {
      userId: adminUser.id,
      department: "Academic Office",
      accessLevel: "super-admin"
    }
  });

  const mainStudent = await prisma.studentProfile.create({
    data: {
      userId: studentUser.id,
      classId: class11b.id,
      studentCode: "AQB-11B-001",
      verifiedProfile: true,
      cumulativeScore: 91.4,
      rank: 2,
      bilimClassGroupId: 1093706,
      bilimClassStudentUuid: "5fb2db72-e8f1-4192-8697-b3908a5ece2f"
    }
  });

  await prisma.parentStudentLink.create({
    data: {
      parentId: parentProfile.id,
      studentId: mainStudent.id,
      classId: class11b.id,
      relation: "mother"
    }
  });

  const classmates = await Promise.all(
    [
      { username: "student2", fullName: "Batyr Nurgali", code: "AQB-11B-002", score: 82.5, rank: 4 },
      { username: "student3", fullName: "Aruzhan Kairat", code: "AQB-11B-003", score: 95.6, rank: 1 },
      { username: "student4", fullName: "Yernar Ali", code: "AQB-11B-004", score: 77.1, rank: 5 },
      { username: "student5", fullName: "Mansur Nur", code: "AQB-11B-005", score: 88.9, rank: 3 }
    ].map(async (entry, index) => {
      const user = await prisma.user.create({
        data: {
          username: entry.username,
          passwordHash: demoPassword,
          role: Role.student,
          fullName: entry.fullName,
          email: `${entry.username}@aqbobek.local`
        }
      });

      return prisma.studentProfile.create({
        data: {
          userId: user.id,
          classId: class11b.id,
          studentCode: entry.code,
          verifiedProfile: index % 2 === 0,
          cumulativeScore: entry.score,
          rank: entry.rank
        }
      });
    })
  );

  await Promise.all(
    ["teacher2", "teacher3"].map(async (username, index) => {
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: demoPassword,
          role: Role.teacher,
          fullName: index === 0 ? "Aigerim Saparova" : "Olzhas Tursyn",
          email: `${username}@aqbobek.local`
        }
      });

      return prisma.teacherProfile.create({
        data: {
          userId: user.id,
          title: index === 0 ? "Informatics Teacher" : "Language Teacher",
          expertise: index === 0 ? "AI literacy, Python" : "English, Communication"
        }
      });
    })
  );

  const teacherProfiles = await prisma.teacherProfile.findMany({
    include: { user: true }
  });

  const subjects = await Promise.all(
    [
      ["Physics", ScoreType.mark],
      ["Algebra", ScoreType.mark],
      ["Informatics", ScoreType.mark],
      ["English", ScoreType.mark],
      ["Physical Education", ScoreType.credit],
      ["Homeroom", ScoreType.no_score]
    ].map(([name, creditType]) =>
      prisma.subject.create({
        data: {
          name,
          category: name === "Physical Education" ? "sport" : "core",
          creditType: creditType as ScoreType
        }
      })
    )
  );

  const rooms = await Promise.all(
    [
      ["Lab 301", 28],
      ["Cabinet 204", 30],
      ["STEM Hub", 24],
      ["Gym", 80]
    ].map(([name, capacity]) =>
      prisma.room.create({
        data: { name: name as string, capacity: capacity as number }
      })
    )
  );

  await Promise.all(
    ["107", "109", "110", "201", "203", "204", "205", "206", "209", "210", "211", "301", "302", "303", "304", "305", "306", "307", "309", "310", "311"].map(
      (name) =>
        prisma.room.create({
          data: {
            name,
            capacity: 30,
            suitableFor:
              name.startsWith("3") ? "Physics,Informatics,English" : name === "107" || name === "109" ? "Algebra,English" : null
          }
        })
    )
  );

  const assignmentMap = [
    { subject: "Physics", teacher: "teacher", room: "Lab 301", load: 3 },
    { subject: "Algebra", teacher: "teacher", room: "Cabinet 204", load: 3 },
    { subject: "Informatics", teacher: "teacher2", room: "STEM Hub", load: 2, streamKey: "ai-stream" },
    { subject: "English", teacher: "teacher3", room: "Cabinet 204", load: 2 },
    { subject: "Physical Education", teacher: "teacher3", room: "Gym", load: 2 },
    { subject: "Homeroom", teacher: "teacher", room: "Cabinet 204", load: 1 }
  ];

  const assignments = await Promise.all(
    assignmentMap.map((entry) => {
      const teacher = teacherProfiles.find((profile) => profile.user.username === entry.teacher)!;
      const subject = subjects.find((item) => item.name === entry.subject)!;
      const room = rooms.find((item) => item.name === entry.room)!;

      return prisma.teachingAssignment.create({
        data: {
          teacherId: teacher.id,
          subjectId: subject.id,
          classId: class11b.id,
          roomId: room.id,
          weeklyLoad: entry.load,
          streamKey: entry.streamKey
        }
      });
    })
  );

  await Promise.all(
    SLOT_TEMPLATES.map((slot) =>
      prisma.timeSlot.create({
        data: {
          slotNumber: slot.slotIndex,
          label: `#${slot.slotIndex}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBreak: false,
          isActive: true,
          sortOrder: slot.slotIndex
        }
      })
    )
  );

  for (const teacher of teacherProfiles) {
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      for (const slot of SLOT_TEMPLATES) {
        await prisma.teacherAvailability.create({
          data: {
            teacherId: teacher.id,
            dayOfWeek,
            slotNumber: slot.slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            available: !(teacher.user.username === "teacher" && dayOfWeek === 3 && slot.startTime === "13:50")
          }
        });
      }
    }
  }

  const allRooms = await prisma.room.findMany();
  for (const room of allRooms) {
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      for (const slot of SLOT_TEMPLATES) {
        await prisma.roomAvailability.create({
          data: {
            roomId: room.id,
            dayOfWeek,
            slotNumber: slot.slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            available: true
          }
        });
      }
    }
  }

  const room301 = await prisma.room.findFirstOrThrow({ where: { name: "301" } });
  const room204 = await prisma.room.findFirstOrThrow({ where: { name: "204" } });
  const room305 = await prisma.room.findFirstOrThrow({ where: { name: "305" } });

  await prisma.teacherProfile.update({
    where: { id: teacherProfile.id },
    data: { preferredRoomId: room301.id }
  });

  const teacherTwo = teacherProfiles.find((profile) => profile.user.username === "teacher2")!;
  const teacherThree = teacherProfiles.find((profile) => profile.user.username === "teacher3")!;

  await prisma.teacherProfile.update({
    where: { id: teacherTwo.id },
    data: { preferredRoomId: room305.id }
  });

  await prisma.teacherProfile.update({
    where: { id: teacherThree.id },
    data: { preferredRoomId: room204.id }
  });

  const physics = subjects.find((item) => item.name === "Physics")!;
  const algebra = subjects.find((item) => item.name === "Algebra")!;
  const informatics = subjects.find((item) => item.name === "Informatics")!;
  const english = subjects.find((item) => item.name === "English")!;
  const homeroom = subjects.find((item) => item.name === "Homeroom")!;

  const aiGroup = await prisma.classGroup.create({
    data: {
      classId: class10a.id,
      subjectId: informatics.id,
      teacherId: teacherTwo.id,
      name: "AI Track",
      code: "10A-AI"
    }
  });

  const roboticsGroup = await prisma.classGroup.create({
    data: {
      classId: class11b.id,
      subjectId: informatics.id,
      teacherId: teacherTwo.id,
      name: "Robotics Track",
      code: "11B-ROB"
    }
  });

  await prisma.scheduleTemplateRequest.createMany({
    data: [
      {
        title: "11 B Physics",
        classId: class11b.id,
        teacherId: teacherProfile.id,
        subjectId: physics.id,
        preferredRoomId: room301.id,
        type: ScheduleEntryType.lesson,
        lessonsPerWeek: 3,
        durationSlots: 1,
        isHeavy: true
      },
      {
        title: "11 B Algebra",
        classId: class11b.id,
        teacherId: teacherProfile.id,
        subjectId: algebra.id,
        preferredRoomId: room204.id,
        type: ScheduleEntryType.lesson,
        lessonsPerWeek: 3,
        durationSlots: 1,
        isHeavy: true
      },
      {
        title: "11 B English Pair",
        classId: class11b.id,
        teacherId: teacherThree.id,
        subjectId: english.id,
        preferredRoomId: room204.id,
        type: ScheduleEntryType.pair,
        lessonsPerWeek: 1,
        durationSlots: 2,
        isHeavy: false
      },
      {
        title: "11 B Homeroom",
        classId: class11b.id,
        teacherId: teacherProfile.id,
        subjectId: homeroom.id,
        preferredRoomId: room204.id,
        type: ScheduleEntryType.academic_hour,
        lessonsPerWeek: 1,
        durationSlots: 1,
        isHeavy: false
      },
      {
        title: "10 A Physics",
        classId: class10a.id,
        teacherId: teacherProfile.id,
        subjectId: physics.id,
        preferredRoomId: room301.id,
        type: ScheduleEntryType.lesson,
        lessonsPerWeek: 2,
        durationSlots: 1,
        isHeavy: true
      },
      {
        title: "10 A Algebra",
        classId: class10a.id,
        teacherId: teacherProfile.id,
        subjectId: algebra.id,
        preferredRoomId: room204.id,
        type: ScheduleEntryType.lesson,
        lessonsPerWeek: 2,
        durationSlots: 1,
        isHeavy: true
      }
    ]
  });

  const ribbon = await prisma.scheduleRibbon.create({
    data: {
      title: "AI / Robotics Ribbon",
      strict: true,
      dayOfWeek: 2,
      slotIndex: 4
    }
  });

  await prisma.ribbonGroupItem.createMany({
    data: [
      {
        ribbonId: ribbon.id,
        classId: class10a.id,
        classGroupId: aiGroup.id,
        subjectId: informatics.id,
        teacherId: teacherTwo.id,
        roomId: room305.id,
        title: "10 A AI Ribbon",
        sortOrder: 1
      },
      {
        ribbonId: ribbon.id,
        classId: class11b.id,
        classGroupId: roboticsGroup.id,
        subjectId: informatics.id,
        teacherId: teacherTwo.id,
        roomId: room305.id,
        title: "11 B Robotics Ribbon",
        sortOrder: 2
      }
    ]
  });

  const allStudents = [mainStudent, ...classmates];

  for (const student of allStudents) {
    for (const subject of subjects) {
      const periodScores =
        subject.creditType === ScoreType.mark
          ? student.studentCode === "AQB-11B-001" && subject.name === "Physics"
            ? ["4", "3", "3", "4"]
            : student.studentCode === "AQB-11B-004"
              ? ["3", "3", "2", "3"]
              : student.studentCode === "AQB-11B-003"
                ? ["5", "5", "5", "5"]
                : ["4", "4", "4", "5"]
          : subject.creditType === ScoreType.credit
            ? ["1", "1", "1", "1"]
            : ["", "", "", ""];

      for (const [index, rawScore] of periodScores.entries()) {
        await prisma.gradeRecord.create({
          data: {
            subjectId: subject.id,
            studentId: student.id,
            source: student.id === mainStudent.id ? "bilimclass" : "mock",
            periodType: "quarter",
            periodNumber: index + 1,
            scoreType: subject.creditType,
            rawScore: rawScore || null,
            normalizedScore: rawScore ? calculateNormalizedScore(subject.creditType, rawScore) : null,
            finalScore: rawScore ? calculateNormalizedScore(subject.creditType, rawScore) : null,
            recordedAt: subDays(new Date(), 120 - index * 25),
            schoolYear: 2025,
            trendSnapshot:
              index >= 2 && subject.name === "Physics" && student.id === mainStudent.id
                ? TrendLabel.declining
                : TrendLabel.stable
          }
        });
      }

      await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          schoolYear: 2025,
          periodType: "quarter",
          periodNumber: 3,
          totalMissCount: student.id === mainStudent.id && subject.name === "Physics" ? 4 : 1,
          missingBySick: student.id === mainStudent.id && subject.name === "Informatics" ? 1 : 0,
          missingWithoutReason: student.id === mainStudent.id && subject.name === "Physics" ? 2 : 0,
          missingDue: 0,
          missingByAnotherReason: student.id === mainStudent.id && subject.name === "English" ? 1 : 0,
          recordedAt: subDays(new Date(), 20)
        }
      });
    }
  }

  const physicsSubject = subjects.find((subject) => subject.name === "Physics")!;
  const algebraSubject = subjects.find((subject) => subject.name === "Algebra")!;
  const informaticsSubject = subjects.find((subject) => subject.name === "Informatics")!;

  await Promise.all([
    prisma.riskAssessment.create({
      data: {
        studentId: mainStudent.id,
        subjectId: physicsSubject.id,
        riskScore: 68,
        probabilityFail: 42,
        trend: TrendLabel.declining,
        level: RiskLevel.high,
        breakdownJson: JSON.stringify({
          baseRisk: 38,
          trendPenalty: 14,
          attendancePenalty: 8,
          unexcusedPenalty: 8,
          stabilityBoost: 0
        }),
        explanation: "Физика просела из-за снижения оценок в середине года и двух пропусков без причины.",
        recommendations:
          "Повторить механику, пройти 2 практических задания, записаться на консультацию к учителю."
      }
    }),
    prisma.riskAssessment.create({
      data: {
        studentId: mainStudent.id,
        subjectId: algebraSubject.id,
        riskScore: 26,
        probabilityFail: 12,
        trend: TrendLabel.stable,
        level: RiskLevel.low,
        breakdownJson: JSON.stringify({
          baseRisk: 20,
          trendPenalty: 2,
          attendancePenalty: 1,
          unexcusedPenalty: 0,
          stabilityBoost: -3
        }),
        explanation: "Алгебра в стабильной зоне, небольшое давление создают плотные контрольные.",
        recommendations: "Сохранять темп, закрепить задания на функции, поддерживать еженедельный повтор."
      }
    }),
    prisma.riskAssessment.create({
      data: {
        studentId: mainStudent.id,
        subjectId: informaticsSubject.id,
        riskScore: 18,
        probabilityFail: 8,
        trend: TrendLabel.improving,
        level: RiskLevel.low,
        breakdownJson: JSON.stringify({
          baseRisk: 15,
          trendPenalty: 0,
          attendancePenalty: 2,
          unexcusedPenalty: 0,
          stabilityBoost: -4
        }),
        explanation: "Информатика улучшается за счет регулярной практики и высокой вовлеченности.",
        recommendations: "Продолжать проектную работу и взять дополнительный модуль по AI literacy."
      }
    })
  ]);

  await Promise.all([
    prisma.achievement.create({
      data: {
        studentId: mainStudent.id,
        title: "Regional Physics Olympiad",
        level: "regional silver",
        description: "2nd place in regional round",
        achievedAt: subDays(new Date(), 60),
        verified: true
      }
    }),
    prisma.achievement.create({
      data: {
        studentId: mainStudent.id,
        title: "Robotics Club Demo Day",
        level: "school",
        description: "Presented autonomous sorting prototype",
        achievedAt: subDays(new Date(), 20),
        verified: true
      }
    }),
    prisma.certificate.create({
      data: {
        studentId: mainStudent.id,
        title: "AI Literacy Bootcamp",
        issuer: "Aqbobek Innovation Lab",
        issuedAt: subDays(new Date(), 90),
        verified: true
      }
    }),
    prisma.portfolioItem.create({
      data: {
        studentId: mainStudent.id,
        type: "club",
        title: "STEM Research Club",
        description: "Weekly research practice and competition prep",
        verified: true
      }
    }),
    prisma.portfolioItem.create({
      data: {
        studentId: mainStudent.id,
        type: "volunteering",
        title: "Peer Math Mentoring",
        description: "Supports grade 8 students twice a month",
        verified: true
      }
    }),
    prisma.goal.create({
      data: {
        studentId: mainStudent.id,
        title: "Raise Physics final score to 85+",
        targetValue: 85,
        currentValue: 74,
        dueDate: addDays(new Date(), 35),
        status: "active"
      }
    }),
    prisma.goal.create({
      data: {
        studentId: mainStudent.id,
        title: "Zero unexcused absences next month",
        targetValue: 30,
        currentValue: 22,
        dueDate: addDays(new Date(), 28),
        status: "active"
      }
    })
  ]);

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        slug: "science-sprint",
        name: "Science Sprint",
        description: "High momentum in STEM subjects"
      }
    }),
    prisma.badge.create({
      data: {
        slug: "portfolio-pro",
        name: "Portfolio Pro",
        description: "Verified achievements and certificates"
      }
    })
  ]);

  await Promise.all([
    prisma.badgeAward.create({
      data: { badgeId: badges[0].id, studentId: mainStudent.id }
    }),
    prisma.badgeAward.create({
      data: { badgeId: badges[1].id, studentId: mainStudent.id }
    })
  ]);

  for (const [index, student] of allStudents
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .entries()) {
    await prisma.leaderboardScore.create({
      data: {
        studentId: student.id,
        periodKey: "2025-Q3",
        points: 680 - index * 35,
        streakDays: 6 + index,
        rank: index + 1
      }
    });
  }

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const baseSchedule = [
    { day: 1, slot: 1, start: "08:00", end: "08:45", title: "Physics", subject: "Physics" },
    { day: 1, slot: 2, start: "08:55", end: "09:40", title: "Algebra", subject: "Algebra" },
    { day: 3, slot: 5, start: "11:40", end: "13:05", title: "English Double", subject: "English", type: ScheduleEntryType.pair, durationSlots: 2 },
    { day: 4, slot: 7, start: "13:50", end: "14:35", title: "Physical Education", subject: "Physical Education" },
    { day: 5, slot: 8, start: "14:45", end: "15:30", title: "Assembly: University Track", subject: undefined, type: ScheduleEntryType.event }
  ];

  for (const entry of baseSchedule) {
    const subject = entry.subject ? subjects.find((item) => item.name === entry.subject) : null;
    const assignment = subject
      ? assignments.find((item) => item.subjectId === subject.id)
      : null;

    await prisma.scheduleEntry.create({
      data: {
        type: entry.type ?? ScheduleEntryType.lesson,
        status: "active",
        title: entry.title,
        schoolYear: "2025-2026",
        term: "Q1",
        classId: class11b.id,
        subjectId: subject?.id,
        teacherId: assignment?.teacherId,
        roomId: assignment?.roomId,
        assignmentId: assignment?.id,
        dayOfWeek: entry.day,
        slotNumber: entry.slot,
        slotIndex: entry.slot,
        durationSlots: entry.durationSlots ?? 1,
        startTime: entry.start,
        endTime: entry.end,
        effectiveDate: addDays(monday, entry.day - 1),
        streamKey: null,
        notes: entry.type === ScheduleEntryType.event ? "Open for all grade 11 classes" : null
      }
    });
  }

  const ribbonItems = await prisma.ribbonGroupItem.findMany({
    where: {
      ribbonId: ribbon.id
    }
  });

  for (const item of ribbonItems) {
    await prisma.scheduleEntry.create({
      data: {
        title: item.title,
        type: ScheduleEntryType.ribbon,
        status: "active",
        schoolYear: "2025-2026",
        term: "Q1",
        classId: item.classId,
        classGroupId: item.classGroupId,
        subjectId: item.subjectId,
        teacherId: item.teacherId,
        roomId: item.roomId,
        ribbonId: ribbon.id,
        ribbonItemId: item.id,
        dayOfWeek: 2,
        slotNumber: 4,
        slotIndex: 4,
        durationSlots: 1,
        startTime: "10:45",
        endTime: "11:30",
        effectiveDate: addDays(monday, 1)
      }
    });
  }

  await prisma.teacherAbsence.create({
    data: {
      teacherId: teacherProfile.id,
      startsAt: addDays(monday, 2),
      endsAt: addDays(monday, 2),
      reason: "Demo: sick leave for smart reschedule"
    }
  });

  const schoolEvent = await prisma.event.create({
    data: {
      title: "AIS Hack 3.0 Demo Rehearsal",
      description: "Final rehearsal in the assembly hall for all finalists.",
      type: "competition",
      startsAt: addDays(new Date(), 2),
      endsAt: addDays(new Date(), 2),
      location: "Assembly Hall"
    }
  });

  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        title: "Physics consultation moved",
        body: "Today's physics consultation starts at 16:10 in Lab 301.",
        scope: "class",
        targetClassIds: class11b.id,
        createdBy: adminUser.id
      }
    }),
    prisma.notification.create({
      data: {
        title: "Weekly attendance watch",
        body: "Two students in 11 B exceeded the unexcused absence threshold.",
        scope: "role",
        targetRoles: "teacher,admin",
        createdBy: adminUser.id
      }
    }),
    prisma.notification.create({
      data: {
        title: "Hackathon rehearsal reminder",
        body: `${schoolEvent.title} starts soon. Bring your presentation decks.`,
        scope: "parallel",
        targetParallel: "11",
        createdBy: adminUser.id
      }
    })
  ]);

  const notifiedUsers = await prisma.user.findMany();
  for (const notification of notifications) {
    for (const user of notifiedUsers) {
      const shouldDeliver =
        notification.scope === "class"
          ? user.role === Role.student || user.role === Role.parent || user.role === Role.teacher
          : notification.scope === "role"
            ? (notification.targetRoles ?? "").split(",").includes(user.role)
            : true;

      if (shouldDeliver) {
        await prisma.notificationReceipt.create({
          data: {
            notificationId: notification.id,
            userId: user.id,
            isRead: user.username === "student2"
          }
        });
      }
    }
  }

  const connection = await prisma.bilimClassConnection.create({
    data: {
      linkedStudentId: mainStudent.id,
      mode: "mock",
      baseUrl: "https://api.bilimclass.kz",
      login: encryptBilimClassSecret("quldybaev_batyrkhan_3"),
      password: encryptBilimClassSecret("demo-only"),
      schoolId: 1013305,
      eduYear: 2025,
      groupId: 1093706,
      lastStatus: "mock-connected",
      lastSyncedAt: new Date()
    }
  });

  await prisma.bilimClassSyncLog.create({
    data: {
      connectionId: connection.id,
      operation: "year-sync",
      status: "success",
      requestPayload: JSON.stringify({
        schoolId: 1013305,
        eduYear: 2025
      }),
      responseSummary: "20 subject rows normalized into local grade/attendance tables."
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        eventType: AuditEventType.auth,
        action: "login-success",
        status: AuditStatus.success,
        actorUserId: adminUser.id,
        actorRole: Role.admin,
        message: "Initial admin login recorded for dashboard demo.",
        ipAddress: "127.0.0.1",
        userAgent: "Seeded Session",
        createdAt: subDays(new Date(), 1)
      },
      {
        eventType: AuditEventType.parent_link,
        action: "parent-linked",
        status: AuditStatus.success,
        actorUserId: parentUser.id,
        actorRole: Role.parent,
        targetUserId: studentUser.id,
        entityType: "parent-student-link",
        message: "Parent account linked to student profile.",
        ipAddress: "127.0.0.1",
        userAgent: "Seeded Session",
        createdAt: subDays(new Date(), 1)
      },
      {
        eventType: AuditEventType.bilimclass,
        action: "bilimclass-sync",
        status: AuditStatus.success,
        actorUserId: studentUser.id,
        actorRole: Role.student,
        targetUserId: studentUser.id,
        entityType: "bilimclass-connection",
        message: "BilimClass sync completed successfully for demo student.",
        ipAddress: "127.0.0.1",
        userAgent: "Seeded Session",
        createdAt: subDays(new Date(), 1)
      },
      {
        eventType: AuditEventType.system,
        action: "sync-warning",
        status: AuditStatus.warning,
        actorUserId: adminUser.id,
        actorRole: Role.admin,
        message: "One BilimClass sync request exceeded the expected latency threshold.",
        ipAddress: "127.0.0.1",
        userAgent: "Seeded Session",
        createdAt: subDays(new Date(), 1)
      }
    ]
  });

  await prisma.schoolClass.update({
    where: { id: class10a.id },
    data: {
      parallelLabel: "10"
    }
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
