import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, BarChart3, Bell, BriefcaseBusiness, Check, ChevronRight, ClipboardList, Download,
  FileText, Flag, GraduationCap, LayoutDashboard, LockKeyhole, MapPin, Plus, Search, ShieldCheck,
  Sparkles, Target, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api, download } from "./api.js";

const candidateNav = [
  ["overview", "Career overview", LayoutDashboard],
  ["applications", "My applications", BriefcaseBusiness],
  ["saved", "Saved jobs", LockKeyhole],
  ["recommendations", "Job recommendations", Target],
  ["resume", "Resume analyzer", FileText],
  ["roadmap", "Career roadmap", GraduationCap],
  ["assessments", "Skill assessments", ClipboardList],
  ["interviews", "Interview schedule", Bell],
  ["notifications", "Notifications", Bell],
  ["settings", "Account settings", ShieldCheck],
  ["support", "Reports & support", Flag],
];
const recruiterNav = [
  ["overview", "Recruiter overview", LayoutDashboard],
  ["jobs", "Manage jobs", BriefcaseBusiness],
  ["applicants", "Applicants", Users],
  ["company", "Company profile", GraduationCap],
  ["interviews", "Interview management", Bell],
  ["analytics", "Recruitment analytics", BarChart3],
  ["notifications", "Notifications", Bell],
  ["settings", "Account settings", ShieldCheck],
  ["support", "Reports & support", Flag],
];
const adminNav = [
  ["overview", "Platform dashboard", LayoutDashboard],
  ["users", "User management", Users],
  ["jobs", "Job management", BriefcaseBusiness],
  ["reports", "Reports & complaints", Flag],
  ["categories", "Categories & skills", GraduationCap],
  ["analytics", "Platform analytics", BarChart3],
  ["audit", "Audit log", ClipboardList],
  ["settings", "Account settings", ShieldCheck],
];

export default function Workspace({ page, id, user, notify }) {
  const nav = user.role === "admin" ? adminNav : user.role === "recruiter" ? recruiterNav : candidateNav;
  const titles = useMemo(() => new Map(nav.map(([key, title]) => [key, title])), [nav]);
  if (page === "applicant" && (user.role === "recruiter" || user.role === "admin")) {
    return <ApplicantDetails id={id} user={user} notify={notify} />;
  }
  return (
    <div className="workspace-shell section">
      <aside className="workspace-nav">
        <div className="workspace-user"><span>{user.name?.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.role} workspace</small></div></div>
        <span className="workspace-nav-kicker">YOUR WORKSPACE</span>
        {nav.map(([key, title, Icon]) => (
          <Link className={`workspace-nav-link ${page === key ? "workspace-nav-active" : ""}`} to={`/workspace/${key}`} key={key}>
            <Icon size={16} /><span>{title}</span>{page === key && <ChevronRight size={14} />}
          </Link>
        ))}
        <Link className="workspace-browse" to="/jobs"><Search size={15} />Browse open roles</Link>
      </aside>
      <main className="workspace-main">
        <div className="workspace-page-title"><div><span className="eyebrow eyebrow-muted">{user.role === "admin" ? "PLATFORM ADMINISTRATION" : user.role === "recruiter" ? "RECRUITER WORKSPACE" : "YOUR CAREER SPACE"}</span><h1>{titles.get(page) || "Workspace"}</h1></div><Link className="button button-outline" to="/dashboard">Overview <ArrowRight size={14} /></Link></div>
        {page === "overview" && <Overview user={user} />}
        {page === "applications" && user.role === "candidate" && <Applications notify={notify} />}
        {page === "saved" && <SavedJobs notify={notify} />}
        {page === "recommendations" && <Recommendations />}
        {page === "resume" && <ResumeTools notify={notify} />}
        {page === "roadmap" && <Roadmap />}
        {page === "assessments" && <Assessments />}
        {page === "interviews" && <Interviews user={user} notify={notify} />}
        {page === "notifications" && <Notifications notify={notify} />}
        {page === "settings" && <Settings user={user} notify={notify} />}
        {page === "support" && <Support />}
        {page === "jobs" && user.role !== "candidate" && <ManageJobs user={user} notify={notify} />}
        {page === "applicants" && user.role === "recruiter" && <Applications notify={notify} recruiter />}
        {page === "company" && user.role === "recruiter" && <CompanyProfile notify={notify} />}
        {page === "analytics" && user.role !== "candidate" && <Analytics user={user} />}
        {page === "users" && user.role === "admin" && <AdminUsers notify={notify} />}
        {page === "reports" && user.role === "admin" && <AdminReports notify={notify} />}
        {page === "categories" && user.role === "admin" && <Categories notify={notify} />}
        {page === "audit" && user.role === "admin" && <AuditLog />}
        {!titles.has(page) && <div className="workspace-panel"><h2>Page not available</h2><p>This section is not part of this account’s workspace.</p></div>}
      </main>
    </div>
  );
}

function useResource(path, key) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    api(path).then((result) => { setData(result); setError(""); }).catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  }, [path]);
  useEffect(refresh, [refresh, key]);
  return { data, error, loading, refresh };
}

function Panel({ title, description, children, actions }) {
  return <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</div>{children}</section>;
}

function LoadingOrError({ loading, error, children, retry }) {
  if (loading) return <div className="workspace-feedback">Loading securely from your account…</div>;
  if (error) return <div className="workspace-error" role="alert">{error} {retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
  return children;
}

function Empty({ title, text, to, action = "Explore jobs" }) {
  return <div className="workspace-empty"><span><Sparkles size={20} /></span><h3>{title}</h3><p>{text}</p>{to && <Link className="text-link" to={to}>{action} <ArrowRight size={14} /></Link>}</div>;
}

function Overview({ user }) {
  const { data: appData } = useResource("/applications/mine", user.id);
  const { data: jobData } = useResource(user.role === "candidate" ? "/recommendations" : "/jobs/mine", user.id);
  if (user.role === "admin") return <AdminOverview />;
  const isRecruiter = user.role === "recruiter";
  const applications = appData?.applications || [];
  const jobs = isRecruiter ? (jobData?.jobs || []) : [];
  const score = Math.round([user.name, user.title, user.location, user.skills?.length ? "skills" : "", user.bio].filter(Boolean).length * 20);
  return (
    <div className="overview-workspace">
      <div className="workspace-welcome-card"><div className="workspace-welcome-mark"><Sparkles size={21} /></div><div><h2>Welcome back, {user.name.split(" ")[0]}.</h2><p>{isRecruiter ? "Your hiring work, team and candidate pipeline are all here." : "A good next step doesn’t have to be a big one. Start where you are."}</p></div><Link className="button button-light" to={isRecruiter ? "/workspace/jobs" : "/workspace/recommendations"}>{isRecruiter ? "Manage your roles" : "Explore your matches"} <ArrowRight size={14} /></Link></div>
      <div className="workspace-metrics"><Metric label={isRecruiter ? "Open roles" : "Applications"} value={isRecruiter ? jobs.filter((job) => job.status === "active").length : applications.length} icon={BriefcaseBusiness} /><Metric label={isRecruiter ? "Applicants" : "In progress"} value={isRecruiter ? applications.length : applications.filter((item) => !["Rejected", "Withdrawn", "Hired"].includes(item.status)).length} icon={Users} /><Metric label={isRecruiter ? "Hires" : "Profile complete"} value={isRecruiter ? applications.filter((item) => item.status === "Hired").length : `${score}%`} icon={Target} /></div>
      <div className="workspace-two-col"><Panel title={isRecruiter ? "Recent applicants" : "Application progress"} description="Your latest updates at a glance."><LoadingOrError loading={!appData} error={null}>{applications.length ? <div className="workspace-list">{applications.slice(0, 5).map((item) => <div className="workspace-list-row" key={item._id}><span className="workspace-list-avatar">{(isRecruiter ? item.candidate?.name : item.job?.company)?.slice(0, 1) || "?"}</span><div><b>{isRecruiter ? item.candidate?.name : item.job?.title}</b><small>{isRecruiter ? item.job?.title : item.job?.company}</small></div><span className="workspace-status">{item.status}</span></div>)}</div> : <Empty title="Your next step starts here" text={isRecruiter ? "Post an opportunity and applications will appear here." : "Apply for a role and track its progress here."} to={isRecruiter ? "/workspace/jobs" : "/jobs"} action={isRecruiter ? "Manage jobs" : "Browse jobs"} />}</LoadingOrError></Panel>
        <Panel title={isRecruiter ? "Hiring at a glance" : "A little more about you"} description={isRecruiter ? "Your active openings." : "Profiles are private until you choose to apply."}>{isRecruiter ? <div className="workspace-list">{jobs.slice(0, 4).map((job) => <div className="workspace-list-row" key={job._id}><span className="workspace-list-avatar"><BriefcaseBusiness size={15} /></span><div><b>{job.title}</b><small>{job.company} · {job.location}</small></div><span className="workspace-status">{job.status}</span></div>)}{jobs.length === 0 && <Empty title="No roles posted yet" text="Add a role to begin meeting candidates." to="/workspace/jobs" action="Create a role" />}</div> : <div className="workspace-profile-prompt"><span className="workspace-progress"><b>{score}%</b></span><div><b>{user.title || "Build a profile that sounds like you."}</b><p>Add your headline, location and skills to improve recommendations.</p><Link className="text-link" to="/profile">Edit your profile <ArrowRight size={14} /></Link></div></div>}</Panel></div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return <div className="workspace-metric"><span><Icon size={18} /></span><div><small>{label}</small><b>{value}</b></div></div>;
}

function Applications({ notify, recruiter = false }) {
  const { data, error, loading, refresh } = useResource("/applications/mine", recruiter);
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState({});
  const applications = (data?.applications || []).filter((item) => !filter || item.status === filter);
  const updateStatus = async (item, status) => {
    try { const result = await api(`/applications/${item._id}/status`, { method: "PATCH", body: { status, note: feedback[item._id] || "" } }); notify(result.warning || `Application moved to ${status}.`); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  const withdraw = async (item) => {
    if (!window.confirm("Withdraw this application? This cannot be undone.")) return;
    try { await api(`/applications/${item._id}/withdraw`, { method: "PATCH", body: {} }); notify("Application withdrawn."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  const schedule = (item) => navigate(`/workspace/interviews?application=${item._id}`);
  return <Panel title={recruiter ? "Candidates in your pipeline" : "Your applications"} description={recruiter ? "Review applicants for your openings and move applications through your pipeline." : "See where each application stands and read recruiter feedback."} actions={<label className="workspace-select-label">Filter<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option>{["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Offered", "Hired", "Rejected", "Withdrawn"].map((status) => <option key={status}>{status}</option>)}</select></label>}>
    <LoadingOrError loading={loading} error={error} retry={refresh}>{applications.length ? <div className="workspace-list">{applications.map((item) => {
      const person = item.candidate || {};
      const job = item.job || {};
      return <article className="workspace-application" key={item._id}>
        <div className="workspace-application-top"><span className="workspace-list-avatar">{(recruiter ? person.name : job.company)?.slice(0, 1) || "?"}</span><div><b>{recruiter ? person.name : job.title}</b><small>{recruiter ? `${job.title} · ${person.email}` : `${job.company} · ${job.location}`}</small></div><span className={`workspace-status status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></div>
        {recruiter && <div className="workspace-application-actions"><Link className="button button-outline button-compact" to={`/workspace/applicant/${item._id}`}>View application</Link><button className="button button-outline button-compact" onClick={() => schedule(item)}>Schedule interview</button><select className="workspace-input" aria-label="Update application status" value={item.status} onChange={(event) => updateStatus(item, event.target.value)}><option>Applied</option><option>Screening</option><option>Shortlisted</option><option>Interview Scheduled</option><option>Offered</option><option>Hired</option><option>Rejected</option></select><input className="workspace-input feedback-input" placeholder="Optional feedback" value={feedback[item._id] || ""} onChange={(event) => setFeedback({ ...feedback, [item._id]: event.target.value })} /></div>}
        {!recruiter && <div className="workspace-history"><span>Applied {new Date(item.createdAt).toLocaleDateString()}</span>{item.note && <span>Recruiter feedback: {item.note}</span>}{item.history?.length > 1 && <details><summary>Application history</summary>{item.history.map((entry, index) => <p key={`${entry.status}-${index}`}>{entry.status} · {new Date(entry.changedAt).toLocaleString()} {entry.note && `— ${entry.note}`}</p>)}</details>}{!["Withdrawn", "Rejected", "Hired"].includes(item.status) && <button className="workspace-inline-danger" onClick={() => withdraw(item)}>Withdraw application</button>}</div>}
      </article>;
    })}</div> : <Empty title="No applications yet" text="When you apply for a role, it will appear here with status updates." to="/jobs" />}</LoadingOrError>
  </Panel>;
}

function SavedJobs({ notify }) {
  const { data, error, loading, refresh } = useResource("/saved-jobs");
  const remove = async (job) => {
    try { await api(`/saved-jobs/${job._id}`, { method: "DELETE" }); notify("Saved job removed."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  return <Panel title="Saved jobs" description="Keep opportunities you want to come back to in one place."><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.jobs?.length ? <div className="workspace-job-grid">{data.jobs.map((job) => <article className="workspace-job-card" key={job._id}><span className="job-category">{job.category}</span><h3><Link to={`/jobs/${job._id}`}>{job.title}</Link></h3><p>{job.company} · {job.location}</p><div><Link className="button button-primary button-compact" to={`/jobs/${job._id}`}>View role</Link><button className="workspace-inline-danger" onClick={() => remove(job)}>Remove</button></div></article>)}</div> : <Empty title="Keep a role for later" text="Save open roles while you explore. They’ll stay here for your next visit." to="/jobs" />}</LoadingOrError></Panel>;
}

function Recommendations() {
  const { data, error, loading, refresh } = useResource("/recommendations");
  return <Panel title="Recommended for you" description={data?.method || "Recommendations use your saved profile and currently open roles."}><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.recommendations?.length ? <div className="workspace-job-grid">{data.recommendations.map(({ job, score, matchedSkills, missingSkills, reasons }) => <article className="workspace-job-card recommendation-card" key={job._id}><div className="recommendation-score">{score}% <small>profile match</small></div><h3><Link to={`/jobs/${job._id}`}>{job.title}</Link></h3><p>{job.company} · {job.location} · {job.mode}</p>{matchedSkills.length > 0 && <p><b>Matching skills:</b> {matchedSkills.join(", ")}</p>}{missingSkills.length > 0 && <p><b>Skills to explore:</b> {missingSkills.join(", ")}</p>}<ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><Link className="text-link" to={`/jobs/${job._id}`}>Review role <ArrowRight size={14} /></Link></article>)}</div> : <Empty title="Add a few profile skills first" text="This matching score is based on actual profile skills and open job requirements, so updating your profile helps." to="/profile" action="Complete your profile" />}</LoadingOrError></Panel>;
}

function ResumeTools({ notify }) {
  const { data: resumeData, error, loading, refresh } = useResource("/resumes/mine");
  const { data: jobData } = useResource("/jobs?limit=30");
  const { data: analysisData, refresh: refreshAnalyses } = useResource("/resumes/analyses");
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState("");
  const uploadResume = async (event) => {
    event.preventDefault();
    if (!file) return setActionError("Choose a PDF resume first.");
    setBusy(true); setActionError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      await api("/resumes/upload", { method: "POST", body: form });
      notify("Resume uploaded and text extracted.");
      refresh();
    } catch (failure) { setActionError(failure.message); }
    finally { setBusy(false); }
  };
  const analyze = async () => {
    setBusy(true); setActionError("");
    try {
      const response = await api("/resumes/analyze", { method: "POST", body: jobId ? { jobId } : {} });
      setResult(response.analysis); refreshAnalyses(); notify("Resume review completed.");
    } catch (failure) { setActionError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="workspace-stack">
    <Panel title="Resume analyzer" description="Upload a private PDF, extract its text, and review explainable skill overlap and basic ATS checks. This is keyword analysis, not semantic AI." actions={<button className="button button-outline button-compact" onClick={() => download("/resumes/builder", "careerconnect-resume.pdf").catch((failure) => setActionError(failure.message))}><FileText size={14} />Build profile PDF</button>}>
      <LoadingOrError loading={loading} error={error} retry={refresh}><div className="resume-upload-panel"><div className="resume-upload-status"><span className="workspace-list-avatar"><FileText size={17} /></span><div><b>{resumeData?.resume?.originalName || "No resume uploaded"}</b><small>{resumeData?.resume ? `Updated ${new Date(resumeData.resume.updatedAt).toLocaleString()}` : "PDF only · maximum 5 MB · private to your account"}</small></div>{resumeData?.resume && <button className="button button-outline button-compact" onClick={() => download("/resumes/mine/download", "resume.pdf").catch((failure) => setActionError(failure.message))}><Download size={14} />Download</button>}</div><form className="resume-upload-form" onSubmit={uploadResume}><input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} aria-label="Choose PDF resume" /><button className="button button-primary button-compact" disabled={busy}>{busy ? "Uploading…" : "Upload PDF"} <ArrowRight size={14} /></button></form></div></LoadingOrError>
      <div className="resume-analyze-row"><label>Compare with an open role<select value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="">General resume review</option>{(jobData?.jobs || []).map((job) => <option value={job._id} key={job._id}>{job.title} · {job.company}</option>)}</select></label><button className="button button-dark" onClick={analyze} disabled={busy || !resumeData?.resume}>{busy ? "Reviewing…" : "Analyze resume"} <Sparkles size={15} /></button></div>
      {actionError && <p className="workspace-error" role="alert">{actionError}</p>}
    </Panel>
    {result && <ResumeResult analysis={result} />}
    <Panel title="Previous reviews" description="Your saved reports are private and can be downloaded again.">
      {analysisData?.analyses?.length ? <div className="workspace-list">{analysisData.analyses.map((analysis) => <div className="workspace-list-row" key={analysis._id}><span className="workspace-list-avatar">{analysis.score}%</span><div><b>{analysis.job ? `${analysis.job.title} · ${analysis.job.company}` : "General resume review"}</b><small>{new Date(analysis.createdAt).toLocaleString()} · keyword analysis</small></div><button className="button button-outline button-compact" onClick={() => download(`/resumes/analyses/${analysis._id}/report`, "analysis.txt").catch((failure) => notify(failure.message))}><Download size={14} />Report</button></div>)}</div> : <p className="workspace-muted">Your saved reviews will appear here.</p>}
    </Panel>
  </div>;
}

function ResumeResult({ analysis }) {
  return <Panel title={`Explainable keyword score: ${analysis.score}%`} description="This measures overlap with listed role skills and basic resume sections, not a hiring decision."><div className="resume-result-grid"><div><h3>Skills found</h3><div className="workspace-chip-list">{analysis.matchedSkills.length ? analysis.matchedSkills.map((skill) => <span className="chip-positive" key={skill}>{skill}</span>) : <span className="workspace-muted">No listed skills found.</span>}</div><h3>Skills to consider</h3><div className="workspace-chip-list">{analysis.missingSkills.length ? analysis.missingSkills.map((skill) => <span key={skill}>{skill}</span>) : <span className="workspace-muted">No listed gaps.</span>}</div></div><div><h3>Document checks</h3>{analysis.checks.map((check) => <div className="resume-check" key={check.label}><span className={check.passed ? "check-good" : "check-review"}>{check.passed ? "✓" : "!"}</span><div><b>{check.label}</b><small>{check.detail}</small></div></div>)}<h3>Suggestions</h3><ul className="resume-suggestions">{analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div></div></Panel>;
}

function Roadmap() {
  const { data, error, loading, refresh } = useResource("/roadmaps");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try { await api("/roadmaps", { method: "POST", body: { goal } }); refresh(); }
    catch (failure) { window.alert(failure.message); }
    finally { setBusy(false); }
  };
  const toggle = async (roadmap, milestone, completed) => {
    try { await api(`/roadmaps/${roadmap._id}/milestones/${milestone._id}`, { method: "PATCH", body: { completed } }); refresh(); }
    catch (failure) { window.alert(failure.message); }
  };
  return <div className="workspace-stack"><Panel title="Choose a direction" description="Create a persistent roadmap and track learning stages as you work through them."><div className="roadmap-create"><select value={goal} onChange={(event) => setGoal(event.target.value)}><option value="">Choose a career goal</option>{(data?.goals || []).map((item) => <option key={item}>{item}</option>)}</select><button className="button button-primary" disabled={!goal || busy} onClick={create}>{busy ? "Creating…" : "Create roadmap"} <Plus size={15} /></button></div></Panel><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.roadmaps?.length ? data.roadmaps.map((roadmap) => { const complete = roadmap.milestones.filter((item) => item.completedAt).length; return <Panel key={roadmap._id} title={roadmap.goal} description={`${complete} of ${roadmap.milestones.length} stages complete`}><div className="roadmap-list">{roadmap.milestones.map((item, index) => <article className="roadmap-stage" key={item._id}><button className={`roadmap-check ${item.completedAt ? "roadmap-done" : ""}`} onClick={() => toggle(roadmap, item, !item.completedAt)} aria-label={item.completedAt ? "Mark incomplete" : "Mark complete"}>{item.completedAt ? <Check size={16} /> : index + 1}</button><div><h3>{item.title}</h3><p>{item.description}</p><div className="roadmap-resources">{item.resources.map((resource) => <a href={resource} target="_blank" rel="noreferrer" key={resource}>Learning resource <ArrowRight size={12} /></a>)}</div></div></article>)}</div></Panel>; }) : !loading && <Empty title="Your learning plan starts with a goal" text="Choose a career direction to create a roadmap with stages, practical projects, and learning resources." />}</LoadingOrError></div>;
}

function Assessments() {
  const { data, error, loading, refresh } = useResource("/assessments");
  const { data: history, refresh: refreshHistory } = useResource("/assessments/results");
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const start = async (key) => {
    setResult(null);
    try {
      const response = await api(`/assessments/${key}/start`, { method: "POST", body: {} });
      setActive({ ...response.assessment, attempt: response.attempt });
      setAnswers({});
      setTimeLeft(Math.ceil((new Date(response.attempt.expiresAt).getTime() - Date.now()) / 1000));
    } catch (failure) { setResult({ error: failure.message }); }
  };
  const submit = useCallback(async () => {
    if (!active || busy) return;
    if (Object.keys(answers).length !== active.questions.length) return setResult({ error: "Answer every question before submitting." });
    setBusy(true);
    try {
      const response = await api(`/assessments/${active.key}/submit`, { method: "POST", body: { attemptId: active.attempt.id, answers, durationSeconds: active.minutes * 60 - timeLeft } });
      setResult({ result: response.result });
      setActive(null);
      refreshHistory();
    } catch (failure) { setResult({ error: failure.message }); setActive(null); }
    finally { setBusy(false); }
  }, [active, answers, busy, refreshHistory, timeLeft]);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setTimeLeft(Math.max(0, Math.ceil((new Date(active.attempt.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => { if (active && timeLeft === 0) submit(); }, [active, timeLeft, submit]);
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  if (active) return <Panel title={active.title} description={`Timed assessment · ${formatTime(timeLeft)} remaining · ${active.questions.length} questions`} actions={<span className="workspace-status">Server-verified timer</span>}><div className="assessment-questions">{active.questions.map((question, index) => <fieldset className="assessment-question" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.choices.map((choice, choiceIndex) => <label key={choice}><input type="radio" name={question.id} checked={answers[question.id] === choiceIndex} onChange={() => setAnswers({ ...answers, [question.id]: choiceIndex })} />{choice}</label>)}</fieldset>)}<button className="button button-primary" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit answers"} <ArrowRight size={14} /></button></div></Panel>;
  return <div className="workspace-stack"><Panel title="Skill assessments" description="Short timed multiple-choice quizzes are scored on the server. Results are saved to your account."><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.assessments?.length ? <div className="workspace-job-grid">{data.assessments.map((assessment) => <article className="workspace-job-card" key={assessment.key}><span className="job-category">{assessment.category} · {assessment.minutes} min</span><h3>{assessment.title}</h3><p>{assessment.questions.length} questions. You’ll see your score once the timer ends or you submit.</p><button className="button button-primary button-compact" onClick={() => start(assessment.key)}>Start assessment <ArrowRight size={14} /></button></article>)}</div> : <Empty title="No assessments available" text="Please check back later." />}</LoadingOrError></Panel>
    {result && <Panel title={result.error ? "Assessment wasn’t submitted" : "Your result"}>{result.error ? <p className="workspace-error">{result.error}</p> : <div className="assessment-result"><strong>{result.result.score}/{result.result.total}</strong><span>{Math.round(result.result.score / result.result.total * 100)}% correct · saved {new Date(result.result.createdAt).toLocaleString()}</span></div>}</Panel>}
    <Panel title="Past results" description="Completed results are stored in your assessment history.">{history?.results?.length ? <div className="workspace-list">{history.results.map((item) => <div className="workspace-list-row" key={item._id}><span className="workspace-list-avatar">{item.score}/{item.total}</span><div><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleString()}</small></div><span>{Math.round(item.score / item.total * 100)}%</span></div>)}</div> : <p className="workspace-muted">Your completed assessments will appear here.</p>}</Panel></div>;
}

function Interviews({ user, notify }) {
  const { data, error, loading, refresh } = useResource("/interviews", user.role);
  const [params] = useSearchParams();
  const [applicationData, setApplicationData] = useState([]);
  const [form, setForm] = useState({ applicationId: params.get("application") || "", scheduledAt: "", format: "Online", meetingLink: "", location: "", instructions: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user.role !== "recruiter" && user.role !== "admin") return;
    api("/applications/mine").then(({ applications }) => setApplicationData(applications.filter((item) => !["Rejected", "Withdrawn", "Hired"].includes(item.status)))).catch((failure) => notify(failure.message));
  }, [user.role, notify]);
  const schedule = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api("/interviews", { method: "POST", body: { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() } });
      notify(result.warning || "Interview scheduled.");
      setForm({ applicationId: "", scheduledAt: "", format: "Online", meetingLink: "", location: "", instructions: "" });
      refresh();
    } catch (failure) { notify(failure.message); }
    finally { setBusy(false); }
  };
  const update = async (interview, updates) => {
    try { const result = await api(`/interviews/${interview._id}`, { method: "PATCH", body: updates }); notify(result.warning || "Interview updated."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  return <div className="workspace-stack">
    {(user.role === "recruiter" || user.role === "admin") && <Panel title="Schedule an interview" description="Only candidates who applied to your job can be invited."><form className="workspace-form-grid" onSubmit={schedule}><label>Application<select required value={form.applicationId} onChange={(event) => setForm({ ...form, applicationId: event.target.value })}><option value="">Choose an applicant</option>{applicationData.map((item) => <option key={item._id} value={item._id}>{item.candidate?.name} · {item.job?.title}</option>)}</select></label><label>Date and time<input type="datetime-local" required value={form.scheduledAt} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label><label>Format<select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })}><option>Online</option><option>In person</option></select></label>{form.format === "Online" ? <label>Secure meeting URL<input type="url" required pattern="https://.*" value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} /></label> : <label>Interview location<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>}<label className="workspace-form-wide">Instructions<textarea rows="2" maxLength="2000" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label><button className="button button-primary" disabled={busy || !applicationData.length}>{busy ? "Scheduling…" : "Schedule interview"} <ArrowRight size={14} /></button></form></Panel>}
    <Panel title={user.role === "candidate" ? "Your interview schedule" : "Scheduled interviews"} description={user.role === "candidate" ? "Your recruiter will share meeting details here." : "Manage upcoming interviews and follow-up."}><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.interviews?.length ? <div className="workspace-list">{data.interviews.map((interview) => <InterviewCard key={interview._id} interview={interview} candidate={user.role === "candidate"} onUpdate={update} />)}</div> : <Empty title="Nothing scheduled yet" text="Upcoming and past interviews will appear here." />}</LoadingOrError></Panel>
  </div>;
}

function InterviewCard({ interview, candidate, onUpdate }) {
  const [feedback, setFeedback] = useState(interview.feedback || "");
  return <article className="workspace-interview"><div className="workspace-interview-date"><b>{new Date(interview.scheduledAt).toLocaleDateString([], { day: "2-digit" })}</b><span>{new Date(interview.scheduledAt).toLocaleDateString([], { month: "short" })}</span></div><div className="workspace-interview-main"><b>{candidate ? `Interview with ${interview.recruiter?.company || interview.recruiter?.name}` : `Interview with ${interview.candidate?.name}`}</b><small>{new Date(interview.scheduledAt).toLocaleString()} · {interview.format} · {interview.status}</small>{interview.format === "Online" && <a href={interview.meetingLink} target="_blank" rel="noreferrer">Open secure meeting link <ArrowRight size={13} /></a>}{interview.format === "In person" && <span>{interview.location}</span>}{interview.instructions && <p>{interview.instructions}</p>}{candidate && interview.status === "Scheduled" && <div className="interview-feedback"><textarea rows="2" maxLength="2000" placeholder="Private feedback for yourself" value={feedback} onChange={(event) => setFeedback(event.target.value)} /><button className="button button-outline button-compact" onClick={() => onUpdate(interview, { feedback, status: "Completed" })}>Save feedback</button></div>}</div>{!candidate && interview.status === "Scheduled" && <div className="interview-recruiter-actions"><button onClick={() => onUpdate(interview, { status: "Cancelled" })}>Cancel</button><button onClick={() => { const date = window.prompt("Enter the new date and time (YYYY-MM-DDTHH:mm):"); if (date) onUpdate(interview, { scheduledAt: new Date(date).toISOString() }); }}>Reschedule</button></div>}</article>;
}

function Notifications({ notify }) {
  const { data, error, loading, refresh } = useResource("/notifications");
  const read = async (item) => {
    try { await api(`/notifications/${item._id}/read`, { method: "PATCH", body: {} }); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  const readAll = async () => {
    try { await api("/notifications/read-all", { method: "PATCH", body: {} }); refresh(); notify("Notifications marked as read."); }
    catch (failure) { notify(failure.message); }
  };
  return <Panel title="Notifications" description={`${data?.unread || 0} unread updates`} actions={Boolean(data?.unread) && <button className="button button-outline button-compact" onClick={readAll}>Mark all read</button>}><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.notifications?.length ? <div className="workspace-list">{data.notifications.map((item) => <div className={`workspace-notification ${item.readAt ? "" : "notification-unread"}`} key={item._id}><span><Bell size={16} /></span><div><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div><div>{item.link && <Link to={item.link}>Open</Link>}{!item.readAt && <button onClick={() => read(item)}>Mark read</button>}</div></div>)}</div> : <Empty title="You’re all caught up" text="Application changes and interview updates will show up here." />}</LoadingOrError></Panel>;
}

function Settings({ user, notify }) {
  const { data, error, loading, refresh } = useResource("/notifications");
  const [preferences, setPreferences] = useState(user.notificationPreferences || { applications: true, interviews: true, recommendations: true });
  const [saving, setSaving] = useState(false);
  const save = async (next) => {
    setPreferences(next); setSaving(true);
    try { await api("/notifications/preferences", { method: "PATCH", body: next }); notify("Notification preferences saved."); }
    catch (failure) { notify(failure.message); refresh(); }
    finally { setSaving(false); }
  };
  const deactivate = async () => {
    if (!window.confirm("Deactivate this account? You will be signed out and cannot sign in again until an administrator reactivates it.")) return;
    try { await api("/auth/account", { method: "PATCH", body: { accountActive: false } }); localStorage.removeItem("cc-token"); localStorage.removeItem("cc-user"); window.location.assign("/"); }
    catch (failure) { notify(failure.message); }
  };
  return <div className="workspace-stack"><Panel title="Notification preferences" description="Choose which in-app updates to receive."><LoadingOrError loading={loading} error={error} retry={refresh}>{["applications", "interviews", "recommendations"].map((key) => <label className="workspace-setting-row" key={key}><span><b>{key[0].toUpperCase() + key.slice(1)}</b><small>{key === "applications" ? "Applications and pipeline updates" : key === "interviews" ? "Scheduling and interview changes" : "Matching job announcements"}</small></span><input type="checkbox" checked={preferences[key] !== false} disabled={saving} onChange={(event) => save({ ...preferences, [key]: event.target.checked })} /></label>)}</LoadingOrError></Panel><Panel title="Account information" description={`${user.name} · ${user.email} · ${user.role}`}><div className="workspace-profile-prompt"><span className="settings-secure"><ShieldCheck size={19} /></span><div><b>Your account data stays private</b><p>Change your profile details or update your password from account recovery.</p><Link className="text-link" to="/profile">Edit profile <ArrowRight size={14} /></Link></div></div>{user.role !== "admin" && <button className="workspace-inline-danger" onClick={deactivate}>Deactivate my account</button>}</Panel></div>;
}

function Support() {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setStatus("");
    try { await api("/reports", { method: "POST", body: form }); setForm({ subject: "", message: "" }); setStatus("Report submitted. The platform team can review it in the admin workspace."); }
    catch (failure) { setStatus(failure.message); }
    finally { setBusy(false); }
  };
  return <Panel title="Reports and support" description="Report a job posting, account issue, or conduct concern to the platform team."><form className="workspace-form-grid support-form" onSubmit={submit}><label>Subject<input required maxLength="160" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label className="workspace-form-wide">What happened?<textarea rows="5" required maxLength="3000" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label><button className="button button-primary" disabled={busy}>{busy ? "Sending…" : "Submit report"} <ArrowRight size={14} /></button>{status && <span className="workspace-muted" role="status">{status}</span>}</form></Panel>;
}

function ManageJobs({ user, notify }) {
  const { data, error, loading, refresh } = useResource(user.role === "admin" ? "/admin/jobs" : "/jobs/mine");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const closeJob = async (job, status) => {
    try { const result = await api(user.role === "admin" ? `/admin/jobs/${job._id}` : `/jobs/${job._id}`, { method: "PATCH", body: { status } }); notify(result.warning || (status === "active" ? "Role republished." : "Role closed.")); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  const updateJob = async (event) => {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.skills = String(body.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
    try { const result = await api(`/jobs/${editing._id}`, { method: "PATCH", body }); notify(result.warning || "Job updated."); setEditing(null); refresh(); }
    catch (failure) { notify(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="workspace-stack">{user.role === "recruiter" && <Panel title="Post an opportunity" description="Create a live role. It appears immediately in public search."><JobComposer company={user.company} onDone={(warning) => { notify(warning || "Role published."); refresh(); }} /></Panel>}
    <Panel title={user.role === "admin" ? "Platform job listings" : "Your job listings"} description="Review roles, edit details, close filled roles, or reopen a listing."><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.jobs?.length ? <div className="workspace-list">{data.jobs.map((job) => <article className="workspace-managed-job" key={job._id}><div className="workspace-list-row"><span className="workspace-list-avatar"><BriefcaseBusiness size={15} /></span><div><b>{job.title}</b><small>{job.company} · {job.location} · {job.mode} · {job.type}</small></div><span className={`workspace-status status-${job.status}`}>{job.status}</span></div><div className="workspace-job-actions"><button className="button button-outline button-compact" onClick={() => setEditing(editing?._id === job._id ? null : job)}>{editing?._id === job._id ? "Cancel edit" : "Edit details"}</button>{job.status === "active" ? <button className="workspace-inline-danger" onClick={() => closeJob(job, "closed")}>Close role</button> : <button className="button button-outline button-compact" onClick={() => closeJob(job, "active")}>Publish again</button>}</div>{editing?._id === job._id && <form className="workspace-form-grid edit-job-form" onSubmit={updateJob}><label>Job title<input name="title" defaultValue={job.title} maxLength="120" required /></label><label>Company<input name="company" defaultValue={job.company} maxLength="120" required readOnly={user.role === "recruiter"} /></label><label>Location<input name="location" defaultValue={job.location} maxLength="120" required /></label><label>Work style<select name="mode" defaultValue={job.mode}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label><label>Employment type<select name="type" defaultValue={job.type}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label>Salary<input name="salary" defaultValue={job.salary} maxLength="80" /></label><label className="workspace-form-wide">Skills, comma separated<input name="skills" defaultValue={job.skills?.join(", ")} /></label><label className="workspace-form-wide">Description<textarea name="description" rows="4" defaultValue={job.description} maxLength="10000" required /></label><button className="button button-primary" disabled={busy}>Save changes</button></form>}</article>)}</div> : <Empty title="No roles yet" text="Post a clear role description and share it with candidates who fit." />}</LoadingOrError></Panel></div>;
}

function JobComposer({ company, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.skills = body.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    try { const result = await api("/jobs", { method: "POST", body }); event.currentTarget.reset(); onDone(result.warning); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <form className="workspace-form-grid" onSubmit={submit}><label>Title<input name="title" maxLength="120" required /></label><label>Company<input name="company" defaultValue={company} maxLength="120" required readOnly /></label><label>Location<input name="location" maxLength="120" required /></label><label>Work style<select name="mode"><option>Hybrid</option><option>Remote</option><option>On-site</option></select></label><label>Employment type<select name="type"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label>Experience<input name="level" defaultValue="Mid-level" maxLength="80" /></label><label>Salary range<input name="salary" maxLength="80" /></label><label>Category<input name="category" defaultValue="Engineering" maxLength="80" /></label><label className="workspace-form-wide">Required skills, comma separated<input name="skills" /></label><label className="workspace-form-wide">Description<textarea name="description" rows="4" maxLength="10000" required /></label>{error && <span className="workspace-error">{error}</span>}<button className="button button-primary" disabled={busy}>{busy ? "Publishing…" : "Publish role"} <ArrowRight size={14} /></button></form>;
}

function CompanyProfile({ notify }) {
  const { data, error, loading, refresh } = useResource("/companies/mine");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (data && form === null) setForm(data.company || { name: "", website: "", location: "", about: "", industry: "" });
  }, [data, form]);
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await api("/companies/mine", { method: "PUT", body: form }); notify("Company profile saved."); refresh(); }
    catch (failure) { notify(failure.message); }
    finally { setSaving(false); }
  };
  return <Panel title="Company profile" description="Give candidates useful context about your team."><LoadingOrError loading={loading} error={error} retry={refresh}>{form && <form className="workspace-form-grid" onSubmit={save}><label>Company name<input required maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Industry<input maxLength="120" value={form.industry || ""} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></label><label>Website<input type="url" placeholder="https://" maxLength="500" value={form.website || ""} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label><label>Location<input maxLength="120" value={form.location || ""} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label className="workspace-form-wide">About your company<textarea rows="5" maxLength="3000" value={form.about || ""} onChange={(event) => setForm({ ...form, about: event.target.value })} /></label><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save company profile"}</button></form>}</LoadingOrError></Panel>;
}

function Analytics({ user }) {
  const [days, setDays] = useState("30");
  const { data, error, loading, refresh } = useResource(`/analytics/recruiter?days=${days}`, days);
  const downloadReport = () => {
    const lines = ["CareerConnect recruitment analytics", `Last ${data.days} days`, ...Object.entries(data.totals).map(([key, value]) => `${key},${value}`), "", "Daily applications", ...data.trends.map((row) => `${row.date},${row.applications}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "careerconnect-analytics.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="workspace-stack"><Panel title="Recruitment analytics" description="Aggregated from your actual applications and job postings." actions={<><select className="workspace-input" value={days} onChange={(event) => setDays(event.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">12 months</option></select>{data && <button className="button button-outline button-compact" onClick={downloadReport}><Download size={13} />CSV report</button>}</>}><LoadingOrError loading={loading} error={error} retry={refresh}>{data && <><div className="workspace-metrics">{Object.entries({ "Roles posted": data.totals.jobs, "Active roles": data.totals.activeJobs, Applicants: data.totals.applications, Hires: data.totals.hires, "Hiring conversion": `${data.totals.conversionRate}%` }).map(([label, value]) => <Metric key={label} label={label} value={value} icon={BarChart3} />)}</div><div className="workspace-chart-grid"><div className="workspace-chart"><h3>Application trends · last {data.days} days</h3>{data.trends.length ? <ResponsiveContainer width="100%" height={250}><LineChart data={data.trends}><CartesianGrid strokeDasharray="3 3" stroke="#ececf1" /><XAxis dataKey="date" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><Tooltip /><Line type="monotone" dataKey="applications" stroke="#7658d8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <p className="workspace-muted">Application activity will appear here.</p>}</div><div className="workspace-chart"><h3>Applications by role</h3>{data.perJob.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={data.perJob} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#ececf1" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="title" width={105} tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="applications" fill="#6ba68b" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer> : <p className="workspace-muted">Create jobs to compare applicant interest.</p>}</div></div></>}</LoadingOrError></Panel><Panel title="Application pipeline" description="Current count of applications by stage."><div className="workspace-status-counts">{data?.byStatus?.map((row) => <div key={row.status}><span>{row.status}</span><b>{row.count}</b></div>)}</div></Panel></div>;
}

function AdminOverview() {
  const { data, error, loading, refresh } = useResource("/admin/stats");
  const stats = data?.stats || {};
  return <div className="workspace-stack"><Panel title="Platform health" description="Live counts from the application database."><LoadingOrError loading={loading} error={error} retry={refresh}>{data && <div className="workspace-admin-stats">{Object.entries({ "Registered users": stats.users, Candidates: stats.candidates, Recruiters: stats.recruiters, "All jobs": stats.jobs, "Open roles": stats.activeJobs, Applications: stats.applications, Shortlisted: stats.shortlisted, Hired: stats.hired, Interviews: stats.interviews }).map(([label, value]) => <Metric key={label} label={label} value={value} icon={BarChart3} />)}</div>}</LoadingOrError></Panel><div className="workspace-shortcuts">{adminNav.filter(([key]) => key !== "overview").map(([key, title, Icon]) => <Link className="workspace-shortcut" key={key} to={`/workspace/${key}`}><Icon size={18} /><span>{title}</span><ArrowRight size={14} /></Link>)}</div></div>;
}

function AdminUsers({ notify }) {
  const [role, setRole] = useState("");
  const { data, error, loading, refresh } = useResource(`/admin/users${role ? `?role=${role}` : ""}`, role);
  const update = async (user, key, value) => {
    try { await api(`/admin/users/${user._id}`, { method: "PATCH", body: { [key]: value } }); notify("User account updated."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  return <Panel title="Manage platform users" description="Verify recruiter accounts and manage account access." actions={<select className="workspace-input" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option><option>candidate</option><option>recruiter</option><option>admin</option></select>}><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.users?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Recruiter status</th><th>Account</th></tr></thead><tbody>{data.users.map((user) => <tr key={user._id}><td><b>{user.name}</b><small>{user.email}</small></td><td>{user.role}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td>{user.role === "recruiter" ? <button className="admin-action" onClick={() => update(user, "recruiterVerified", !user.recruiterVerified)}>{user.recruiterVerified ? "Verified ✓" : "Verify recruiter"}</button> : "—"}</td><td>{user.role === "admin" ? "Protected" : <button className="admin-action admin-danger" onClick={() => update(user, "accountActive", !user.accountActive)}>{user.accountActive ? "Suspend" : "Reactivate"}</button>}</td></tr>)}</tbody></table></div> : <Empty title="No users found" text="New candidate and recruiter accounts will appear here." />}</LoadingOrError></Panel>;
}

function AdminReports({ notify }) {
  const { data, error, loading, refresh } = useResource("/reports");
  const update = async (report, status) => {
    try { await api(`/reports/${report._id}`, { method: "PATCH", body: { status } }); notify("Report status updated."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  return <Panel title="Reports & complaints" description="Review reports submitted by platform users."><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.reports?.length ? <div className="workspace-list">{data.reports.map((report) => <article className="workspace-report" key={report._id}><div><span className="workspace-status">{report.status}</span><h3>{report.subject}</h3><p>{report.message}</p><small>From {report.reporter?.name} · {report.reporter?.email} · {new Date(report.createdAt).toLocaleString()}</small></div><select className="workspace-input" value={report.status} onChange={(event) => update(report, event.target.value)}><option>Open</option><option>Reviewing</option><option>Resolved</option><option>Dismissed</option></select></article>)}</div> : <Empty title="No reports to review" text="Reports submitted by users will show up here." />}</LoadingOrError></Panel>;
}

function Categories({ notify }) {
  const { data, error, loading, refresh } = useResource("/admin/categories");
  const [name, setName] = useState("");
  const create = async (event) => {
    event.preventDefault();
    try { await api("/admin/categories", { method: "POST", body: { name, skills: [] } }); setName(""); notify("Category added."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  const remove = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? Existing jobs will not be deleted.`)) return;
    try { await api(`/admin/categories/${category._id}`, { method: "DELETE" }); notify("Category removed."); refresh(); }
    catch (failure) { notify(failure.message); }
  };
  return <div className="workspace-stack"><Panel title="Add a category" description="Categories help candidates filter live roles."><form className="roadmap-create" onSubmit={create}><input className="workspace-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength="80" placeholder="e.g. Product design" /><button className="button button-primary">Add category <Plus size={14} /></button></form></Panel><Panel title="Categories and skills" description="Job categories already in use are shown separately."><LoadingOrError loading={loading} error={error} retry={refresh}><div className="workspace-chip-list">{data?.categories?.map((category) => <span className="category-chip" key={category._id}>{category.name}<button onClick={() => remove(category)} aria-label={`Delete ${category.name}`}>×</button></span>)}{data?.discovered?.map((name) => <span key={name}>{name} · inferred from jobs</span>)}</div>{!data?.categories?.length && <p className="workspace-muted">Create your first managed category.</p>}</LoadingOrError></Panel></div>;
}

function AuditLog() {
  const { data, error, loading, refresh } = useResource("/admin/audit");
  return <Panel title="Platform audit log" description="Sensitive administrative and resume actions recorded for accountability."><LoadingOrError loading={loading} error={error} retry={refresh}>{data?.logs?.length ? <div className="workspace-list">{data.logs.map((log) => <div className="workspace-list-row audit-row" key={log._id}><span className="workspace-list-avatar"><ShieldCheck size={15} /></span><div><b>{log.action}</b><small>{log.actor?.name || "System"} · {log.resourceType} {log.resourceId} {log.details}</small></div><time>{new Date(log.createdAt).toLocaleString()}</time></div>)}</div> : <Empty title="No audit entries yet" text="Platform actions that require an audit trail will be recorded here." />}</LoadingOrError></Panel>;
}

function ApplicantDetails({ id, user, notify }) {
  const { data, error, loading, refresh } = useResource(`/applications/${id}`);
  const [busy, setBusy] = useState(false);
  if (user.role !== "admin" && data?.application?.job?.createdBy !== user.id) {
    return <section className="workspace-main section"><div className="workspace-error">You don’t have access to this candidate’s application.</div><Link className="button button-outline" to="/workspace/applicants">Back to applicants</Link></section>;
  }
  const application = data?.application;
  const candidate = application?.candidate;
  const update = async (status) => {
    setBusy(true);
    try { const result = await api(`/applications/${id}/status`, { method: "PATCH", body: { status } }); notify(result.warning || `Application moved to ${status}.`); refresh(); }
    catch (failure) { notify(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="section applicant-page"><Link to={user.role === "admin" ? "/workspace/users" : "/workspace/applicants"} className="back-link">← Back to candidates</Link><Panel title="Candidate application" description="Candidate profile details are shared for this application."><LoadingOrError loading={loading} error={error} retry={refresh}>{application && <><div className="applicant-heading"><span className="applicant-avatar">{candidate?.name?.slice(0, 1)}</span><div><h2>{candidate?.name}</h2><p>{candidate?.title || "Candidate"} · {candidate?.location || "Location not provided"} · {candidate?.email}</p></div><span className="workspace-status">{application.status}</span></div>{candidate?.bio && <ProfileSection title="Professional summary">{candidate.bio}</ProfileSection>}{candidate?.education?.length > 0 && <ProfileSection title="Education">{candidate.education.map((item, index) => <p key={index}><b>{item.degree}</b> · {item.school} {item.year}</p>)}</ProfileSection>}{candidate?.experience?.length > 0 && <ProfileSection title="Work and internship experience">{candidate.experience.map((item, index) => <p key={index}><b>{item.title}</b> · {item.company} {item.start}–{item.end}<br />{item.description}</p>)}</ProfileSection>}{candidate?.projects?.length > 0 && <ProfileSection title="Projects">{candidate.projects.map((item, index) => <p key={index}><b>{item.title}</b> · {item.description} {item.url && <a href={item.url} target="_blank" rel="noreferrer">Project link</a>}</p>)}</ProfileSection>}<ProfileSection title="Skills"><div className="workspace-chip-list">{candidate?.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div></ProfileSection><div className="applicant-actions"><button className="button button-outline" onClick={() => download(`/resumes/candidate/${candidate.id}/download`, "candidate-resume.pdf").catch((failure) => notify(failure.message))}><Download size={14} />Download resume</button><button className="button button-primary" disabled={busy} onClick={() => update("Shortlisted")}>Shortlist candidate</button><button className="button button-outline" disabled={busy} onClick={() => update("Rejected")}>Reject</button><Link className="button button-outline" to={`/workspace/interviews?application=${application._id}`}>Schedule interview</Link></div></>}</LoadingOrError></Panel></section>;
}

function ProfileSection({ title, children }) {
  return <section className="applicant-section"><h3>{title}</h3>{children}</section>;
}
