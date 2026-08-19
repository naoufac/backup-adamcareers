// Inference-gateway is stateless. These types mirror the canonical model.

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

export interface OfferParsed {
  title?: string;
  company?: string;
  location?: string;
  workMode?: string;
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  responsibilities?: string[];
  language?: "fr" | "en";
  salary?: string;
}

export interface CompanyResearch {
  name?: string;
  sector?: string;
  size?: string;
  mission?: string;
  values?: string[];
  notes?: string;
}
