import { readFile } from "fs/promises";
import { join } from "path";
import type {
  BilimClassLoginResponse,
  BilimClassPeriod,
  BilimClassSubjectDetail,
  BilimClassYearResponse
} from "@/lib/bilimclass/types";

export type BilimClassAdapter = {
  login(credentials: { username: string; password: string }): Promise<BilimClassLoginResponse>;
  getPeriods(args: { schoolId: number; eduYear: number; token?: string }): Promise<BilimClassPeriod[]>;
  getYear(args: { schoolId: number; eduYear: number; token?: string }): Promise<BilimClassYearResponse>;
  getSubjects(args: {
    schoolId: number;
    eduYear: number;
    period: number;
    periodType: "quarter" | "halfyear";
    groupId: number;
    token?: string;
  }): Promise<BilimClassSubjectDetail[]>;
};

type MockIdentity = {
  seed: number;
  userId: number;
  schoolId: number;
  eduYear: number;
  groupId: number;
  groupName: string;
  fullName: string;
  studentGroupUuid: string;
  accessToken: string;
  refreshToken: string;
};

async function fetchJson<T>(url: string, init: RequestInit) {
  const timeoutMs = Number(process.env.BILIMCLASS_TIMEOUT_MS ?? "15000");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`BilimClass request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function hashSeed(value: string) {
  let hash = 7;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash;
}

function titleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function createMockIdentity(credentials: { username: string; password: string }): MockIdentity {
  const normalizedLogin = credentials.username.trim().toLowerCase();
  const seed = hashSeed(`${normalizedLogin}:${credentials.password.length}`);
  const gradeLevel = 9 + (seed % 3);
  const section = ["A", "B", "C"][seed % 3];
  const schoolId = 1013000 + (seed % 200);
  const eduYear = 2025;
  const groupId = 1093000 + (seed % 700);
  const userId = 88000000 + seed;
  const fullName = titleCase(normalizedLogin.replace(/[@].*$/, "").replace(/[0-9]+/g, " "));
  const compact = (seed % 99999999).toString(16).padStart(8, "0");

  return {
    seed,
    userId,
    schoolId,
    eduYear,
    groupId,
    groupName: `${gradeLevel} ${section}`,
    fullName: fullName || `Student ${seed}`,
    studentGroupUuid: `${compact.slice(0, 8)}-${compact.slice(0, 4)}-4${compact.slice(1, 4)}-a${compact.slice(4, 7)}-${compact}${compact.slice(0, 4)}`.slice(0, 36),
    accessToken: `mock.${seed}.${schoolId}.${eduYear}.${groupId}`,
    refreshToken: `mock-refresh.${seed}.${schoolId}.${eduYear}.${groupId}`
  };
}

function parseMockToken(token?: string) {
  if (!token?.startsWith("mock.")) {
    throw new Error("Mock BilimClass token is missing or invalid");
  }

  const [, seedRaw, schoolIdRaw, eduYearRaw, groupIdRaw] = token.split(".");
  const seed = Number(seedRaw);
  const schoolId = Number(schoolIdRaw);
  const eduYear = Number(eduYearRaw);
  const groupId = Number(groupIdRaw);

  if (![seed, schoolId, eduYear, groupId].every(Number.isFinite)) {
    throw new Error("Mock BilimClass token context is invalid");
  }

  return {
    seed,
    schoolId,
    eduYear,
    groupId
  };
}

function clampMark(value: number) {
  return Math.max(2, Math.min(5, value));
}

function adjustMark(raw: string | null, seed: number, index: number) {
  if (raw === null || raw === "") {
    return raw;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return raw;
  }

  const shift = ((seed + index) % 3) - 1;
  return String(clampMark(numeric + shift));
}

function adjustCredit(raw: string | null, seed: number, index: number) {
  if (raw === null || raw === "") {
    return raw;
  }

  return (seed + index) % 6 === 0 ? "0" : "1";
}

async function readMockJson<T>(filename: string) {
  const path = join(process.cwd(), "blimclass", filename);
  const raw = await readFile(path, "utf-8");
  const jsonStart = raw.indexOf("{");
  return JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart) : raw) as T;
}

export class LiveBilimClassAdapter implements BilimClassAdapter {
  constructor(private baseUrl = process.env.BILIMCLASS_BASE_URL ?? "https://api.bilimclass.kz") {}

  login(credentials: { username: string; password: string }) {
    return fetchJson<BilimClassLoginResponse>(`${this.baseUrl}/api/v2/os/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        login: credentials.username,
        password: credentials.password
      })
    });
  }

  getPeriods(args: { schoolId: number; eduYear: number; token?: string }) {
    return fetchJson<BilimClassPeriod[]>(
      `${this.baseUrl}/api/v4/os/clientoffice/diary/periods?schoolId=${args.schoolId}&eduYear=${args.eduYear}`,
      {
        headers: {
          Authorization: `Bearer ${args.token ?? ""}`
        }
      }
    );
  }

  getYear(args: { schoolId: number; eduYear: number; token?: string }) {
    return fetchJson<BilimClassYearResponse>(
      `${this.baseUrl}/api/v4/os/clientoffice/diary/year?schoolId=${args.schoolId}&eduYear=${args.eduYear}`,
      {
        headers: {
          Authorization: `Bearer ${args.token ?? ""}`
        }
      }
    );
  }

  getSubjects(args: {
    schoolId: number;
    eduYear: number;
    period: number;
    periodType: "quarter" | "halfyear";
    groupId: number;
    token?: string;
  }) {
    return fetchJson<BilimClassSubjectDetail[]>(
      `${this.baseUrl}/api/v4/os/clientoffice/diary/subjects?schoolId=${args.schoolId}&eduYear=${args.eduYear}&period=${args.period}&periodType=${args.periodType}&groupId=${args.groupId}`,
      {
        headers: {
          Authorization: `Bearer ${args.token ?? ""}`
        }
      }
    );
  }
}

export class MockBilimClassAdapter implements BilimClassAdapter {
  async login(credentials: { username: string; password: string }) {
    const identity = createMockIdentity(credentials);

    return {
      access_token: identity.accessToken,
      refresh_token: identity.refreshToken,
      user_info: {
        userId: identity.userId,
        group: {
          id: identity.groupId,
          name: identity.groupName
        },
        school: {
          name: "AQBOBEK LYCEUM",
          eduYears: [
            {
              schoolId: identity.schoolId,
              eduYear: identity.eduYear
            }
          ]
        },
        studentInfo: {
          fullname: identity.fullName,
          studentGroupUuid: identity.studentGroupUuid
        }
      }
    } satisfies BilimClassLoginResponse;
  }

  async getPeriods() {
    return [
      { period: 1, periodType: "quarter", title: "Quarter 1", hasData: false },
      { period: 2, periodType: "quarter", title: "Quarter 2", hasData: true },
      { period: 3, periodType: "quarter", title: "Quarter 3", hasData: true },
      { period: 4, periodType: "quarter", title: "Quarter 4", hasData: false },
      { period: 1, periodType: "halfyear", title: "Half-year 1", hasData: true },
      { period: 2, periodType: "halfyear", title: "Half-year 2", hasData: true }
    ] satisfies BilimClassPeriod[];
  }

  async getYear(args: { schoolId: number; eduYear: number; token?: string }) {
    const tokenContext = parseMockToken(args.token);
    const payload = await readMockJson<BilimClassYearResponse>("annual grades response");

    return {
      data: {
        groupId: tokenContext.groupId,
        groupName: `${9 + (tokenContext.seed % 3)} ${["A", "B", "C"][tokenContext.seed % 3]}`,
        rows: payload.data.rows.map((row, index) => ({
          ...row,
          eduSubjectUuid: `${row.eduSubjectUuid}:${tokenContext.seed}`,
          attestations:
            row.scoreType === "mark"
              ? {
                  quarter1: adjustMark(row.attestations.quarter1, tokenContext.seed, index),
                  quarter2: adjustMark(row.attestations.quarter2, tokenContext.seed + 1, index),
                  quarter3: adjustMark(row.attestations.quarter3, tokenContext.seed + 2, index),
                  quarter4: adjustMark(row.attestations.quarter4, tokenContext.seed + 3, index)
                }
              : row.scoreType === "credit"
                ? {
                    quarter1: adjustCredit(row.attestations.quarter1, tokenContext.seed, index),
                    quarter2: adjustCredit(row.attestations.quarter2, tokenContext.seed + 1, index),
                    quarter3: adjustCredit(row.attestations.quarter3, tokenContext.seed + 2, index),
                    quarter4: adjustCredit(row.attestations.quarter4, tokenContext.seed + 3, index)
                  }
                : row.attestations,
          attendances: {
            ...row.attendances,
            missingBySick: row.attendances.missingBySick + ((tokenContext.seed + index) % 2),
            missingWithoutReason: row.attendances.missingWithoutReason + ((tokenContext.seed + index) % 4 === 0 ? 1 : 0),
            totalMissCount:
              row.attendances.totalMissCount +
              ((tokenContext.seed + index) % 2) +
              ((tokenContext.seed + index) % 4 === 0 ? 1 : 0)
          },
          yearScores: {
            ...row.yearScores,
            finalScore:
              row.scoreType === "mark" && row.yearScores.finalScore !== null
                ? adjustMark(row.yearScores.finalScore, tokenContext.seed + 4, index)
                : row.yearScores.finalScore
          }
        }))
      }
    };
  }

  async getSubjects(args: {
    schoolId: number;
    eduYear: number;
    period: number;
    periodType: "quarter" | "halfyear";
    groupId: number;
    token?: string;
  }) {
    const tokenContext = parseMockToken(args.token);
    const payload = await readMockJson<{ data: BilimClassSubjectDetail[] }>("grades quarter response");

    return payload.data.map((row, index) => ({
      ...row,
      eduSubjectUuid: `${row.eduSubjectUuid}:${tokenContext.seed}`,
      finalScore:
        row.periodInfo.scoreType === "mark"
          ? adjustMark(row.finalScore, tokenContext.seed + args.period, index)
          : row.periodInfo.scoreType === "credit"
            ? adjustCredit(row.finalScore, tokenContext.seed + args.period, index)
            : row.finalScore,
      schedules: row.schedules.map((schedule, scheduleIndex) => ({
        ...schedule,
        uuid: `${schedule.uuid}:${tokenContext.seed}:${scheduleIndex}`,
        markMax:
          schedule.type === "regular"
            ? schedule.markMax
            : schedule.markMax + ((tokenContext.seed + index + scheduleIndex) % 3)
      }))
    }));
  }
}
