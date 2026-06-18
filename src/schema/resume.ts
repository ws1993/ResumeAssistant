import { z } from 'zod';

export const periodSchema = z.object({
  start: z.string().min(1, '请填写开始时间'),
  end: z.string().optional(),
});

export const linkCategorySchema = z.enum([
  'personal',
  'github',
  'linkedin',
  'portfolio',
  'other',
]);

export const linkSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().url({ message: '请输入有效链接' }),
  category: linkCategorySchema.optional(),
});

export const basicsSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  headline: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(linkSchema).default([]),
  summary: z.string().optional(),
});

export const workExperienceSchema = z.object({
  id: z.string(),
  company: z.string().min(1, '公司不能为空'),
  title: z.string().min(1, '职位不能为空'),
  location: z.string().optional(),
  period: periodSchema,
  bullets: z.array(z.string()).default([]),
  stack: z.array(z.string()).optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '项目名不能为空'),
  role: z.string().optional(),
  period: periodSchema.partial({ start: true }).optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  stack: z.array(z.string()).optional(),
  links: z.array(linkSchema).default([]),
});

export const educationSchema = z.object({
  id: z.string(),
  school: z.string().min(1, '学校不能为空'),
  degree: z.string().optional(),
  major: z.string().optional(),
  period: periodSchema,
  gpa: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const skillGroupSchema = z.object({
  id: z.string(),
  category: z.string().min(1, '请填写技能类别'),
  items: z.array(z.string()).default([]),
});

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
});

export const publicationSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  venue: z.string().optional(),
  date: z.string().optional(),
  authors: z.array(z.string()).optional(),
  url: z.string().url().optional().or(z.literal('')),
});

export const customSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  bullets: z.array(z.string()).default([]),
});

export const sectionKeySchema = z.enum([
  'basics',
  'experiences',
  'projects',
  'educations',
  'skills',
  'certifications',
  'publications',
  'custom',
]);

export const resumeMetaSchema = z.object({
  title: z.string().min(1, '请给简历取个名字'),
  targetRole: z.string().optional(),
  language: z.enum(['zh', 'en']).default('zh'),
  template: z.string().default('paper-a'),
  sectionOrder: z.array(sectionKeySchema).default([
    'basics',
    'experiences',
    'projects',
    'educations',
    'skills',
    'certifications',
    'publications',
    'custom',
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const resumeDocumentSchema = z.object({
  id: z.string(),
  meta: resumeMetaSchema,
  basics: basicsSchema,
  experiences: z.array(workExperienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  educations: z.array(educationSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  certifications: z.array(certificationSchema).optional(),
  publications: z.array(publicationSchema).optional(),
  customSections: z.array(customSectionSchema).optional(),
});

export const jdSnapshotSchema = z.object({
  jdText: z.string(),
  targetRole: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  collectedAt: z.string(),
});

export const resumeVersionSchema = z.object({
  id: z.string(),
  baseResumeId: z.string(),
  parentVersionId: z.string().optional(),
  source: z.enum(['manual', 'jd-tailor', 'import']),
  jdSnapshot: jdSnapshotSchema.optional(),
  document: resumeDocumentSchema,
  createdAt: z.string(),
  note: z.string().optional(),
});

export type Period = z.infer<typeof periodSchema>;
export type Link = z.infer<typeof linkSchema>;
export type LinkCategory = z.infer<typeof linkCategorySchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Education = z.infer<typeof educationSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;
export type SectionKey = z.infer<typeof sectionKeySchema>;
export type ResumeMeta = z.infer<typeof resumeMetaSchema>;
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type JdSnapshot = z.infer<typeof jdSnapshotSchema>;
export type ResumeVersion = z.infer<typeof resumeVersionSchema>;

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'basics',
  'experiences',
  'projects',
  'educations',
  'skills',
  'certifications',
  'publications',
  'custom',
];

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createEmptyResume(now: Date = new Date()): ResumeDocument {
  const iso = now.toISOString();
  return {
    id: newId(),
    meta: {
      title: '未命名简历',
      language: 'zh',
      template: 'paper-a',
      sectionOrder: DEFAULT_SECTION_ORDER,
      createdAt: iso,
      updatedAt: iso,
    },
    basics: {
      name: '',
      links: [],
    },
    experiences: [],
    projects: [],
    educations: [],
    skills: [],
  };
}
