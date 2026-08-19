// Types shared by the offer-engine package.
// Kept minimal and browser-safe: no server-only dependencies.

import type { CvJson } from "@adamjobs/cv-engine";

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

export interface MatchResult {
  /** Coverage of must-have skills, 0-100 */
  mustHaveScore: number;
  /** Coverage of nice-to-have skills, 0-100 */
  niceToHaveScore: number;
  /** Overall match score, 0-100 */
  overallScore: number;
  /** Matched skills and where they were found */
  matchedMustHave: { skill: string; evidence?: string }[];
  matchedNiceToHave: { skill: string; evidence?: string }[];
  missingMustHave: string[];
  missingNiceToHave: string[];
  /** Suggested competencies to add, ranked */
  suggestions: string[];
}

export interface DiffBlock {
  id: string;
  kind: CvChangeKind;
  section: "summary" | "coreCompetencies" | "experience";
  label: string;
  oldValue?: string;
  newValue?: string;
  experienceKey?: string;
  oldIndex?: number;
  newIndex?: number;
}

export type CvChangeKind =
  | "summary_edited"
  | "bullet_added"
  | "bullet_removed"
  | "bullet_edited"
  | "bullet_reorder"
  | "skill_added"
  | "skill_removed"
  | "experience_added"
  | "experience_removed";

export interface CvChange {
  id: string;
  kind: CvChangeKind;
  section: "summary" | "coreCompetencies" | "experience";
  experienceKey?: string;
  oldValue?: string;
  newValue?: string;
  oldIndex?: number;
  newIndex?: number;
}

export { CvJson };
