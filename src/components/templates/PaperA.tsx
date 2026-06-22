import type {
  Education,
  Link,
  Period,
  Project,
  ResumeDocument,
  SectionKey,
  WorkExperience,
} from '@/schema/resume';

function formatPeriod(p?: Partial<Period>): string {
  if (!p) return '';
  const start = p.start ?? '';
  const end = p.end ?? '至今';
  if (!start && !end) return '';
  return `${start} — ${end}`;
}

function joinLinks(links: Link[] | undefined): React.ReactNode {
  if (!links?.length) return null;
  return (
    <span className="text-[11px] text-neutral-500">
      {links.map((l, i) => (
        <span key={l.id}>
          {i > 0 ? ' · ' : ''}
          {l.label ? `${l.label} (${l.url})` : l.url}
        </span>
      ))}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="mt-5 mb-2 border-b border-neutral-900 pb-1 text-[13px] font-bold uppercase tracking-[0.18em] text-neutral-900">
      {children}
    </h2>
  );
}

function BulletList({ items }: { items: string[] }): React.JSX.Element | null {
  if (!items?.length) return null;
  return (
    <ul className="mt-1 list-outside list-disc space-y-0.5 pl-4 text-[12.5px] leading-[1.55] text-neutral-800 marker:text-neutral-400">
      {items.map((b, i) => (
        <li key={i} className="text-pretty">
          {b}
        </li>
      ))}
    </ul>
  );
}

function Stack({ items }: { items?: string[] }): React.JSX.Element | null {
  if (!items?.length) return null;
  return (
    <p className="mt-0.5 text-[11.5px] text-neutral-500">
      技术栈：<span className="text-neutral-700">{items.join(' · ')}</span>
    </p>
  );
}

function ExperienceItem({ item }: { item: WorkExperience }): React.JSX.Element {
  return (
    <article className="mt-2 first:mt-0">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-neutral-900">{item.title || '岗位名'}</div>
          <div className="text-[12.5px] text-neutral-600">
            {item.company}
            {item.location ? ` · ${item.location}` : ''}
          </div>
        </div>
        <div className="shrink-0 text-[11.5px] text-neutral-500">{formatPeriod(item.period)}</div>
      </header>
      <BulletList items={item.bullets} />
      <Stack items={item.stack} />
    </article>
  );
}

function ProjectItem({ item }: { item: Project }): React.JSX.Element {
  return (
    <article className="mt-2 first:mt-0">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-neutral-900">
            {item.name || '项目名'}
            {item.role ? <span className="ml-2 text-[12px] font-normal text-neutral-600">{item.role}</span> : null}
          </div>
          {joinLinks(item.links)}
        </div>
        <div className="shrink-0 text-[11.5px] text-neutral-500">{formatPeriod(item.period)}</div>
      </header>
      {item.summary ? (
        <p className="mt-1 text-[12.5px] leading-[1.55] text-neutral-700">{item.summary}</p>
      ) : null}
      <BulletList items={item.highlights} />
      <Stack items={item.stack} />
    </article>
  );
}

function EducationItem({ item }: { item: Education }): React.JSX.Element {
  return (
    <article className="mt-2 first:mt-0">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-neutral-900">{item.school}</div>
          <div className="text-[12.5px] text-neutral-600">
            {[item.degree, item.major].filter(Boolean).join(' · ')}
            {item.gpa ? `  · GPA ${item.gpa}` : ''}
          </div>
        </div>
        <div className="shrink-0 text-[11.5px] text-neutral-500">{formatPeriod(item.period)}</div>
      </header>
      {item.highlights?.length ? <BulletList items={item.highlights} /> : null}
    </article>
  );
}

const SECTION_RENDERERS: Record<SectionKey, (doc: ResumeDocument) => React.ReactNode> = {
  basics: () => null,
  experiences: (doc) =>
    doc.experiences.length ? (
      <section>
        <SectionTitle>工作经历</SectionTitle>
        <div className="space-y-2.5">
          {doc.experiences.map((e) => (
            <ExperienceItem key={e.id} item={e} />
          ))}
        </div>
      </section>
    ) : null,
  projects: (doc) =>
    doc.projects.length ? (
      <section>
        <SectionTitle>项目经历</SectionTitle>
        <div className="space-y-2.5">
          {doc.projects.map((p) => (
            <ProjectItem key={p.id} item={p} />
          ))}
        </div>
      </section>
    ) : null,
  educations: (doc) =>
    doc.educations.length ? (
      <section>
        <SectionTitle>教育背景</SectionTitle>
        <div className="space-y-2.5">
          {doc.educations.map((e) => (
            <EducationItem key={e.id} item={e} />
          ))}
        </div>
      </section>
    ) : null,
  skills: (doc) =>
    doc.skills.length ? (
      <section>
        <SectionTitle>技能</SectionTitle>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-[12.5px] leading-[1.55] text-neutral-800">
          {doc.skills.map((g) => (
            <div key={g.id} className="contents">
              <dt className="font-medium text-neutral-700">{g.category}</dt>
              <dd className="text-neutral-700">{g.items.join('、')}</dd>
            </div>
          ))}
        </dl>
      </section>
    ) : null,
  certifications: (doc) =>
    doc.certifications?.length ? (
      <section>
        <SectionTitle>证书</SectionTitle>
        <ul className="space-y-1 text-[12.5px] text-neutral-800">
          {doc.certifications.map((c) => (
            <li key={c.id} className="flex items-baseline justify-between gap-3">
              <span>
                <span className="font-medium">{c.name}</span>
                {c.issuer ? <span className="text-neutral-500"> · {c.issuer}</span> : null}
              </span>
              {c.date ? <span className="text-[11.5px] text-neutral-500">{c.date}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null,
  publications: (doc) =>
    doc.publications?.length ? (
      <section>
        <SectionTitle>出版物</SectionTitle>
        <ul className="space-y-1 text-[12.5px] text-neutral-800">
          {doc.publications.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.title}</span>
              {p.venue ? <span className="text-neutral-500"> · {p.venue}</span> : null}
              {p.date ? <span className="text-neutral-500"> · {p.date}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null,
  custom: (doc) =>
    doc.customSections?.length
      ? doc.customSections.map((s) => (
          <section key={s.id}>
            <SectionTitle>{s.title}</SectionTitle>
            <BulletList items={s.bullets} />
          </section>
        ))
      : null,
};

export function PaperATemplate({ document }: { document: ResumeDocument }): React.JSX.Element {
  const { basics, meta } = document;
  const order = meta.sectionOrder?.length ? meta.sectionOrder : (Object.keys(SECTION_RENDERERS) as SectionKey[]);

  return (
    <article className="resume-page text-neutral-900">
      <header className="border-b border-neutral-900 pb-3">
        <h1 className="text-[26px] font-bold tracking-tight">{basics.name || '你的姓名'}</h1>
        {basics.headline ? (
          <p className="mt-1 text-[13px] text-neutral-600">{basics.headline}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-neutral-600">
          {basics.email ? <span>{basics.email}</span> : null}
          {basics.phone ? <span>{basics.phone}</span> : null}
          {basics.location ? <span>{basics.location}</span> : null}
          {basics.links?.length ? joinLinks(basics.links) : null}
        </div>
      </header>

      {basics.summary ? (
        <section>
          <SectionTitle>个人简介</SectionTitle>
          <p className="text-[12.5px] leading-[1.6] text-neutral-700 text-pretty">{basics.summary}</p>
        </section>
      ) : null}

      {order.map((key) => (
        <div key={key}>{SECTION_RENDERERS[key]?.(document)}</div>
      ))}
    </article>
  );
}
