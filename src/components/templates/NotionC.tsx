import type {
  Link,
  Period,
  ResumeDocument,
} from '@/schema/resume';

function fmtPeriod(p?: Partial<Period>): string {
  if (!p) return '';
  return `${p.start ?? ''} — ${p.end ?? '至今'}`;
}

function Links({ links }: { links?: Link[] }): React.JSX.Element | null {
  if (!links?.length) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-neutral-500">
      {links.map((l) => (
        <div key={l.id}>
          {l.label ? `${l.label} (${l.url})` : l.url}
        </div>
      ))}
    </div>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mb-4">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MainSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-4">
      <h2 className="mb-2 border-b border-neutral-300 pb-1 font-serif text-[15px] font-semibold text-neutral-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function NotionCTemplate({ document }: { document: ResumeDocument }): React.JSX.Element {
  const { basics } = document;
  const d = document;

  return (
    <article
      className="resume-page font-serif"
      style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '0 20px' }}
    >
      {/* 左侧栏 */}
      <aside className="pr-4" style={{ borderRight: '1px solid #d4d4d4' }}>
        <div className="mb-5">
          <div className="text-[20px] font-bold tracking-tight text-neutral-900">
            {basics.name || '你的姓名'}
          </div>
          {basics.headline ? (
            <div className="mt-1 text-[12px] text-neutral-500">{basics.headline}</div>
          ) : null}
        </div>

        <SidebarSection title="联系方式">
          <div className="space-y-0.5 text-[11.5px] text-neutral-600">
            {basics.email ? <div>{basics.email}</div> : null}
            {basics.phone ? <div>{basics.phone}</div> : null}
            {basics.location ? <div>{basics.location}</div> : null}
          </div>
          <Links links={basics.links} />
        </SidebarSection>

        {d.skills.length ? (
          <SidebarSection title="技能">
            <div className="space-y-2 text-[11.5px]">
              {d.skills.map((g) => (
                <div key={g.id}>
                  <div className="font-medium text-neutral-700">{g.category}</div>
                  <div className="text-neutral-500">{g.items.join('、')}</div>
                </div>
              ))}
            </div>
          </SidebarSection>
        ) : null}

        {d.educations.length ? (
          <SidebarSection title="教育">
            <div className="space-y-2 text-[11.5px]">
              {d.educations.map((e) => (
                <div key={e.id}>
                  <div className="font-medium text-neutral-800">{e.school}</div>
                  <div className="text-neutral-500">
                    {[e.degree, e.major].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-neutral-400">{fmtPeriod(e.period)}</div>
                  {e.gpa ? <div className="text-neutral-400">GPA {e.gpa}</div> : null}
                </div>
              ))}
            </div>
          </SidebarSection>
        ) : null}

        {d.certifications?.length ? (
          <SidebarSection title="证书">
            <ul className="space-y-1 text-[11px] text-neutral-600">
              {d.certifications.map((c) => (
                <li key={c.id}>
                  {c.name}
                  {c.issuer ? <span className="text-neutral-400"> · {c.issuer}</span> : null}
                </li>
              ))}
            </ul>
          </SidebarSection>
        ) : null}
      </aside>

      {/* 右侧主区域 */}
      <div>
        {basics.summary ? (
          <MainSection title="个人简介">
            <p className="text-[12.5px] leading-[1.65] text-neutral-700 text-pretty">
              {basics.summary}
            </p>
          </MainSection>
        ) : null}

        {d.experiences.length ? (
          <MainSection title="工作经历">
            <div className="space-y-3">
              {d.experiences.map((e) => (
                <article key={e.id}>
                  <header className="flex items-baseline justify-between">
                    <div>
                      <div className="font-sans text-[14px] font-semibold text-neutral-900">
                        {e.title}
                      </div>
                      <div className="text-[12px] text-neutral-500">
                        {e.company}{e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-neutral-400">{fmtPeriod(e.period)}</div>
                  </header>
                  {e.bullets.length ? (
                    <ul className="mt-1 list-outside list-disc space-y-0.5 pl-4 text-[12px] leading-[1.6] text-neutral-700 marker:text-neutral-300">
                      {e.bullets.map((b, i) => (
                        <li key={i} className="text-pretty">{b}</li>
                      ))}
                    </ul>
                  ) : null}
                  {e.stack?.length ? (
                    <p className="mt-0.5 text-[10.5px] text-neutral-400">{e.stack.join(' · ')}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </MainSection>
        ) : null}

        {d.projects.length ? (
          <MainSection title="项目经历">
            <div className="space-y-3">
              {d.projects.map((p) => (
                <article key={p.id}>
                  <header className="flex items-baseline justify-between">
                    <div>
                      <span className="font-sans text-[14px] font-semibold text-neutral-900">
                        {p.name}
                      </span>
                      {p.role ? (
                        <span className="ml-2 text-[11.5px] text-neutral-500">{p.role}</span>
                      ) : null}
                    </div>
                    {p.period ? (
                      <div className="shrink-0 text-[11px] text-neutral-400">{fmtPeriod(p.period)}</div>
                    ) : null}
                  </header>
                  {p.summary ? (
                    <p className="mt-0.5 text-[12px] leading-snug text-neutral-600">{p.summary}</p>
                  ) : null}
                  {p.highlights.length ? (
                    <ul className="mt-1 list-outside list-disc space-y-0.5 pl-4 text-[12px] leading-[1.6] text-neutral-700 marker:text-neutral-300">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="text-pretty">{h}</li>
                      ))}
                    </ul>
                  ) : null}
                  {p.stack?.length ? (
                    <p className="mt-0.5 text-[10.5px] text-neutral-400">{p.stack.join(' · ')}</p>
                  ) : null}
                  <Links links={p.links} />
                </article>
              ))}
            </div>
          </MainSection>
        ) : null}

        {d.publications?.length ? (
          <MainSection title="出版物">
            <ul className="space-y-1 text-[12px] text-neutral-700">
              {d.publications.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.title}</span>
                  {p.venue ? <span className="text-neutral-400"> · {p.venue}</span> : null}
                </li>
              ))}
            </ul>
          </MainSection>
        ) : null}

        {d.customSections?.map((s) => (
          <MainSection key={s.id} title={s.title}>
            <ul className="list-outside list-disc space-y-0.5 pl-4 text-[12px] leading-[1.6] text-neutral-700 marker:text-neutral-300">
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </MainSection>
        ))}
      </div>
    </article>
  );
}
