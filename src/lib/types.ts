export const STAGES = ["applied", "screening", "interview", "offer", "hired"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
};

export const ROLES = ["admin", "recruiter", "interviewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  interviewer: "Interviewer",
};

export const roleRank: Record<Role, number> = { interviewer: 0, recruiter: 1, admin: 2 };

export const SOURCES = ["job-board", "referral", "agency", "outbound", "career-page", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  "job-board": "Job board",
  referral: "Referral",
  agency: "Agency",
  outbound: "Outbound",
  "career-page": "Career page",
  other: "Other",
};

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  intern: "Intern",
};
