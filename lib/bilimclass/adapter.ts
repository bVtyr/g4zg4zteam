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

async function fetchJson<T>(url: string, init: RequestInit) {
  const timeoutMs = Number(process.env.BILIMCLASS_TIMEOUT_MS ?? "15000");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
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
  async login() {
    return {
      access_token: "mock-access",
      refresh_token: "mock-refresh",
      user_info: {
        userId: 88383016,
        group: {
          id: 1093706,
          name: "11 B"
        },
        school: {
          name: "AQBOBEK LYCEUM",
          eduYears: [
            {
              schoolId: 1013305,
              eduYear: 2025
            }
          ]
        },
        studentInfo: {
          fullname: "Aqbota Serik",
          studentGroupUuid: "5fb2db72-e8f1-4192-8697-b3908a5ece2f"
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
      { period: 1, periodType: "halfyear", title: "Half-year 1", hasData: false },
      { period: 2, periodType: "halfyear", title: "Half-year 2", hasData: true }
    ] satisfies BilimClassPeriod[];
  }

  async getYear(_: { schoolId: number; eduYear: number; token?: string }) {
    const path = join(process.cwd(), "blimclass", "annual grades response");
    const raw = await readFile(path, "utf-8");
    const jsonStart = raw.indexOf("{");
    return JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart) : raw) as BilimClassYearResponse;
  }

  async getSubjects(args: {
    schoolId: number;
    eduYear: number;
    period: number;
    periodType: "quarter" | "halfyear";
    groupId: number;
  }) {
    const path = join(process.cwd(), "blimclass", "grades quarter response");
    const raw = await readFile(path, "utf-8");
    const jsonStart = raw.indexOf("{");
    const payload = JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart) : raw) as { data: BilimClassSubjectDetail[] };

    return payload.data;
  }
}
