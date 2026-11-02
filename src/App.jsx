import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check, CircleHelp,
  Compass, FileText, Filter, Globe2, GraduationCap, Layers3, LockKeyhole, MapPin, Menu, Search, ShieldCheck,
  Sparkles, Target, TrendingUp, Users, X, Zap,
} from "lucide-react";
import { api, clearSession, saveSession } from "./api.js";
const Workspace = lazy(() => import("./Workspace.jsx"));

const SessionContext = createContext(null);
const useSession = () => useContext(SessionContext);

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc-user")); } catch { return null; }
  });
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("cc-theme") || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cc-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!localStorage.getItem("cc-token")) return;
    api("/auth/me").then(({ user: current }) => {
      localStorage.setItem("cc-user", JSON.stringify(current));
      setUser(current);
    }).catch(() => {
      clearSession();
      setUser(null);
    });
  }, []);

  const signIn = useCallback((session) => { saveSession(session); setUser(session.user); }, []);
  const signOut = useCallback(() => { clearSession(); setUser(null); }, []);
  const notify = useCallback((message) => { setNotice(message); window.setTimeout(() => setNotice(""), 3800); }, []);
  const toggleTheme = useCallback(() => setTheme((current) => current === "light" ? "dark" : "light"), []);
  const value = useMemo(() => ({ user, signIn, signOut, notify, theme, toggleTheme }), [user, signIn, signOut, notify, theme, toggleTheme]);

  return (
    <SessionContext.Provider value={value}>
      <div className="app-shell">
        <Header />
        <main>
          <Suspense fallback={<section className="section workspace-loading">Loading your workspace…</section>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage register />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
              <Route path="/workspace/:page" element={<Protected><WorkspacePage /></Protected>} />
              <Route path="/workspace/applicant/:id" element={<Protected><ApplicantPage /></Protected>} />
              <Route path="/verify-email" element={<AuthAction action="verify" />} />
              <Route path="/forgot-password" element={<AuthAction action="forgot" />} />
              <Route path="/reset-password" element={<AuthAction action="reset" />} />
              <Route path="/about" element={<InfoPage page="about" />} />
              <Route path="/contact" element={<InfoPage page="contact" />} />
              <Route path="/privacy" element={<InfoPage page="privacy" />} />
              <Route path="/terms" element={<InfoPage page="terms" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
      </div>
    </SessionContext.Provider>
  );
}

function Header() {
  const { user, signOut, theme, toggleTheme } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" to="/" aria-label="CareerConnect AI home" onClick={closeMenu}>
          <span className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></span>
          <span>careerconnect<span className="brand-ai">.ai</span></span>
        </Link>
        <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`main-nav ${menuOpen ? "nav-open" : ""}`}>
          <NavLink to="/jobs" onClick={closeMenu}>Find jobs</NavLink>
          <a href="/#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="/#career-tools" onClick={closeMenu}>Career tools</a>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title="Toggle color theme">{theme === "light" ? "◐" : "☀"}</button>
          {user ? (
            <div className="nav-account">
              <Link to="/workspace/notifications" className="nav-dashboard" onClick={closeMenu}>Updates</Link>
              <Link to="/workspace/settings" className="nav-dashboard" onClick={closeMenu}>Settings</Link>
              <Link to="/dashboard" className="nav-dashboard" onClick={closeMenu}>Dashboard</Link>
              <button className="avatar-button" onClick={() => { signOut(); closeMenu(); navigate("/"); }} title={`Sign out ${user.name}`}>
                {user.name?.slice(0, 1).toUpperCase()}
              </button>
            </div>
          ) : (
            <div className="nav-actions">
              <Link className="nav-login" to="/login" onClick={closeMenu}>Log in</Link>
              <Link className="button button-dark nav-cta" to="/register" onClick={closeMenu}>Get started <ArrowUpRight size={15} /></Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function WorkspacePage() {
  const { user, notify } = useSession();
  const { page = "overview" } = useParams();
  return <Workspace page={page} user={user} notify={notify} />;
}

function ApplicantPage() {
  const { user, notify } = useSession();
  const { id } = useParams();
  if (!["admin", "recruiter"].includes(user.role)) return <section className="section detail-state"><h1>This page is not available.</h1><Link className="button button-dark" to="/dashboard">Back to dashboard</Link></section>;
  return <Workspace page="applicant" id={id} user={user} notify={notify} />;
}

function Home() {
  const [jobs, setJobs] = useState([]);
  const [jobError, setJobError] = useState("");
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    api("/jobs?limit=3").then(({ jobs: data }) => setJobs(data)).catch((error) => setJobError(error.message));
    api("/public/stats").then(({ stats: result }) => setStats(result)).catch((error) => setStatsError(error.message));
  }, []);

  const search = (event) => {
    event.preventDefault();
    navigate(`/jobs${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };
  return (
    <>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> A more thoughtful way to find work</div>
            <h1>Your next chapter<br />starts <span>here.</span></h1>
            <p className="hero-subtitle">Find work that fits your life, not just your résumé. Explore opportunities, track your progress and move forward with confidence.</p>
            <form className="search-panel" onSubmit={search}>
              <label className="search-input-wrap">
                <Search size={19} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title, skill or company" aria-label="Search jobs" />
              </label>
              <span className="search-divider" />
              <label className="search-location">
                <MapPin size={18} />
                <span>Anywhere</span>
              </label>
              <button className="button button-primary search-submit" type="submit">Find a job <ArrowRight size={16} /></button>
            </form>
            <div className="popular-searches"><span>Popular:</span> <Link to="/jobs?search=Design">Design</Link><Link to="/jobs?search=Engineering">Engineering</Link><Link to="/jobs?search=Data">Data</Link></div>
            <div className="hero-proof"><span className="hero-proof-icon"><Compass size={15} /></span><p><strong>A better fit is out there.</strong><br />Make your next move count.</p></div>
          </div>
          <div className="hero-art" aria-label="Career growth illustration">
            <div className="art-glow" />
            <div className="art-label"><Sparkles size={15} /> Your path, in focus</div>
            <div className="art-card art-card-main">
              <div className="art-card-top"><span className="art-company-icon">N</span><div><b>A role to explore</b><small>A new opportunity, on your terms</small></div><span className="art-card-bookmark"><Bookmark size={17} /></span></div>
              <div className="art-match"><div className="match-ring"><span><Check size={14} /></span></div><div><b>A role worth exploring</b><small>See how your experience fits</small></div><ArrowUpRight size={17} /></div>
              <div className="art-skills"><span>Product design</span><span>Figma</span><span>+2</span></div>
            </div>
            <div className="art-card art-card-float"><span className="float-icon"><TrendingUp size={17} /></span><div><b>One step at a time</b><small>Make your next move count</small></div><ArrowUpRight size={15} /></div>
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="hero-side-note">A LITTLE LESS SEARCHING. <strong>A LOT MORE FINDING.</strong></div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>Explore a few directions to get started</span>
          <div className="company-strip"><span>Design</span><span className="company-layer">Product</span><span className="company-gw">Engineering</span><span className="company-orbit">Data</span><span className="company-nova">People</span></div>
        </div>
      </section>

      <section className="section jobs-section" id="jobs">
        <div className="section-heading">
          <div><div className="eyebrow eyebrow-muted">THE RIGHT OPPORTUNITY</div><h2>Work that moves<br />you <span>forward.</span></h2></div>
          <p>Good work starts with a good fit. Explore roles from teams that value what you bring.</p>
          <Link className="text-link" to="/jobs">Explore all jobs <ArrowRight size={16} /></Link>
        </div>
        {jobError && <p className="inline-notice">{jobError} Add your MongoDB connection to load live opportunities.</p>}
        {!jobError && jobs.length === 0 && <div className="empty-jobs">No open roles just yet. Check back soon or create an account to get started.</div>}
        <div className="job-grid">
          {jobs.map((job, index) => <JobCard key={job._id} job={job} index={index} />)}
        </div>
      </section>

      <section className="section categories-section">
        <div className="section-heading category-heading">
          <div><div className="eyebrow eyebrow-muted">FIND YOUR DIRECTION</div><h2>Good things are<br />happening in <span>every field.</span></h2></div>
          <p>Start with what you love. We’ll help you discover where it can take you.</p>
        </div>
        <div className="category-grid">
          {[
            ["01", "Design & creative", "Make things people love", Layers3, "#eae8ff"],
            ["02", "Engineering", "Build what’s next", Zap, "#e3f2ee"],
            ["03", "Data & analytics", "Find meaning in data", TrendingUp, "#fff0df"],
            ["04", "People & culture", "Help teams thrive", Users, "#fae7ec"],
          ].map(([number, label, caption, Icon, color]) => (
            <Link to={`/jobs?search=${encodeURIComponent(label.split(" ")[0])}`} className="category-card" key={label}>
              <div className="category-card-top"><span>{number}</span><span className="category-icon" style={{ backgroundColor: color }}><Icon size={20} /></span></div>
              <div><h3>{label}</h3><p>{caption}</p></div><ArrowUpRight size={18} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="how-copy"><div className="eyebrow eyebrow-muted">A BETTER WAY FORWARD</div><h2>Your career isn’t a<br />straight line. <span>That’s okay.</span></h2><p>Finding your next move should feel less like a second job. Start with what matters to you, and take it one step at a time.</p><Link className="button button-dark" to="/register">Let’s get started <ArrowRight size={16} /></Link></div>
        <div className="steps-list">
          <div className="step-item"><span className="step-icon step-violet"><Compass size={21} /></span><div><span className="step-number">01 — GET TO KNOW YOURSELF</span><h3>Start with your strengths</h3><p>Tell us what you’re good at, what you enjoy and what you want from your next role.</p></div></div>
          <div className="step-item"><span className="step-icon step-green"><Target size={21} /></span><div><span className="step-number">02 — FIND YOUR FIT</span><h3>Explore roles that make sense</h3><p>Discover opportunities that line up with your skills and the direction you want to grow.</p></div></div>
          <div className="step-item"><span className="step-icon step-orange"><ArrowUpRight size={21} /></span><div><span className="step-number">03 — TAKE THE NEXT STEP</span><h3>Keep moving, at your pace</h3><p>Stay on top of applications and make decisions that feel right for you.</p></div></div>
        </div>
      </section>

      <section className="career-band" id="career-tools">
        <div className="career-band-inner">
          <div className="career-icon"><Sparkles size={22} /></div>
          <div className="career-band-copy"><div className="eyebrow">CAREER TOOLS, WITH NO AI HYPE</div><h2>Make room for what’s <span>next.</span></h2><p>Review your PDF for explainable keyword overlap and basic ATS checks, build a profile-based resume, and plan learning milestones. The analyzer is not semantic or generative AI.</p></div>
          <div className="career-actions"><Link to="/register" className="button button-light">Create your free profile <ArrowRight size={16} /></Link><span>Start with a profile, then explore at your pace.</span></div>
        </div>
      </section>
      <section className="section activity-section">
        <div className="activity-intro"><div className="eyebrow eyebrow-muted">A PLATFORM, NOT A PROMISE</div><h2>See what’s <span>actually here.</span></h2><p>Live totals from the platform database. No inflated member counts or invented hiring claims.</p></div>
        {stats ? <div className="activity-metrics"><div><strong>{stats.activeJobs}</strong><span>Open opportunities</span></div><div><strong>{stats.hiringTeams}</strong><span>Hiring teams with live roles</span></div><div><strong>{stats.applications}</strong><span>Applications submitted</span></div></div> : <p className="workspace-muted">{statsError || "Loading live platform activity…"}</p>}
      </section>
      <section className="section principles-section">
        <div className="principle-heading"><div className="eyebrow eyebrow-muted">THE EXPERIENCE WE’RE BUILDING</div><h2>Hiring should feel more <span>human.</span></h2><p>These are product principles, not customer testimonials.</p></div>
        <div className="principle-cards"><article><span>01</span><blockquote>“I know where my application stands, and I choose what information I share.”</blockquote><small>Candidate experience principle · illustrative</small></article><article><span>02</span><blockquote>“I can focus on the people behind every application, not just another spreadsheet.”</blockquote><small>Recruiter experience principle · illustrative</small></article><article><span>03</span><blockquote>“A useful next step matters more than a mysterious score.”</blockquote><small>Career guidance principle · illustrative</small></article></div>
      </section>
      <section className="section faq-section">
        <div className="principle-heading"><div className="eyebrow eyebrow-muted">GOOD TO KNOW</div><h2>A few honest <span>answers.</span></h2></div>
        <div className="faq-list"><details><summary>Does the resume analyzer use AI?</summary><p>No. It extracts text from PDFs, checks for common resume sections, and compares words against listed skills. It does not use a language model or semantic NLP.</p></details><details><summary>Who can see my resume?</summary><p>Your PDF is stored privately. Only you, platform administrators, and recruiters whose roles you applied to can download it when your profile visibility setting allows access.</p></details><details><summary>How are job matches calculated?</summary><p>Recommendations compare your saved skills, location, work-style and career-interest preferences with active job postings. Each result includes reasons and missing skills; scores are a transparent heuristic, not a prediction.</p></details><details><summary>Can I use the site without email delivery?</summary><p>In local development, registration and password recovery show a time-limited verification or reset token for testing. Production deployments should configure SMTP in the server environment.</p></details></div>
      </section>
      <section className="trust-line"><ShieldCheck size={18} /><span>Your information stays yours. We keep your profile private and your job search on your terms.</span><Link to="/register">Learn more <ArrowRight size={14} /></Link></section>
    </>
  );
}

function JobCard({ job, index = 0 }) {
  const { user, notify } = useSession();
  const [saved, setSaved] = useState(false);
  const colors = ["job-icon-lilac", "job-icon-mint", "job-icon-peach", "job-icon-blue"];
  const toggleSaved = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user || user.role !== "candidate") return notify("Sign in with a candidate account to save this role.");
    try {
      if (saved) {
        await api(`/saved-jobs/${job._id}`, { method: "DELETE" });
        setSaved(false);
        notify("Saved job removed.");
      } else {
        await api(`/saved-jobs/${job._id}`, { method: "POST", body: {} });
        setSaved(true);
        notify("Job saved to your workspace.");
      }
    } catch (failure) { notify(failure.message); }
  };
  return (
    <Link className="job-card" to={`/jobs/${job._id}`} style={{ animationDelay: `${index * 70}ms` }}>
      <div className="job-card-top"><div className={`job-company-icon ${colors[index % colors.length]}`}>{job.company?.slice(0, 1).toUpperCase()}</div><button className={`job-save-mark ${saved ? "job-is-saved" : ""}`} onClick={toggleSaved} aria-label={saved ? "Remove saved job" : "Save job"} title={saved ? "Remove saved job" : "Save job"}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button></div>
      <div className="job-card-content"><span className="job-category">{job.sample ? "Sample listing" : job.category || "Opportunity"}</span><h3>{job.title}</h3><p className="job-company">{job.company}</p></div>
      <div className="job-card-meta"><span><MapPin size={14} />{job.location}</span><span>{job.mode}</span></div>
      <div className="job-card-bottom"><span>{job.salary || job.type || "Full-time"}</span><ArrowUpRight size={17} /></div>
    </Link>
  );
}

function JobsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [mode, setMode] = useState(params.get("mode") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [sort, setSort] = useState(params.get("sort") || "newest");
  const [page, setPage] = useState(Math.max(1, Number(params.get("page")) || 1));
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    const values = { search: params.get("search"), mode, type, category: params.get("category"), location, sort, page: String(page) };
    Object.entries(values).forEach(([key, value]) => { if (value) query.set(key, value); });
    Promise.all([api(`/jobs?${query}`), api("/jobs/categories")])
      .then(([result, categoryResult]) => { setJobs(result.jobs); setPagination(result.pagination); setCategories(categoryResult.categories); setError(""); })
      .catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  }, [params, mode, type, location, sort, page]);
  const submitSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    const values = { search: search.trim(), mode, type, location: location.trim(), sort };
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); });
    next.delete("page");
    setPage(1);
    setParams(next);
  };
  const clearFilters = () => { setSearch(""); setMode(""); setType(""); setLocation(""); setSort("newest"); setPage(1); setParams({}); };
  return (
    <section className="jobs-page section">
      <div className="jobs-page-heading"><div><div className="eyebrow eyebrow-muted">YOUR NEXT CHAPTER</div><h1>Find work that <span>fits.</span></h1><p>Explore thoughtful opportunities from teams building something good.</p></div><span className="jobs-page-count"><BriefcaseBusiness size={17} />{pagination?.total ?? jobs.length} opportunities</span></div>
      <form className="jobs-toolbar jobs-toolbar-expanded" onSubmit={submitSearch}><label className="toolbar-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Job title, company or skill" aria-label="Search jobs" /></label><label className="toolbar-filter"><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" aria-label="Filter by location" /></label><label className="toolbar-filter"><Filter size={17} /><select value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }} aria-label="Filter by work mode"><option value="">All work styles</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label><label className="toolbar-filter"><BriefcaseBusiness size={16} /><select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} aria-label="Filter by employment type"><option value="">All job types</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label className="toolbar-filter"><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort job listings"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button className="button button-dark" type="submit">Search <ArrowRight size={16} /></button></form>
      {categories.length > 0 && <div className="job-category-filters"><span>Categories:</span>{categories.map((category) => <button key={category} className={params.get("category") === category ? "category-filter-active" : ""} onClick={() => { const next = new URLSearchParams(params); next.set("category", params.get("category") === category ? "" : category); next.delete("page"); if (!next.get("category")) next.delete("category"); setPage(1); setParams(next); }}>{category}</button>)}</div>}
      {error && <div className="page-message error-message">{error} <span>Configure MongoDB to browse live listings.</span></div>}
      {loading ? <div className="loading-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item} />)}</div> : jobs.length ? <><div className="job-grid">{jobs.map((job, index) => <JobCard key={job._id} job={job} index={index} />)}</div>{pagination?.pages > 1 && <div className="job-pagination"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pagination.pages}</span><button className="button button-outline" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}</> : !error && <div className="empty-state"><span className="empty-state-icon"><Search size={24} /></span><h2>No matches this time</h2><p>Try a different search or adjust your filters. The right fit can show up in unexpected places.</p><button className="button button-outline" onClick={clearFilters}>Clear filters</button></div>}
    </section>
  );
}

function JobDetail() {
  const { id } = useParams();
  const { user, notify } = useSession();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  useEffect(() => { api(`/jobs/${id}`).then(({ job: result }) => setJob(result)).catch((failure) => setError(failure.message)); }, [id]);
  const apply = async () => {
    if (!user) return navigate("/login");
    if (user.role !== "candidate") return notify("Only candidate accounts can apply to jobs.");
    setApplying(true);
    try { const result = await api(`/applications/${id}`, { method: "POST" }); notify(result.warning || "Application submitted. You can track it from your dashboard."); }
    catch (failure) { notify(failure.message); }
    finally { setApplying(false); }
  };
  if (error) return <section className="section detail-state"><h1>We couldn’t find that opportunity.</h1><p>{error}</p><Link className="button button-dark" to="/jobs">Back to jobs</Link></section>;
  if (!job) return <section className="section"><div className="skeleton-card detail-skeleton" /></section>;
  return (
    <section className="section job-detail-page">
      <Link to="/jobs" className="back-link">← All opportunities</Link>
      <div className="job-detail-layout">
        <article className="detail-main">
          <div className="detail-company-row"><span className="detail-logo">{job.company?.slice(0, 1)}</span><div><strong>{job.company}</strong><span>Opportunity · Posted {new Date(job.createdAt).toLocaleDateString()}</span></div></div>
          <h1>{job.title}</h1>
          <div className="detail-tags"><span><MapPin size={15} />{job.location}</span><span><Globe2 size={15} />{job.mode}</span><span><BriefcaseBusiness size={15} />{job.type}</span><span><GraduationCap size={15} />{job.level}</span></div>
          <hr />
          <h2>About the role</h2><p className="detail-description">{job.description}</p>
          <h2>Skills that help</h2><div className="skill-tags">{job.skills?.length ? job.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Skills will be discussed with the hiring team</span>}</div>
        </article>
        <aside className="detail-sidebar"><span className="sidebar-eyebrow">A GOOD PLACE TO START</span><h3>Interested in this role?</h3><p>Take the first step and introduce yourself to the team.</p>{job.salary && <div className="detail-salary"><span>Salary range</span><strong>{job.salary}</strong></div>}<button className="button button-primary button-full" onClick={apply} disabled={applying}>{applying ? "Sending…" : "Apply for this role"} <ArrowRight size={16} /></button><small>Your profile is only shared when you apply.</small></aside>
      </div>
    </section>
  );
}

function AuthPage({ register = false }) {
  const { user, signIn } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  if (user) return <Navigate to="/dashboard" replace />;
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = register ? "/auth/register" : "/auth/login";
      const body = register ? { ...form, role } : { email: form.email, password: form.password };
      const session = await api(path, { method: "POST", body });
      if (session.token) {
        signIn(session);
        navigate("/dashboard");
      } else {
        setVerificationPending(true);
        setVerificationToken(session.developmentVerificationToken || "");
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return (
    <section className="auth-page">
      <div className="auth-decoration"><div className="auth-decoration-inner"><Sparkles size={22} /><span>A new direction can start with one small step.</span><div className="auth-mini-card"><span className="auth-mini-icon"><Compass size={18} /></span><div><b>There’s a place for you.</b><small>Let’s find it together.</small></div><ArrowUpRight size={16} /></div></div></div>
      <div className="auth-panel"><div className="auth-form-wrap"><div className="eyebrow eyebrow-muted">{register ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</div><h1>{register ? "Start with what’s next." : "Good to see you again."}</h1><p>{register ? "A more thoughtful job search begins with a little about you." : "Pick up right where you left off."}</p>
        {register && <div className="role-selector" aria-label="Choose account type"><button className={role === "candidate" ? "role-selected" : ""} onClick={() => setRole("candidate")} type="button"><Compass size={17} />I’m looking for work</button><button className={role === "recruiter" ? "role-selected" : ""} onClick={() => setRole("recruiter")} type="button"><Users size={17} />I’m hiring</button></div>}
        <form className="auth-form" onSubmit={submit}>
          {register && <label>Your name<input name="name" value={form.name} onChange={change} placeholder="What should we call you?" required maxLength={100} /></label>}
          <label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" autoComplete="email" required /></label>
          {register && role === "recruiter" && <label>Company name<input name="company" value={form.company} onChange={change} placeholder="Where do you work?" required maxLength={120} /></label>}
          <label>Password<input name="password" type="password" value={form.password} onChange={change} placeholder={register ? "At least 8 characters" : "Your password"} autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} required /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {verificationPending && <div className="form-success" role="status">Your account is ready. Verify your email before signing in.{verificationToken && <Link to={`/verify-email?token=${verificationToken}`}>Verify this development email</Link>}<ResendVerification /></div>}
          <button className="button button-dark button-full auth-submit" disabled={busy || verificationPending}>{busy ? "One moment…" : verificationPending ? "Account created" : register ? "Create your account" : "Log in"} <ArrowRight size={16} /></button>
          <div className="auth-privacy"><ShieldCheck size={15} />Your information stays private and secure.</div>
        </form>
        
        {!register && (
          <>
            <ResendVerification />
            <Link className="auth-forgot-link" to="/forgot-password">
              Forgot your password?
            </Link>
          </>
        )}
        <div className="auth-switch">
          {register ? "Already have an account?" : "New to CareerConnect?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Log in" : "Create an account"}
          </Link>
        </div>
      </div></div>
    </section>
  );
}

function Protected({ children }) {
  const { user } = useSession();
  const location = useLocation();
  return user ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

function Dashboard() {
  const { user, notify } = useSession();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const isRecruiter = user.role === "recruiter" || user.role === "admin";
  const profileCompletion = Math.round(
    ([user.name, user.title, user.location, user.skills?.length ? "skills" : "", user.bio]
      .filter(Boolean).length / 5) * 100
  );
  const loadData = () => {
    setLoading(true);
    const requests = [api("/applications/mine")];
    if (isRecruiter) requests.push(api("/jobs/mine"));
    Promise.all(requests).then(([applicationData, jobData]) => {
      setApplications(applicationData.applications);
      setJobs(jobData?.jobs || []);
      setError("");
    }).catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  };
  useEffect(loadData, [user.role]);

  return (
    <section className="dashboard-page section">
      <div className="dashboard-welcome"><div><div className="eyebrow eyebrow-muted">{isRecruiter ? "RECRUITER WORKSPACE" : "YOUR CAREER SPACE"}</div><h1>Good to have you here, <span>{user.name.split(" ")[0]}.</span></h1><p>{isRecruiter ? "A clear view of your open roles and the people behind every application." : "Your next move, all in one place. Take it at your own pace."}</p></div><div className="dashboard-actions">{isRecruiter && <button className="button button-primary" onClick={() => setShowPostForm(!showPostForm)}>+ Post a role</button>}<Link className="button button-outline" to="/profile">Edit profile <ArrowUpRight size={15} /></Link></div></div>
      {error && <div className="page-message error-message">{error}</div>}
      {showPostForm && <JobPostForm company={user.company} onSuccess={(warning) => { setShowPostForm(false); loadData(); notify(warning || "Your role is now live."); }} onCancel={() => setShowPostForm(false)} />}
      <div className="dashboard-stats"><StatCard icon={BriefcaseBusiness} label={isRecruiter ? "Your open roles" : "Applications sent"} value={isRecruiter ? jobs.filter((job) => job.status === "active").length : applications.length} color="violet" /><StatCard icon={TrendingUp} label={isRecruiter ? "Total applicants" : "In progress"} value={isRecruiter ? applications.length : applications.filter((app) => !["Rejected", "Withdrawn", "Hired"].includes(app.status)).length} color="mint" /><StatCard icon={Compass} label={isRecruiter ? "Shortlisted" : "Profile status"} value={isRecruiter ? applications.filter((app) => app.status === "Shortlisted").length : user.title ? "In progress" : "Getting started"} color="peach" /></div>
      <div className="dashboard-content-grid"><section className="dashboard-card"><div className="dashboard-card-heading"><div><span className="card-kicker">{isRecruiter ? "YOUR TEAM" : "KEEP AN EYE ON IT"}</span><h2>{isRecruiter ? "Recent applicants" : "Your applications"}</h2></div><span className="count-pill">{applications.length}</span></div>
        {loading ? <div className="dashboard-loading">Loading your latest updates…</div> : applications.length === 0 ? <div className="dashboard-empty"><span><FileText size={22} /></span><h3>{isRecruiter ? "Your next great hire starts here." : "The first step is the hardest."}</h3><p>{isRecruiter ? "Post your first role to meet people ready for what’s next." : "When you apply for a role, you’ll find it here. No rush — the right one is worth finding."}</p>{!isRecruiter && <Link className="text-link" to="/jobs">Explore opportunities <ArrowRight size={15} /></Link>}{isRecruiter && <button className="text-link text-button" onClick={() => setShowPostForm(true)}>Post a role <ArrowRight size={15} /></button>}</div> :
          <div className="application-list">{applications.map((application) => <ApplicationRow key={application._id} application={application} recruiter={isRecruiter} onStatus={loadData} notify={notify} />)}</div>}
      </section><aside className="dashboard-side"><div className="profile-progress-card"><div className="progress-card-top"><span className="progress-icon"><Sparkles size={18} /></span><span>YOUR PROFILE</span></div><h3>{user.title || "Give your next chapter a starting point."}</h3><p>{user.title ? "Keep your details fresh so the right people can find you." : "A little about you goes a long way."}</p><div className="progress-track"><span style={{ width: `${profileCompletion}%` }} /></div><div className="progress-caption">{profileCompletion}% complete<Link to="/profile">Complete profile <ArrowRight size={14} /></Link></div></div><div className="dashboard-tip"><span><CircleHelp size={18} /></span><div><b>Need a little direction?</b><p>Start with a role that feels interesting. You can figure out the rest along the way.</p><Link to="/jobs">Browse open roles <ArrowRight size={14} /></Link></div></div></aside></div>
      {isRecruiter && <section className="dashboard-card manage-jobs"><div className="dashboard-card-heading"><div><span className="card-kicker">HIRING OVERVIEW</span><h2>Your roles</h2></div><span className="count-pill">{jobs.length}</span></div>      {jobs.length ? <div className="owned-job-list">{jobs.map((job) => <JobManagementRow key={job._id} job={job} applicantCount={applications.filter((app) => app.job?._id === job._id).length} onChange={loadData} notify={notify} />)}</div> : <p className="no-owned-jobs">Your roles will show up here once you post one.</p>}</section>}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return <div className="stat-card"><span className={`stat-icon stat-${color}`}><Icon size={19} /></span><div><span>{label}</span><strong>{value}</strong></div><ArrowUpRight size={15} className="stat-arrow" /></div>;
}

function ApplicationRow({ application, recruiter, onStatus, notify }) {
  const candidate = application.candidate;
  const job = application.job;
  const changeStatus = async (event) => {
    try {
      const result = await api(`/applications/${application._id}/status`, { method: "PATCH", body: { status: event.target.value } });
      notify(result.warning || "Application status updated.");
      onStatus();
    } catch (error) { notify(error.message); }
  };
  return <div className="application-row"><span className="application-avatar">{(recruiter ? candidate?.name : job?.company)?.slice(0, 1).toUpperCase() || "?"}</span><div className="application-row-main"><strong>{recruiter ? candidate?.name : job?.title}</strong><span>{recruiter ? `${job?.title || "Role"} · ${candidate?.email || ""}` : `${job?.company || "Company"} · ${job?.location || ""}`}</span></div><span className={`status-pill status-${application.status.toLowerCase().replaceAll(" ", "-")}`}>{application.status}</span>{recruiter && <select className="status-select" value={application.status} onChange={changeStatus} aria-label={`Update status for ${candidate?.name}`}><option>Applied</option><option>Screening</option><option>Shortlisted</option><option>Interview Scheduled</option><option>Offered</option><option>Hired</option><option>Rejected</option></select>}</div>;
}

function JobManagementRow({ job, applicantCount, onChange, notify }) {
  const updateStatus = async (event) => {
    try {
      const result = await api(`/jobs/${job._id}`, { method: "PATCH", body: { status: event.target.value } });
      notify(result.warning || (event.target.value === "active" ? "Role is now open." : "Role has been closed."));
      onChange();
    } catch (error) {
      notify(error.message);
    }
  };
  return <div className="owned-job"><span className="owned-job-icon">{job.title.slice(0, 1)}</span><div><strong>{job.title}</strong><small>{job.company} · {job.location}</small></div><span>{applicantCount} applicants</span><select className={`status-select status-${job.status}`} value={job.status} onChange={updateStatus} aria-label={`Set ${job.title} status`}><option value="active">Open</option><option value="closed">Closed</option></select></div>;
}

function JobPostForm({ onSuccess, onCancel, company }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", company: company || "", location: "", mode: "Hybrid", type: "Full-time", level: "Mid-level", salary: "", category: "Engineering", description: "", skills: "" });
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api("/jobs", { method: "POST", body: { ...form, skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean) } });
      onSuccess(result.warning);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <form className="job-post-form" onSubmit={submit}><div className="post-form-heading"><div><span className="card-kicker">NEW OPPORTUNITY</span><h2>Tell us about the role.</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Close form"><X size={18} /></button></div>
    <div className="post-form-grid"><label>Job title<input name="title" value={form.title} onChange={change} required maxLength={120} /></label><label>Company<input name="company" value={form.company} onChange={change} required maxLength={120} readOnly={Boolean(company)} /></label><label>Location<input name="location" value={form.location} onChange={change} required maxLength={120} /></label><label>Work style<select name="mode" value={form.mode} onChange={change}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label><label>Employment type<select name="type" value={form.type} onChange={change}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label>Salary range<input name="salary" value={form.salary} onChange={change} placeholder="Optional" /></label><label className="post-wide">Skills <span className="label-hint">(comma separated)</span><input name="skills" value={form.skills} onChange={change} placeholder="React, product thinking, SQL" /></label><label className="post-wide">About the role<textarea name="description" rows="4" value={form.description} onChange={change} required maxLength={10000} /></label></div>
    {error && <div className="form-error">{error}</div>}<div className="post-form-actions"><button type="button" className="button button-outline" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Publishing…" : "Publish role"} <ArrowRight size={15} /></button></div>
  </form>;
}

function ProfilePage() {
  const { user, signIn, notify } = useSession();
  const [form, setForm] = useState({
    name: user.name || "", title: user.title || "", location: user.location || "",
    skills: (user.skills || []).join(", "), bio: user.bio || "", careerObjective: user.careerObjective || "",
    education: user.education || [], experience: user.experience || [], projects: user.projects || [],
    certifications: user.certifications || [], links: user.links || { linkedin: "", github: "", portfolio: "" },
    profileVisible: user.profileVisible !== false,
    preferredLocations: (user.preferredLocations || []).join(", "),
    preferredWorkModes: user.preferredWorkModes || [],
    careerInterests: (user.careerInterests || []).join(", "),
    salaryMinimum: user.salaryMinimum ?? "",
    salaryMaximum: user.salaryMaximum ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = {
        ...form,
        skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        preferredLocations: form.preferredLocations.split(",").map((place) => place.trim()).filter(Boolean),
        careerInterests: form.careerInterests.split(",").map((interest) => interest.trim()).filter(Boolean),
        salaryMinimum: form.salaryMinimum === "" ? null : Number(form.salaryMinimum),
        salaryMaximum: form.salaryMaximum === "" ? null : Number(form.salaryMaximum),
      };
      const result = await api("/profile", { method: "PATCH", body });
      signIn({ token: localStorage.getItem("cc-token"), user: result.user });
      notify("Your profile has been updated.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const updateList = (key, index, field, value) => setForm((current) => ({ ...current, [key]: current[key].map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item) }));
  const addListItem = (key, item) => setForm((current) => ({ ...current, [key]: [...current[key], item] }));
  const removeListItem = (key, index) => setForm((current) => ({ ...current, [key]: current[key].filter((_item, currentIndex) => currentIndex !== index) }));
  return <section className="section profile-page"><Link to="/dashboard" className="back-link">← Dashboard</Link><div className="profile-heading"><span className="eyebrow eyebrow-muted">A PROFILE THAT SOUNDS LIKE YOU</span><h1>Let’s fill in a few <span>details.</span></h1><p>Share what matters to you. You can always come back and change it later.</p></div><form className="profile-form" onSubmit={submit}><div className="profile-form-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-form-fields"><h2>About you</h2><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} /></label><label>Professional headline<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Product designer, learning every day" maxLength={120} /></label><label>Where you’re based<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, country or remote" maxLength={120} /></label><label>Your skills <span className="label-hint">(separate with commas)</span><input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="What are you good at?" /></label><label>Professional summary<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows="4" maxLength={1000} /></label><label>Career objective<textarea value={form.careerObjective} onChange={(event) => setForm({ ...form, careerObjective: event.target.value })} rows="3" maxLength={1000} /></label>
      <ProfileCollection title="Education" items={form.education} fields={[["school", "Institution"], ["degree", "Degree or qualification"], ["year", "Year"]]} onAdd={() => addListItem("education", { school: "", degree: "", year: "" })} onChange={(index, field, value) => updateList("education", index, field, value)} onRemove={(index) => removeListItem("education", index)} />
      <ProfileCollection title="Work & internships" items={form.experience} fields={[["title", "Role"], ["company", "Organization"], ["start", "Start date"], ["end", "End date"], ["description", "Achievements and responsibilities"]]} onAdd={() => addListItem("experience", { title: "", company: "", start: "", end: "", description: "" })} onChange={(index, field, value) => updateList("experience", index, field, value)} onRemove={(index) => removeListItem("experience", index)} />
      <ProfileCollection title="Projects" items={form.projects} fields={[["title", "Project"], ["description", "What you built"], ["url", "Project URL"]]} onAdd={() => addListItem("projects", { title: "", description: "", url: "" })} onChange={(index, field, value) => updateList("projects", index, field, value)} onRemove={(index) => removeListItem("projects", index)} />
      <ProfileCollection title="Certifications" items={form.certifications} fields={[["name", "Certification"], ["issuer", "Issuing organization"], ["year", "Year"]]} onAdd={() => addListItem("certifications", { name: "", issuer: "", year: "" })} onChange={(index, field, value) => updateList("certifications", index, field, value)} onRemove={(index) => removeListItem("certifications", index)} />
      <div className="profile-links"><h3>Professional links</h3>{["linkedin", "github", "portfolio"].map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)}<input type="url" placeholder="https://" value={form.links[key] || ""} onChange={(event) => setForm({ ...form, links: { ...form.links, [key]: event.target.value } })} /></label>)}</div>
      <section className="profile-preferences"><h3>What you’re looking for</h3><label>Preferred locations <span className="label-hint">(comma separated)</span><input value={form.preferredLocations} onChange={(event) => setForm({ ...form, preferredLocations: event.target.value })} placeholder="Bengaluru, Remote" /></label><label>Career interests <span className="label-hint">(comma separated)</span><input value={form.careerInterests} onChange={(event) => setForm({ ...form, careerInterests: event.target.value })} placeholder="Design, frontend, analytics" /></label><div className="profile-salary-fields"><label>Minimum annual salary (₹)<input type="number" min="0" max="1000000000" value={form.salaryMinimum} onChange={(event) => setForm({ ...form, salaryMinimum: event.target.value })} /></label><label>Maximum annual salary (₹)<input type="number" min="0" max="1000000000" value={form.salaryMaximum} onChange={(event) => setForm({ ...form, salaryMaximum: event.target.value })} /></label></div><div className="work-mode-options"><b>Preferred work style</b>{["Remote", "Hybrid", "On-site"].map((mode) => <label key={mode}><input type="checkbox" checked={form.preferredWorkModes.includes(mode)} onChange={(event) => setForm({ ...form, preferredWorkModes: event.target.checked ? [...form.preferredWorkModes, mode] : form.preferredWorkModes.filter((item) => item !== mode) })} />{mode}</label>)}</div></section>
      <label className="profile-visibility"><input type="checkbox" checked={form.profileVisible} onChange={(event) => setForm({ ...form, profileVisible: event.target.checked })} /><span><b>Allow recruiters to access my resume after I apply</b><small>Your profile is not exposed publicly. You can turn this off at any time.</small></span></label>
      {error && <div className="form-error">{error}</div>}<div className="profile-save-row"><span><ShieldCheck size={15} />Your profile is private until you choose to apply.</span><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save your profile"} <Check size={16} /></button></div></div></form></section>;
}

function ProfileCollection({ title, items, fields, onAdd, onChange, onRemove }) {
  return <section className="profile-collection"><div><h3>{title}</h3><button type="button" className="text-button profile-add" onClick={onAdd}>+ Add</button></div>{items.map((item, index) => <div className="profile-collection-item" key={`${title}-${index}`}>{fields.map(([field, label]) => <label className={field === "description" ? "profile-description-field" : ""} key={field}>{label}{field === "description" ? <textarea rows="3" maxLength={1000} value={item[field] || ""} onChange={(event) => onChange(index, field, event.target.value)} /> : <input maxLength={field === "url" ? 500 : 160} value={item[field] || ""} onChange={(event) => onChange(index, field, event.target.value)} />}</label>)}<button type="button" className="workspace-inline-danger" onClick={() => onRemove(index)}>Remove</button></div>)}{items.length === 0 && <p className="workspace-muted">Add relevant details when you’re ready.</p>}</section>;
}

function AuthAction({ action }) {
  const [params] = useSearchParams();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(params.get("token") || "");
  const [developmentResetToken, setDevelopmentResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (action !== "verify" || !token) return;
    let active = true;
    api("/auth/verify-email", { method: "POST", body: { token } }).then((session) => {
      if (!active) return;
      signIn(session); setMessage("Email verified. You’re signed in."); window.setTimeout(() => navigate("/dashboard"), 1200);
    }).catch((failure) => { if (active) setMessage(failure.message); });
    return () => { active = false; };
  }, [action, token, signIn, navigate]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (action === "forgot") {
        const result = await api("/auth/forgot-password", { method: "POST", body: { email } });
        setMessage(result.message);
        if (result.developmentResetToken) { setToken(result.developmentResetToken); setDevelopmentResetToken(result.developmentResetToken); setMessage(result.message); }
      } else {
        const result = await api("/auth/reset-password", { method: "POST", body: { token, password } });
        setMessage(result.message); window.setTimeout(() => navigate("/login"), 1200);
      }
    } catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  };
  if (action === "verify") return <section className="section auth-action"><div className="auth-action-card"><ShieldCheck size={27} /><h1>Verify your email</h1><p role="status">{message || (token ? "Checking your verification link…" : "Open the verification link sent to your email address.")}</p>{!token && <ResendVerification />}</div></section>;
  return <section className="auth-action"><div className="auth-action-card"><LockKeyhole size={27} /><h1>{action === "forgot" ? "Reset your password" : "Choose a new password"}</h1><p>{action === "forgot" ? "We’ll send a time-limited password reset link if the account exists." : "Use the secure link from your email to choose a new password."}</p><form className="auth-form" onSubmit={submit}>{action === "forgot" ? <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label> : <><label>Reset token<input required value={token} onChange={(event) => setToken(event.target.value)} minLength="64" maxLength="64" /></label><label>New password<input type="password" required minLength="8" maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} /></label></>}{message && <p className="auth-action-message" role="status">{message}</p>}{developmentResetToken && <Link className="auth-development-link" to={`/reset-password?token=${developmentResetToken}`}>Open development reset link</Link>}<button className="button button-primary button-full" disabled={busy}>{busy ? "Please wait…" : action === "forgot" ? "Send reset link" : "Save new password"} <ArrowRight size={14} /></button></form></div></section>;
}

function ResendVerification() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setDevelopmentToken("");
    try { const result = await api("/auth/resend-verification", { method: "POST", body: { email } }); setMessage(result.message); setDevelopmentToken(result.developmentVerificationToken || ""); }
    catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="resend-verification"><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button type="button" className="button button-outline" disabled={busy || !email} onClick={send}>{busy ? "Sending…" : "Resend verification link"}</button>{message && <p role="status">{message}</p>}{developmentToken && <Link to={`/verify-email?token=${developmentToken}`}>Open development verification link</Link>}</div>;
}

function InfoPage({ page }) {
  const content = {
    about: ["About CareerConnect AI", "CareerConnect helps candidates discover opportunities and manage applications, while giving recruiters a clear workspace for hiring. Job matching and resume review are explainable heuristics; the app does not claim generative AI analysis."],
    contact: ["Contact us", "For support, platform concerns, or job-posting reports, sign in and use Reports & support. Email delivery can be configured by the site operator in the server environment."],
    privacy: ["Privacy policy", "Candidate resumes are stored privately and are never served from a public uploads folder. Resume access is limited to the owner, platform administrators, and recruiters whose jobs the candidate has applied to when profile visibility is enabled. Account, application, and assessment data is persisted in the configured MongoDB database."],
    terms: ["Terms and conditions", "Use accurate account and job information. Do not misuse personal data or submit unlawful or misleading postings. Assessments are practice quizzes, and resume matching is advisory rather than an employment decision. Platform administrators may review reports and moderate job postings."],
  }[page];
  return <section className="section info-page"><div className="eyebrow eyebrow-muted">CAREERCONNECT AI</div><h1>{content[0]}</h1><p>{content[1]}</p>{page === "contact" && <Link className="button button-dark" to="/workspace/support">Submit a support report <ArrowRight size={15} /></Link>}</section>;
}

function NotFound() {
  return <section className="section empty-state not-found"><span className="empty-state-icon"><Compass size={24} /></span><h1>Looks like a little detour.</h1><p>This page isn’t here, but your next opportunity might be.</p><Link className="button button-dark" to="/jobs">Explore jobs <ArrowRight size={16} /></Link></section>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link className="brand brand-footer" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span>careerconnect<span className="brand-ai">.ai</span></span></Link><p>A more thoughtful way to find work that feels right.</p></div><div className="footer-links"><div><span>EXPLORE</span><Link to="/jobs">Find jobs</Link><a href="/#how-it-works">How it works</a><Link to="/about">About</Link></div><div><span>GET STARTED</span><Link to="/register">Create a profile</Link><Link to="/login">Log in</Link><Link to="/contact">Contact</Link></div><div><span>POLICIES</span><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CareerConnect AI. Made for what’s next.</span><span>Thoughtful work. Better futures.</span></div></footer>;
}

export default App;
