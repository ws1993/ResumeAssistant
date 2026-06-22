import type {
  Link,
  Period,
  ResumeDocument,
  SectionKey,
} from '@/schema/resume';

function fmtPeriod(p?: Partial<Period>): string {
  if (!p) return '';
  return `${p.start ?? ''} — ${p.end ?? '至今'}`;
}

function Links({ links }: { links?: Link[] }): React.JSX.Element | null {
  if (!links?.length) return null;
  return (
    <span className="text-[11px] opacity-60">
      {links.map((l, i) => (
        <span key={l.id}>
          {i > 0 ? ' · ' : ''}
          {l.label ? `${l.label} (${l.url})` : l.url}
        </span>
      ))}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-50">
      {children}
    </h2>
  );
}

function Bullets({ items }: { items: string[] }): React.JSX.Element | null {
  if (!items?.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 pl-4 text-[12px] leading-[1.6] opacity-80 [list-style-type:'–_']">
      {items.map((b, i) => (
        <li key={i} className="text-pretty">{b}</li>
      ))}
    </ul>
  );
}

function StackTag({ items }: { items?: string[] }): React.JSX.Element | null {
  if (!items?.length) return null;
  return (
    <p className="mt-1 text-[10.5px] tracking-wide opacity-40">
      {items.join(' · ')}
    </p>
  );
}

const RENDERERS: Record<SectionKey, (d: ResumeDocument) => React.ReactNode> = {
  basics: () => null,
  experiences: (d) =>
    d.experiences.length ? (
      <section>
        <H2>EXPERIENCE</H2>
        {d.experiences.map((e) => (
          <article key={e.id} className="mt-2 first:mt-0">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[13px] font-semibold">{e.title}</div>
                <div className="text-[11.5px] opacity-60">
                  {e.company}{e.location ? ` · ${e.location}` : ''}
                </div>
              </div>
              <div className="text-[10.5px] opacity-40">{fmtPeriod(e.period)}</div>
            </div>
            <Bullets items={e.bullets} />
            <StackTag items={e.stack} />
          </article>
        ))}
      </section>
    ) : null,
  projects: (d) =>
    d.projects.length ? (
      <section>
        <H2>PROJECTS</H2>
        {d.projects.map((p) => (
          <article key={p.id} className="mt-2 first:mt-0">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[13px] font-semibold">{p.name}</span>
                {p.role ? <span className="ml-2 text-[11px] opacity-50">{p.role}</span> : null}
                <Links links={p.links} />
              </div>
              {p.period ? <div className="text-[10.5px] opacity-40">{fmtPeriod(p.period)}</div> : null}
            </div>
            {p.summary ? <p className="mt-0.5 text-[12px] leading-snug opacity-75">{p.summary}</p> : null}
            <Bullets items={p.highlights} />
            <StackTag items={p.stack} />
          </article>
        ))}
      </section>
    ) : null,
  educations: (d) =>
    d.educations.length ? (
      <section>
        <H2>EDUCATION</H2>
        {d.educations.map((e) => (
          <article key={e.id} className="mt-2 first:mt-0">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[13px] font-semibold">{e.school}</div>
                <div className="text-[11.5px] opacity-60">
                  {[e.degree, e.major].filter(Boolean).join(' · ')}{e.gpa ? `  GPA ${e.gpa}` : ''}
                </div>
              </div>
              <div className="text-[10.5px] opacity-40">{fmtPeriod(e.period)}</div>
            </div>
            {e.highlights?.length ? <Bullets items={e.highlights} /> : null}
          </article>
        ))}
      </section>
    ) : null,
  skills: (d) =>
    d.skills.length ? (
      <section>
        <H2>SKILLS</H2>
        <div className="space-y-0.5 text-[12px]">
          {d.skills.map((g) => (
            <div key={g.id}>
              <span className="font-medium opacity-70">{g.category}：</span>
              <span className="opacity-80">{g.items.join('、')}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null,
  certifications: (d) =>
    d.certifications?.length ? (
      <section>
        <H2>CERTIFICATIONS</H2>
        <ul className="space-y-0.5 text-[12px]">
          {d.certifications.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.issuer ? <span className="opacity-50"> · {c.issuer}</span> : null}
              {c.date ? <span className="opacity-40"> · {c.date}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null,
  publications: (d) =>
    d.publications?.length ? (
      <section>
        <H2>PUBLICATIONS</H2>
        <ul className="space-y-0.5 text-[12px]">
          {d.publications.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.title}</span>
              {p.venue ? <span className="opacity-50"> · {p.venue}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    ) : null,
  custom: (d) =>
    d.customSections?.length
      ? d.customSections.map((s) => (
          <section key={s.id}>
            <H2>{s.title.toUpperCase()}</H2>
            <Bullets items={s.bullets} />
          </section>
        ))
      : null,
};

export function GeistBTemplate({ document }: { document: ResumeDocument }): React.JSX.Element {
  const { basics, meta } = document;
  const order = meta.sectionOrder?.length ? meta.sectionOrder : (Object.keys(RENDERERS) as SectionKey[]);

  return (
    <article
      className="resume-page text-neutral-100"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <header className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">{basics.name || '你的姓名'}</h1>
        {basics.headline ? (
          <p className="mt-1 text-[13px] opacity-60">{basics.headline}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-50">
          {basics.email ? <span>{basics.email}</span> : null}
          {basics.phone ? <span>{basics.phone}</span> : null}
          {basics.location ? <span>{basics.location}</span> : null}
          {basics.links?.length ? <Links links={basics.links} /> : null}
        </div>
      </header>

      {basics.summary ? (
        <section>
          <H2>SUMMARY</H2>
          <p className="text-[12px] leading-relaxed opacity-80 text-pretty">{basics.summary}</p>
        </section>
      ) : null}

      {order.map((key) => (
        <div key={key}>{RENDERERS[key]?.(document)}</div>
      ))}
    </article>
  );
}
