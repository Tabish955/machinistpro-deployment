import type { Project } from "@/lib/workspace";
import { pairs } from "@/lib/workspace/report";

/**
 * The issued sheet.
 *
 * Laid out as an engineering document rather than a screen: a title block
 * naming the job and who stands behind it, the working in a table with inputs
 * beside outputs so a checker can follow it, and a signature block at the end.
 * `print-document` is the hook the print stylesheet uses to lift this — and
 * nothing else — onto the paper.
 */

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-dark-600 px-2.5 py-1.5">
      <span className="block text-[8px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="block text-[11px] font-medium text-white">{value || "—"}</span>
    </div>
  );
}

export interface ReportSections {
  variables: boolean;
  calculations: boolean;
  notes: boolean;
  signature: boolean;
}

export function ProjectReport({
  project,
  sections,
}: {
  project: Project;
  sections: ReportSections;
}) {
  const issued = fmtDate(Date.now());

  return (
    <div className="print-document rounded-xl border border-dark-600 bg-dark-900/40 p-5">
      {/* ── Title block ── */}
      <div className="avoid-break">
        <div className="flex items-start justify-between gap-4 border-b-2 border-dark-500 pb-2.5">
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide text-white">
              Engineering Calculation Sheet
            </h1>
            <p className="text-[11px] text-gray-400">{project.company || "MachinistPro"}</p>
          </div>
          <div className="text-right text-[10px] text-gray-500">
            <p>Issued {issued}</p>
            <p>Rev {project.revision || "A"}</p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-px sm:grid-cols-4">
          <Field label="Project" value={project.name} />
          <Field label="Client" value={project.client} />
          <Field label="Job Number" value={project.jobNumber} />
          <Field label="Revision" value={project.revision} />
          <Field label="Prepared By" value={project.preparedBy} />
          <Field label="Checked By" value={project.checkedBy} />
          <Field label="Created" value={fmtDate(project.createdAt)} />
          <Field label="Last Modified" value={fmtDate(project.updatedAt)} />
        </div>

        {project.description && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">{project.description}</p>
        )}
      </div>

      {/* ── Variables ── */}
      {sections.variables && project.variables.length > 0 && (
        <section className="mt-5 avoid-break">
          <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
            1 · Design Parameters
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-10 border border-dark-600 px-2 py-1 text-left text-gray-400">#</th>
                <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">
                  Parameter
                </th>
                <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">Value</th>
                <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">Unit</th>
              </tr>
            </thead>
            <tbody>
              {project.variables.map((v, i) => (
                <tr key={v.id}>
                  <td className="border border-dark-600 px-2 py-1 text-gray-500">{i + 1}</td>
                  <td className="border border-dark-600 px-2 py-1 text-white">{v.name || "—"}</td>
                  <td className="border border-dark-600 px-2 py-1 font-mono text-white">
                    {v.value || "—"}
                  </td>
                  <td className="border border-dark-600 px-2 py-1 text-gray-400">{v.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Calculations ── */}
      {sections.calculations && (
        <section className="mt-5">
          <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
            2 · Calculations
          </h2>
          {project.calculations.length === 0 ? (
            <p className="text-[11px] text-gray-500">No calculations recorded.</p>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-10 border border-dark-600 px-2 py-1 text-left text-gray-400">
                    #
                  </th>
                  <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">
                    Description
                  </th>
                  <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">
                    Inputs
                  </th>
                  <th className="border border-dark-600 px-2 py-1 text-left text-gray-400">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {project.calculations.map((c, i) => (
                  <tr key={c.id}>
                    <td className="border border-dark-600 px-2 py-1 align-top text-gray-500">
                      {i + 1}
                    </td>
                    <td className="border border-dark-600 px-2 py-1 align-top">
                      <span className="block text-white">{c.title}</span>
                      <span className="block text-[9px] text-gray-500">{c.moduleLabel}</span>
                    </td>
                    <td className="border border-dark-600 px-2 py-1 align-top font-mono text-[10px] text-gray-400">
                      {pairs(c.inputs) || "—"}
                    </td>
                    <td className="border border-dark-600 px-2 py-1 align-top font-mono text-[10px] text-white">
                      {pairs(c.outputs) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── Notes ── */}
      {sections.notes && project.notes.trim() && (
        <section className="mt-5 avoid-break">
          <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
            3 · Notes
          </h2>
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-gray-300">
            {project.notes}
          </pre>
        </section>
      )}

      {/* ── Signatures ── */}
      {sections.signature && (
        <section className="mt-6 avoid-break">
          <div className="grid grid-cols-3 gap-3">
            {["Prepared by", "Checked by", "Approved by"].map((role, i) => (
              <div key={role}>
                <div className="h-8 border-b border-dark-500" />
                <p className="mt-1 text-[9px] uppercase tracking-wider text-gray-500">{role}</p>
                <p className="text-[10px] text-white">
                  {i === 0 ? project.preparedBy || " " : i === 1 ? project.checkedBy || " " : " "}
                </p>
                <p className="mt-1.5 text-[9px] text-gray-600">Date: ____________</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-5 border-t border-dark-700 pt-2 text-center text-[9px] text-gray-600">
        {project.name}
        {project.jobNumber && ` · Job ${project.jobNumber}`} · Rev {project.revision || "A"} ·
        Generated by MachinistPro on {issued}
      </p>
    </div>
  );
}
