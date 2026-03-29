export type BilimClassAttendance = {
  missingByAnotherReason: number;
  missingBySick: number;
  missingDue: number;
  missingWithoutReason: number;
  totalMissCount: number;
};

export type BilimClassAttestations = {
  quarter1: string | null;
  quarter2: string | null;
  quarter3: string | null;
  quarter4: string | null;
};

export type BilimClassYearScores = {
  studentGroupUuid: string | null;
  eduProgramSubjectUuid: string | null;
  recommendedYearScore: string | null;
  yearScore: string | null;
  examScore: string | null;
  recommendedFinalScore: string | null;
  finalScore: string | null;
  uuid: string | null;
};

export type BilimClassYearRow = {
  subjectName: string;
  eduSubjectUuid: string;
  scoreType: "mark" | "credit" | "no_score";
  periodType: "quarter" | "halfyear";
  attendances: BilimClassAttendance;
  attestations: BilimClassAttestations;
  yearScores: BilimClassYearScores;
};

export type BilimClassYearResponse = {
  data: {
    groupName: string;
    groupId: number;
    rows: BilimClassYearRow[];
  };
};

export type BilimClassPeriod = {
  period: number;
  periodType: "quarter" | "halfyear";
  title: string;
  hasData: boolean;
};

export type BilimClassSubjectDetail = {
  subjectName: string;
  eduSubjectUuid: string;
  finalScore: string | null;
  periodType: "quarter" | "halfyear";
  periodInfo: {
    periodUuid: string;
    scoreType: "mark" | "credit" | "no_score";
  };
  schedules: Array<{
    uuid: string;
    date: string;
    timeStart: string;
    markMax: number;
    type: string;
  }>;
};

export type BilimClassLoginResponse = {
  access_token: string;
  refresh_token: string;
  user_info: {
    userId: number;
    group: {
      id: number;
      name: string;
    };
    school: {
      name: string;
      eduYears: Array<{
        schoolId: number;
        eduYear: number;
      }>;
    };
    studentInfo: {
      fullname: string;
      studentGroupUuid: string;
    };
  };
};
