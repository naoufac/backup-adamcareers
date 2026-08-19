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
  languages?: { name: string; level?: string }[];
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
