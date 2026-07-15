"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CLEARANCE_LEVELS } from "@/lib/ui/enums";
import { toMonthInput, type StoredProfile } from "@/lib/profile/edit-payload";
import { SourceBadge } from "./form-bits";

/**
 * Read-only rendering of a saved profile — the thing "My Profile" shows when
 * you land on it. Sections with no rows are omitted rather than rendered as
 * empty shells; the completeness panel already says what's missing, and saying
 * it twice just makes a sparse profile look broken.
 */

/** "2019-06" → "Jun 2019". Formats from the UTC-safe month string rather than
 * the Date, so a stored UTC-midnight date can't slip to the previous month. */
function formatMonth(value: Date | null): string | null {
  const month = toMonthInput(value);
  if (month === "") return null;
  const [year, m] = month.split("-");
  const name = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][Number(m) - 1];
  return `${name} ${year}`;
}

function range(from: Date | null, to: Date | null): string {
  const start = formatMonth(from);
  const end = formatMonth(to);
  if (!start && !end) return "";
  return `${start ?? "?"} – ${end ?? "Present"}`;
}

function clearanceLabel(level: string): string {
  return CLEARANCE_LEVELS.find((o) => o.value === level)?.label ?? level;
}

export function ProfileSummary({ profile }: { profile: StoredProfile }) {
  const hasNothing =
    !profile.headline &&
    !profile.summary &&
    !profile.laborCategory &&
    profile.yearsExperience == null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="About you" />
        <CardBody className="space-y-3">
          {hasNothing ? (
            <p className="text-xs text-slate-500">
              Nothing here yet — use <strong>Edit profile</strong> to fill it in.
            </p>
          ) : null}
          {profile.headline ? (
            <h3 className="text-base font-semibold text-slate-900">{profile.headline}</h3>
          ) : null}
          {profile.summary ? (
            <p className="whitespace-pre-line text-sm text-slate-600">{profile.summary}</p>
          ) : null}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {profile.laborCategory ? (
              <div>
                <dt className="text-xs font-medium text-slate-400">Labor category</dt>
                <dd className="text-sm text-slate-800">{profile.laborCategory}</dd>
              </div>
            ) : null}
            {profile.yearsExperience != null ? (
              <div>
                <dt className="text-xs font-medium text-slate-400">Years of experience</dt>
                <dd className="text-sm text-slate-800">{profile.yearsExperience}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium text-slate-400">Clearance</dt>
              <dd className="text-sm text-slate-800">{clearanceLabel(profile.clearanceLevel)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {profile.skills.length > 0 ? (
        <Card>
          <CardHeader title="Skills" description={`${profile.skills.length} listed`} />
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800 ring-1 ring-blue-200"
                >
                  {skill.name}
                  <SourceBadge source={skill.source} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {profile.certifications.length > 0 ? (
        <Card>
          <CardHeader title="Certifications" />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {profile.certifications.map((cert, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-800">{cert.name}</span>
                    <SourceBadge source={cert.source} />
                  </div>
                  {cert.issuer || cert.issuedOn ? (
                    <p className="text-xs text-slate-500">
                      {[cert.issuer, formatMonth(cert.issuedOn)].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {profile.experience.length > 0 ? (
        <Card>
          <CardHeader title="Experience" />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {profile.experience.map((exp, i) => (
                <li key={i} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {exp.role ? `${exp.role} · ` : ""}
                      {exp.organization}
                    </span>
                    {exp.isFederal ? (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Federal{exp.agency ? ` · ${exp.agency}` : ""}
                      </span>
                    ) : null}
                    <SourceBadge source={exp.source} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {range(exp.startedOn, exp.endedOn)}
                    {exp.contractName ? ` · ${exp.contractName}` : ""}
                  </p>
                  {exp.summary ? <p className="mt-1 text-xs text-slate-600">{exp.summary}</p> : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {profile.education.length > 0 ? (
        <Card>
          <CardHeader title="Education" />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {profile.education.map((edu, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-800">
                      {[edu.degree, edu.field].filter(Boolean).join(" ")}
                      {edu.degree || edu.field ? " · " : ""}
                      {edu.institution}
                    </span>
                    <SourceBadge source={edu.source} />
                  </div>
                  {edu.completedOn ? (
                    <p className="text-xs text-slate-500">{formatMonth(edu.completedOn)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
