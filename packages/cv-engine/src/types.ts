// Canonical CV model used by validation, normalization, and export.

export interface CvJson {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  coreCompetencies?: string[];
  experience?: CvExperienceEntry[];
  education?: CvEducationEntry[];
  certifications?: string[];
  languages?: { name: string; level: string }[];
  volunteer?: string[];
  awards?: string[];
}

export interface CvExperienceEntry {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  bullets?: string[];
}

export interface CvEducationEntry {
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}

export interface WritingStyle {
  tone?: string;
  voice?: "first_singular" | "first_plural" | "impersonal";
  language?: "fr" | "en" | "bilingual";
}

export interface BulletVariant {
  bullet: string;
  variants: string[];
}

// Scorecard types returned by the validator.

export type ViolationSeverity = "error" | "warning";

export interface Violation {
  id: string;
  severity: ViolationSeverity;
  message: string;
}

export interface Scorecard {
  violations: Violation[];
  complianceScore: number; // 0-100
  atsScore: number; // 0-100
}
