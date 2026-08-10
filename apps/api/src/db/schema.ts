import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  locale: text("locale").default("fr").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// The candidate's master profile: their parsed CV, writing style, and a
// learned preference vector (no-LLM feedback loop, M7).
export const masterProfiles = pgTable("master_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cvJson: jsonb("cv_json").$type<CvJson>().notNull().default({}),
  writingStyle: jsonb("writing_style").$type<WritingStyle>().notNull().default({}),
  // Per-user preference vector (term/skill weights). Updated by feedback, no LLM.
  preferenceVector: jsonb("preference_vector")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  freeExportsUsed: integer("free_exports_used").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  cvPublic: boolean("cv_public").default(false).notNull(),
  analyticsEnabled: boolean("analytics_enabled").default(false).notNull(),
  cvViews: integer("cv_views").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Enriched experience entries (one per past role). Bullets hold original +
// 3-5 AI variants. Adam pulls from these when adapting.
export const experiences = pgTable("experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  company: text("company"),
  title: text("title").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  location: text("location"),
  industry: text("industry"),
  companySize: text("company_size"),
  // Free-form notes Adam captured during the interview (missions, context).
  notes: text("notes"),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  variants: jsonb("variants").$type<BulletVariant[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  raw: text("raw").notNull(),
  parsedJson: jsonb("parsed_json").$type<OfferParsed>().notNull().default({}),
  companyResearch: jsonb("company_research").$type<CompanyResearch>().notNull().default({}),
  atsScore: integer("ats_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  offerId: uuid("offer_id")
    .notNull()
    .references(() => offers.id, { onDelete: "cascade" }),
  cvVariantJson: jsonb("cv_variant_json").$type<CvJson>(),
  coverLetter: text("cover_letter"),
  status: text("status").default("draft").notNull(),
  feedback: jsonb("feedback").$type<ApplicationFeedback[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "cv" | "cover_letter"
  format: text("format").notNull(), // "pdf" | "docx" | "txt"
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// --- Domain types (stored as JSONB) ---

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
  tone?: string; // e.g. "professional, confident"
  voice?: "first_singular" | "first_plural" | "impersonal";
  language?: "fr" | "en" | "bilingual";
}

export interface BulletVariant {
  bullet: string;
  variants: string[];
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

export interface ApplicationFeedback {
  kind: "keep" | "reject" | "edit";
  field: string;
  oldValue?: string;
  newValue?: string;
  at: string;
}
