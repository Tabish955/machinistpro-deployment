import { useState, useMemo, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { TEMPLATES, type Project, type ProjectVar, type SavedCalc } from "@/lib/workspace";
import { projectToCSV, parseProjectJSON, fileStem } from "@/lib/workspace/report";
import { ProjectReport, type ReportSections } from "@/components/workspace/project-report";
import { AddFromHistory } from "@/components/workspace/add-from-history";
import { toast } from "@/store/toast-store";
import { relativeTime } from "@/lib/core/history";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  BookOpen,
  Plus,
  Search,
  X,
  Star,
  Archive,
  Trash2,
  Copy,
  ChevronRight,
  FileText,
  Variable,
  Calculator,
  Download,
  Printer,
  ArrowLeft,
  MoreHorizontal,
  Upload,
  Sheet,
} from "lucide-react";

/** Hand a generated file to the browser as a download. */
function download(filename: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ═══ Project Detail View ════════════════════════════════════════════════════ */

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const {
    updateProject,
    addVariable,
    updateVariable,
    removeVariable,
    updateNotes,
    removeCalcFromProject,
    addCalcToProject,
  } = useWorkspaceStore();
  const [tab, setTab] = useState<"overview" | "calcs" | "notes" | "vars" | "report">("overview");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client);
  const [jobNum, setJobNum] = useState(project.jobNumber);
  const [desc, setDesc] = useState(project.description);
  const [newVarName, setNewVarName] = useState("");
  const [newVarVal, setNewVarVal] = useState("");
  const [newVarUnit, setNewVarUnit] = useState("");
  const [notes, setNotes] = useState(project.notes);
  const [company, setCompany] = useState(project.company ?? "");
  const [revision, setRevision] = useState(project.revision ?? "A");
  const [preparedBy, setPreparedBy] = useState(project.preparedBy ?? "");
  const [checkedBy, setCheckedBy] = useState(project.checkedBy ?? "");
  const [showAddCalc, setShowAddCalc] = useState(false);
  const [sections, setSections] = useState<ReportSections>({
    variables: true,
    calculations: true,
    notes: true,
    signature: true,
  });
  const [notesDirty, setNotesDirty] = useState(false);

  const saveInfo = () => {
    updateProject(project.id, {
      name,
      client,
      jobNumber: jobNum,
      description: desc,
      company,
      revision,
      preparedBy,
      checkedBy,
    });
    setEditing(false);
  };

  const saveNotes = () => {
    updateNotes(project.id, notes);
    setNotesDirty(false);
  };

  const addVar = () => {
    if (!newVarName.trim()) return;
    addVariable(project.id, { name: newVarName, value: newVarVal, unit: newVarUnit });
    setNewVarName("");
    setNewVarVal("");
    setNewVarUnit("");
  };

  const handleExport = () => {
    download(
      `${fileStem(project.name)}.json`,
      JSON.stringify(project, null, 2),
      "application/json",
    );
  };

  const handleCSV = () => {
    download(`${fileStem(project.name)}.csv`, projectToCSV(project), "text/csv;charset=utf-8");
  };

  /**
   * Printing has to show the Report first. The print stylesheet lifts whichever
   * element carries `print-document` onto the paper, and that element only
   * exists while the Report tab is open — printing from the Notes tab used to
   * put a textarea on the page.
   */
  const handlePrint = () => {
    if (tab !== "report") {
      setTab("report");
      // Let the report mount before the print dialog freezes the page.
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      return;
    }
    window.print();
  };

  const TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "calcs" as const, label: `Calculations (${project.calculations.length})` },
    { id: "notes" as const, label: "Notes" },
    { id: "vars" as const, label: `Variables (${project.variables.length})` },
    { id: "report" as const, label: "Report" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-white cursor-pointer">
          ← All Projects
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={handleExport}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 cursor-pointer"
            title="Export"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 cursor-pointer"
            title="Print"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${tab === t.id ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <Card variant="solid" padding="lg" className="border-dark-600">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                  Project Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Client
                  </label>
                  <input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Job #
                  </label>
                  <input
                    value={jobNum}
                    onChange={(e) => setJobNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Company / Shop
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Appears on the sheet"
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Revision
                  </label>
                  <input
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    placeholder="A"
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Prepared by
                  </label>
                  <input
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                    Checked by
                  </label>
                  <input
                    value={checkedBy}
                    onChange={(e) => setCheckedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                  Description
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveInfo}
                  className="px-4 py-2 rounded-xl bg-accent-cyan/20 text-accent-cyan text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{project.name}</h2>
                  {project.client && (
                    <p className="text-sm text-gray-400 mt-1">Client: {project.client}</p>
                  )}
                  {project.jobNumber && (
                    <p className="text-xs text-gray-500">Job #: {project.jobNumber}</p>
                  )}
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-2">{project.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-700 cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="flex gap-4 text-[10px] text-gray-600">
                <span>Created: {fmtDate(project.createdAt)}</span>
                <span>Modified: {fmtDate(project.updatedAt)}</span>
                <span>{project.calculations.length} calculations</span>
                <span>{project.variables.length} variables</span>
              </div>
              {project.tags.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {project.tags.map((t) => (
                    <Badge key={t} color="gray" className="text-[8px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Calculations */}
      {tab === "calcs" && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAddCalc((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 cursor-pointer"
          >
            <Plus size={14} /> Add calculation from history
          </button>

          {showAddCalc && (
            <AddFromHistory
              project={project}
              onAdd={(calc) => addCalcToProject(project.id, calc)}
              onClose={() => setShowAddCalc(false)}
            />
          )}

          {project.calculations.length === 0 ? (
            <Card variant="solid" padding="md" className="border-dark-600 text-center py-8">
              <Calculator size={28} className="text-dark-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No calculations saved</p>
              <p className="text-[10px] text-gray-700 mt-1">
                Work anything out in a calculator, then add it here from history
              </p>
            </Card>
          ) : (
            project.calculations.map((c) => (
              <Card key={c.id} variant="solid" padding="md" className="border-dark-600 group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge color="blue" className="text-[8px]">
                        {c.moduleLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-white mt-1">{c.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(c.outputs).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-mono text-gray-500">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCalcFromProject(project.id, c.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Notes */}
      {tab === "notes" && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Notes" className="!mb-0" />
            {notesDirty && (
              <button
                onClick={saveNotes}
                className="px-3 py-1 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
            className="w-full h-64 px-4 py-3 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white font-mono focus:outline-none focus:border-accent-cyan/50 resize-none leading-relaxed"
            placeholder="# Project Notes&#10;&#10;Write your notes here…"
          />
          <p className="text-[10px] text-gray-700 mt-2">
            Supports plain text and markdown-style formatting
          </p>
        </Card>
      )}

      {/* Variables */}
      {tab === "vars" && (
        <div className="space-y-3">
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Add Variable" />
            <div className="flex gap-2">
              <input
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Name"
                className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
              />
              <input
                value={newVarVal}
                onChange={(e) => setNewVarVal(e.target.value)}
                placeholder="Value"
                className="w-28 px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
              />
              <input
                value={newVarUnit}
                onChange={(e) => setNewVarUnit(e.target.value)}
                placeholder="Unit"
                className="w-20 px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:outline-none"
              />
              <button
                onClick={addVar}
                className="px-3 py-2 rounded-xl bg-accent-cyan/20 text-accent-cyan text-xs font-semibold cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>
          </Card>
          {project.variables.map((v) => (
            <Card key={v.id} variant="solid" padding="sm" className="border-dark-600 group">
              <div className="flex items-center gap-3 px-3 py-2">
                <Variable size={14} className="text-gray-600 shrink-0" />
                <span className="text-sm font-medium text-white flex-1">{v.name}</span>
                <span className="text-sm font-mono text-accent-cyan">{v.value}</span>
                {v.unit && <span className="text-[10px] text-gray-600">{v.unit}</span>}
                <button
                  onClick={() => removeVariable(project.id, v.id)}
                  className="p-1 rounded text-gray-600 hover:text-accent-red opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </Card>
          ))}
          {project.variables.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No variables defined</p>
          )}
        </div>
      )}

      {/* Report */}
      {tab === "report" && (
        <div className="space-y-3">
          {/* Controls. print-hide keeps them off the paper. */}
          <Card variant="solid" padding="md" className="border-dark-600 print-hide">
            <SectionHeader title="Sheet contents" />
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["variables", "Parameters"],
                  ["calculations", "Calculations"],
                  ["notes", "Notes"],
                  ["signature", "Sign-off"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSections((s0) => ({ ...s0, [key]: !s0[key] }))}
                  aria-pressed={sections[key]}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                    sections[key]
                      ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                      : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-accent-cyan/10 px-4 py-2.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 cursor-pointer"
              >
                <Printer size={14} /> Print / Save as PDF
              </button>
              <button
                onClick={handleCSV}
                className="flex items-center gap-2 rounded-xl bg-dark-700 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
              >
                <Sheet size={14} /> Export CSV
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl bg-dark-700 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-600">
              In the print dialog choose &ldquo;Save as PDF&rdquo; as the destination to get a file
              you can send.
            </p>
          </Card>

          <ProjectReport project={project} sections={sections} />
        </div>
      )}
    </div>
  );
}

/* ═══ Main Workspace Page ════════════════════════════════════════════════════ */

export default function WorkspacePage() {
  const {
    projects,
    addProject,
    deleteProject,
    togglePin,
    archiveProject,
    duplicateProject,
    getActiveProjects,
    getPinnedProjects,
    importProject,
  } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * Read an exported project back in. Export on its own is a backup that can
   * never be restored, and it is also how a job gets passed between two people.
   */
  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseProjectJSON(await file.text());
    if (!result.ok || !result.project) {
      toast.error("Could not import that file", result.error);
      return;
    }
    importProject(result.project);
    toast.success("Project imported", result.project.name);
  };
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => {
    const pool = showArchived ? projects.filter((p) => p.isArchived) : getActiveProjects();
    if (!query.trim()) return pool;
    const q = query.toLowerCase();
    return pool.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.jobNumber.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)),
    );
  }, [projects, query, showArchived, getActiveProjects]);

  const pinned = useMemo(() => getPinnedProjects(), [projects, getPinnedProjects]);

  const selectedProject = selectedId ? projects.find((p) => p.id === selectedId) : null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = addProject(newName, templateId || undefined);
    setNewName("");
    setTemplateId("");
    setShowNew(false);
    setSelectedId(id);
  };

  // Detail view
  if (selectedProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <ProjectDetail project={selectedProject} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Engineering Workspace"
        description="Projects, notes, reports, and saved calculations"
        icon={<BookOpen size={22} className="text-accent-cyan" />}
        iconColor="cyan"
        status="available"
        actions={
          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 text-gray-400 text-xs font-semibold cursor-pointer hover:text-white transition-all"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/20 text-accent-cyan text-xs font-semibold cursor-pointer hover:bg-accent-cyan/30 transition-all"
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        }
      />

      {/* New project form */}
      {showNew && (
        <Card variant="solid" padding="md" className="border-accent-cyan/30 animate-fade-in">
          <SectionHeader title="Create New Project" />
          <div className="space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name…"
              className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
              autoFocus
            />
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold mb-2">
                Template (optional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTemplateId("")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${!templateId ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
                >
                  Blank
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${templateId === t.id ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-accent-cyan text-dark-950 text-xs font-bold cursor-pointer"
              >
                Create Project
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl text-gray-500 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${showArchived ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30" : "bg-dark-800 text-gray-500 border border-dark-600 hover:text-white"}`}
        >
          <Archive size={14} />
        </button>
      </div>

      {/* Pinned */}
      {pinned.length > 0 && !showArchived && (
        <div>
          <SectionHeader title="Pinned Projects" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pinned.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="text-left p-4 rounded-xl bg-dark-800/60 border border-accent-cyan/20 hover:bg-dark-800 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star size={12} className="text-accent-amber fill-accent-amber" />
                  <span className="text-sm font-semibold text-white group-hover:text-accent-cyan truncate">
                    {p.name}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600">
                  {p.calculations.length} calcs · Updated {relativeTime(p.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects list */}
      <SectionHeader
        title={showArchived ? "Archived Projects" : "All Projects"}
        description={`${active.length} project${active.length !== 1 ? "s" : ""}`}
      />
      {active.length === 0 ? (
        <Card variant="solid" padding="lg" className="border-dark-600 text-center py-12">
          <FileText size={32} className="text-dark-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {showArchived ? "No archived projects" : "No projects yet"}
          </p>
          {!showArchived && (
            <p className="text-[10px] text-gray-700 mt-1">Create your first engineering project</p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <Card key={p.id} variant="solid" padding="md" className="border-dark-600 group">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(p.id)}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white group-hover:text-accent-cyan transition-colors truncate">
                      {p.name}
                    </p>
                    {p.isPinned && (
                      <Star size={10} className="text-accent-amber fill-accent-amber shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {p.client && `${p.client} · `}
                    {p.calculations.length} calcs · {relativeTime(p.updatedAt)}
                  </p>
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePin(p.id)}
                    className={`p-1.5 rounded-lg cursor-pointer ${p.isPinned ? "text-accent-amber" : "text-gray-600 hover:text-accent-amber"}`}
                  >
                    <Star size={12} fill={p.isPinned ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => duplicateProject(p.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-white cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => archiveProject(p.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-accent-amber cursor-pointer"
                  >
                    <Archive size={12} />
                  </button>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <ChevronRight size={14} className="text-gray-700 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
