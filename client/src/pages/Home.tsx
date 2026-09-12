import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Bluetooth,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CloudUpload,
  Download,
  Eye,
  FileText,
  Gauge,
  HeartPulse,
  History,
  ImagePlus,
  Info,
  Laptop,
  Menu,
  MoreHorizontal,
  PlugZap,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  SunMedium,
  Target,
  UserRound,
  UsersRound,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type TabKey = "dashboard" | "analysis" | "history" | "settings";
type RiskFilter = "All" | "High risk" | "Normal";
type Patient = {
  name: string;
  id: string;
  date: string;
  time: string;
  risk: "High risk" | "Normal";
  score: string;
  eye: "OD" | "OS";
  initials: string;
  thumb: string;
};

type ModelResult = {
  result?: {
    dr_grade?: { class: number; confidence: number };
    glaucoma?: { probability: number; positive: boolean };
    cataract?: { probability: number; positive: boolean };
  };
};

const tabs: { key: TabKey; label: string; icon: typeof Menu }[] = [
  { key: "dashboard", label: "Main", icon: Menu },
  { key: "analysis", label: "Analysis", icon: Eye },
  { key: "history", label: "History", icon: History },
  { key: "settings", label: "Settings", icon: Settings2 },
];

const patients: Patient[] = [
  { name: "Aigerim Sadykova", id: "VE-24081", date: "Today", time: "09:42", risk: "High risk", score: "78%", eye: "OD", initials: "AS", thumb: "fundus-amber" },
  { name: "Timur Bekov", id: "VE-24079", date: "Today", time: "08:56", risk: "Normal", score: "94%", eye: "OS", initials: "TB", thumb: "fundus-coral" },
  { name: "Madina Omarova", id: "VE-24076", date: "Yesterday", time: "16:20", risk: "Normal", score: "89%", eye: "OD", initials: "MO", thumb: "fundus-violet" },
  { name: "Rustam Ilyasov", id: "VE-24072", date: "Yesterday", time: "11:08", risk: "High risk", score: "67%", eye: "OS", initials: "RI", thumb: "fundus-blue" },
];

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo-mark${light ? " logo-mark--light" : ""}`} aria-hidden="true">
      <span className="logo-mark__outer" />
      <span className="logo-mark__inner" />
    </span>
  );
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function StatusPill({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`connection-pill${compact ? " connection-pill--compact" : ""}`}>
      <span className="status-dot" />
      <span>{compact ? "Connected" : "visoScope 2.0 Connected"}</span>
    </span>
  );
}

function AppIcon({ children, tone = "mint" }: { children: ReactNode; tone?: string }) {
  return <span className={`app-icon app-icon--${tone}`}>{children}</span>;
}

function FundusThumb({ variant }: { variant: string }) {
  return (
    <span className={`fundus-thumb ${variant}`} aria-hidden="true">
      <span className="fundus-thumb__vessel fundus-thumb__vessel--one" />
      <span className="fundus-thumb__vessel fundus-thumb__vessel--two" />
      <span className="fundus-thumb__disc" />
      <span className="fundus-thumb__glow" />
    </span>
  );
}

function StatCard({ icon, tone, value, label, detail, trend }: { icon: ReactNode; tone: string; value: string; label: string; detail: string; trend?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card__top"><AppIcon tone={tone}>{icon}</AppIcon>{trend && <span className="trend-chip">{trend}</span>}</div>
      <strong>{value}</strong>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__detail">{detail}</span>
    </div>
  );
}

function RiskBadge({ risk }: { risk: Patient["risk"] }) {
  return <span className={`risk-badge risk-badge--${risk === "High risk" ? "high" : "normal"}`}><span />{risk}</span>;
}

function Dashboard({ onStart, onTab }: { onStart: () => void; onTab: (tab: TabKey) => void }) {
  return (
    <div className="screen screen--dashboard">
      <header className="topbar">
        <div className="brand-lockup"><LogoMark /><div><div className="brand-name">VEYA<span>AI</span></div><div className="brand-kicker">Ophthalmic screening</div></div></div>
        <button className="avatar-button" aria-label="Open clinician profile"><span>DR</span><span className="avatar-status" /></button>
      </header>

      <section className="welcome-row">
        <div><p className="date-line"><SunMedium size={14} /> Wednesday, 10 September 2026</p><h1>Good morning, <em>Dr. Aida.</em></h1><p className="welcome-detail">Your screening workspace is ready.</p></div>
        <StatusPill />
      </section>

      <section className="hero-card">
        <div className="hero-card__ambient" />
        <div className="hero-card__content"><span className="hero-card__eyebrow"><Sparkles size={14} /> CLINICAL INTELLIGENCE</span><h2>Screen earlier.<br /><em>See clearer.</em></h2><p>Veya makes retinal screening accessible in every clinic — with a result in under 30 seconds.</p><button className="button button--light" onClick={onStart}>Start new screening <ArrowUpRight size={17} /></button></div>
        <div className="hero-eye" aria-hidden="true"><span className="hero-eye__ring hero-eye__ring--outer" /><span className="hero-eye__ring hero-eye__ring--middle" /><span className="hero-eye__ring hero-eye__ring--inner" /><span className="hero-eye__spark" /></div>
        <div className="hero-card__footer"><span><span className="mini-live" /> Model endpoint ready</span><span>~ 30 sec analysis <Zap size={12} /></span></div>
      </section>

      <div className="section-title-row"><div><span className="eyebrow">TODAY AT A GLANCE</span><h2>Practice pulse</h2></div><button className="text-button" onClick={() => onTab("history")}>View history <ChevronRight size={15} /></button></div>
      <section className="stat-grid">
        <StatCard icon={<Activity size={17} />} tone="mint" value="24" label="Screenings today" detail="+6 from yesterday" trend="+33%" />
        <StatCard icon={<AlertCircle size={17} />} tone="coral" value="3" label="High risk detected" detail="Needs follow-up" />
        <StatCard icon={<Gauge size={17} />} tone="violet" value="28.4s" label="Avg AI latency" detail="Last 30 screenings" />
      </section>

      <section className="tech-card"><div className="tech-card__icon"><Target size={20} /></div><div className="tech-card__body"><span className="eyebrow">WHAT VEYA SEES</span><h3>Three signals. One clearer decision.</h3><p>Retinal patterns are screened for early signs of diabetic retinopathy, glaucoma, and cataract.</p><div className="signal-row"><span><i className="signal-dot signal-dot--amber" />Retinopathy</span><span><i className="signal-dot signal-dot--blue" />Glaucoma</span><span><i className="signal-dot signal-dot--violet" />Cataract</span></div></div><ChevronRight className="tech-card__arrow" size={18} /></section>

      <div className="section-title-row section-title-row--recent"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest screenings</h2></div><button className="icon-button" onClick={() => onTab("history")} aria-label="View all screenings"><MoreHorizontal size={19} /></button></div>
      <div className="screening-list screening-list--dashboard">{patients.slice(0, 2).map((patient) => <PatientRow key={patient.id} patient={patient} compact />)}</div>
    </div>
  );
}

function PatientRow({ patient, compact = false, onClick }: { patient: Patient; compact?: boolean; onClick?: () => void }) {
  return (
    <button className={`patient-row${compact ? " patient-row--compact" : ""}`} onClick={onClick}>
      <FundusThumb variant={patient.thumb} />
      <span className="patient-row__main"><strong>{patient.name}</strong><span>{patient.id} <b>·</b> {patient.date}, {patient.time}</span></span>
      <span className="patient-row__end"><RiskBadge risk={patient.risk} /><span className="patient-score">{patient.score}</span></span>
      {!compact && <ChevronRight size={16} className="patient-row__chevron" />}
    </button>
  );
}

function Analysis({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [eye, setEye] = useState<"OS" | "OD">("OS");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [modelResult, setModelResult] = useState<ModelResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [form, setForm] = useState({ name: "", age: "", id: "", notes: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setUploadedFile(file);
    setStep(3);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragActive(false); handleFile(event.dataTransfer.files?.[0]); };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0]);
  const beginScan = async () => {
    if (!uploadedFile) return;
    setScanning(true);
    setScanError("");
    try {
      const endpoint = localStorage.getItem("veya_api_endpoint") || import.meta.env.VITE_INFERENCE_API_URL || "http://localhost:8000/predict";
      const payload = new FormData();
      payload.append("file", uploadedFile);
      const response = await fetch(endpoint, { method: "POST", body: payload });
      if (!response.ok) throw new Error(`Inference API returned ${response.status}`);
      setModelResult(await response.json());
      setStep(4);
    } catch (error) {
      setScanError(error instanceof Error ? `${error.message}. Проверьте API endpoint в Settings.` : "Inference failed. Проверьте API endpoint в Settings.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="screen screen--analysis">
      <header className="subpage-header"><button className="icon-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button><div><span className="eyebrow">NEW WORKFLOW</span><h1>New screening</h1></div><span className="step-counter">0{Math.min(step, 4)} <span>/ 04</span></span></header>
      <div className="progress-track"><span style={{ width: `${step * 25}%` }} /></div>

      {step === 1 && <section className="flow-section flow-section--intro"><div className="flow-icon"><Stethoscope size={25} /></div><span className="eyebrow">STEP 01 · PATIENT</span><h2>Let’s start with<br /><em>the essentials.</em></h2><p className="flow-lead">A few details help Veya contextualize the screening. You can add the clinical note later.</p><div className="form-stack"><label>Patient name<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aigerim Sadykova" /></label><div className="form-row"><label>Age<input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Years" /></label><label>Patient ID / IIN<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="VE-00000" /></label></div><label>Symptoms or clinical notes <span className="optional">Optional</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add a note for the screening report..." rows={3} /></label></div><button className="button button--primary button--full" onClick={() => setStep(2)}>Continue to capture <ChevronRight size={17} /></button></section>}

      {step === 2 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">STEP 02 · CAPTURE</span><h2>Capture the<br /><em>fundus image.</em></h2></div><AppIcon tone="blue"><Camera size={19} /></AppIcon></div><p className="flow-lead">Place the visoScope and upload a well-focused retinal view.</p><div className="eye-toggle"><button className={eye === "OS" ? "is-active" : ""} onClick={() => setEye("OS")}><span>Left eye</span><b>OS</b></button><button className={eye === "OD" ? "is-active" : ""} onClick={() => setEye("OD")}><span>Right eye</span><b>OD</b></button></div><div className={`capture-zone${dragActive ? " is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={() => fileInput.current?.click()}><input ref={fileInput} type="file" accept="image/*" onChange={onInput} hidden /><div className="viewfinder"><span className="viewfinder__crosshair" /><span className="viewfinder__arc viewfinder__arc--one" /><span className="viewfinder__arc viewfinder__arc--two" /><Eye size={23} /></div><strong>{fileName || "Drop a fundus image here"}</strong><span>{fileName ? "Image ready for analysis" : "or tap to browse · JPG, PNG up to 10MB"}</span></div><div className="capture-tip"><Info size={15} /><span>For best results, use a centered image with the optic disc visible.</span></div><button className="button button--primary button--full" onClick={() => fileName ? setStep(3) : fileInput.current?.click()}>{fileName ? "Review image" : "Upload image"} <CloudUpload size={17} /></button><button className="button button--ghost button--full" onClick={() => setStep(1)}>Back to patient details</button></section>}

      {step === 3 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">STEP 03 · REVIEW</span><h2>Ready for<br /><em>the signal.</em></h2></div><AppIcon tone="violet"><Sparkles size={18} /></AppIcon></div><p className="flow-lead">Review the {eye === "OS" ? "left" : "right"} eye capture before starting the demo analysis.</p><div className="scan-preview">{fileUrl ? <img src={fileUrl} alt="Uploaded fundus preview" /> : <FundusThumb variant="fundus-amber" />}<div className="scan-preview__overlay"><span className="scan-eye-label">{eye} · FUNDUS IMAGE</span><span className="scan-quality"><Check size={13} /> Image quality good</span></div></div><div className="review-meta"><span><FileText size={15} />{fileName || "Demo fundus sample.jpg"}</span><button onClick={() => setStep(2)}><RotateCcw size={14} />Replace</button></div><div className="model-note"><span className="mini-live" /><div><strong>VEYA AI inference</strong><span>Image will be sent to the configured FastAPI model endpoint.</span></div></div>{scanError && <div className="capture-tip capture-tip--error"><AlertCircle size={15} /><span>{scanError}</span></div>}<button className="button button--primary button--full" onClick={beginScan} disabled={scanning}>{scanning ? "Analyzing signal..." : "Run AI screening"} {scanning ? <Activity size={17} className="spin" /> : <ArrowUpRight size={17} />}</button><button className="button button--ghost button--full" onClick={() => setStep(2)}>Back to capture</button></section>}

      {step === 4 && <Results modelResult={modelResult} onRestart={() => { setStep(1); setFileName(""); setFileUrl(""); setModelResult(null); }} patientName={form.name || "Patient"} eye={eye} />}
    </div>
  );
}

function Results({ onRestart, patientName, eye, modelResult }: { onRestart: () => void; patientName: string; eye: string; modelResult: ModelResult | null }) {
  const result = modelResult?.result;

  // Calculate DR probability as sum of Grade 1-4 (actual disease presence)
  const drProbabilities = result?.dr_grade?.probabilities || [1, 0, 0, 0, 0];
  const drDiseaseProb = drProbabilities.slice(1).reduce((sum, p) => sum + p, 0); // Sum of grades 1-4
  const drValue = Math.round(drDiseaseProb * 100);

  const glaucomaValue = Math.round((result?.glaucoma?.probability ?? 0) * 100);
  const cataractValue = Math.round((result?.cataract?.probability ?? 0) * 100);
  const highRisk = (result?.dr_grade?.class ?? 0) >= 1 || Boolean(result?.glaucoma?.positive) || Boolean(result?.cataract?.positive);

  // Detailed status message
  let statusTitle = "Healthy";
  let statusDetail = "No pathology detected in this screening.";
  const detectedConditions = [];

  if (result?.dr_grade) {
    const grade = result.dr_grade.class;
    if (grade === 0) {
      statusTitle = "No DR detected";
      statusDetail = `Diabetic retinopathy: Grade ${grade} (healthy retina, ${Math.round((drProbabilities[0] ?? 0) * 100)}% confidence)`;
    } else if (grade === 1) {
      statusTitle = "Mild DR detected";
      statusDetail = `Diabetic retinopathy: Grade ${grade} (mild non-proliferative DR, requires monitoring)`;
      detectedConditions.push("DR Grade 1");
    } else if (grade === 2) {
      statusTitle = "Moderate DR detected";
      statusDetail = `Diabetic retinopathy: Grade ${grade} (moderate non-proliferative DR, follow-up recommended)`;
      detectedConditions.push("DR Grade 2");
    } else if (grade >= 3) {
      statusTitle = "Severe DR detected";
      statusDetail = `Diabetic retinopathy: Grade ${grade} (${grade === 3 ? 'severe' : 'proliferative'} DR, urgent referral needed)`;
      detectedConditions.push(`DR Grade ${grade}`);
    }
  }

  if (result?.glaucoma?.positive) {
    detectedConditions.push("Glaucoma");
    if (detectedConditions.length === 1) {
      statusTitle = "Glaucoma detected";
      statusDetail = `Glaucoma risk: ${glaucomaValue}% probability. Optic nerve assessment and IOP measurement recommended.`;
    } else {
      statusDetail += ` Glaucoma: ${glaucomaValue}% probability.`;
    }
  }

  if (result?.cataract?.positive) {
    detectedConditions.push("Cataract");
    if (detectedConditions.length === 1) {
      statusTitle = "Cataract detected";
      statusDetail = `Cataract probability: ${cataractValue}%. Lens opacity affecting fundus clarity. Consider referral for cataract evaluation.`;
    } else {
      statusDetail += ` Cataract: ${cataractValue}% probability.`;
    }
  }

  // Update title for multiple conditions
  if (detectedConditions.length > 1) {
    statusTitle = `Multiple conditions detected`;
    statusDetail = `Detected: ${detectedConditions.join(", ")}. Comprehensive ophthalmologic examination recommended.`;
  }

  // Show all DR probabilities for transparency
  const drProbs = drProbabilities.map((p, i) => `Grade ${i}: ${Math.round(p * 100)}%`).join(', ');

  const metrics = [
    {
      label: "Diabetic retinopathy",
      value: drValue,
      tone: "amber",
      note: result?.dr_grade ? `${drValue}% disease probability (Detected: Grade ${result.dr_grade.class})` : "No result",
      detail: drProbs
    },
    {
      label: "Glaucoma",
      value: glaucomaValue,
      tone: "blue",
      note: result?.glaucoma ? `${glaucomaValue}% probability - ${result.glaucoma.positive ? "POSITIVE" : "Negative"}` : "No result",
      detail: null
    },
    {
      label: "Cataract",
      value: cataractValue,
      tone: "violet",
      note: result?.cataract ? `${cataractValue}% probability - ${result.cataract.positive ? "POSITIVE" : "Negative"}` : "No result",
      detail: null
    }
  ];

  return <section className="flow-section results-section"><div className="result-head"><div className="result-check"><Check size={24} /></div><span className="eyebrow">SCREENING COMPLETE · {eye}</span><h2>Review the<br /><em>clinical signal.</em></h2><p className="flow-lead">{patientName} · Real model inference completed.</p></div><div className={`result-banner ${highRisk ? "result-banner--high" : "result-banner--normal"}`}><div><span className="eyebrow">TRIAGE STATUS</span><strong>{statusTitle}</strong><p>{statusDetail}</p></div>{highRisk ? <AlertCircle size={28} /> : <Check size={28} />}</div><div className="metrics-card"><div className="card-title-row"><div><span className="eyebrow">SIGNAL BREAKDOWN</span><h3>AI Model Results</h3></div><span className="demo-tag">LIVE MODEL</span></div>{metrics.map((metric) => <div className="metric-bar" key={metric.label}><div><span>{metric.label}</span><strong>{metric.value}%</strong></div><div className="metric-track"><span className={`metric-fill metric-fill--${metric.tone}`} style={{ width: `${metric.value}%` }} /></div><small>{metric.note}</small>{metric.detail && <small style={{display:'block',marginTop:'4px',opacity:0.7,fontSize:'11px'}}>{metric.detail}</small>}</div>)}<details style={{marginTop:'16px',padding:'12px',background:'rgba(0,0,0,0.02)',borderRadius:'8px',fontSize:'12px'}}><summary style={{cursor:'pointer',fontWeight:600,marginBottom:'8px'}}>Raw AI Response (JSON)</summary><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',fontSize:'11px',lineHeight:1.4}}>{JSON.stringify(result, null, 2)}</pre></details></div><div className="recommendation"><AppIcon tone="mint"><Stethoscope size={17} /></AppIcon><div><span className="eyebrow">CLINICAL ACTION</span><strong>Refer for dilated eye examination</strong><p>Consider confirming with a clinical exam and documenting patient follow-up.</p></div></div><button className="button button--primary button--full"><Download size={17} />Export PDF report</button><button className="button button--guest button--full" onClick={onRestart}>Start another screening</button></section>;
}

function HistoryScreen({ onSelect }: { onSelect: (patient: Patient) => void }) {
  const [filter, setFilter] = useState<RiskFilter>("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => patients.filter((patient) => (filter === "All" || patient.risk === filter) && `${patient.name} ${patient.id}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="mint"><History size={18} /></AppIcon><div><span className="eyebrow">PATIENT ARCHIVE</span><h1>History</h1></div></div><button className="icon-button"><MoreHorizontal size={19} /></button></header><div className="history-summary"><div><strong>128</strong><span>Total screenings</span></div><div><strong>91%</strong><span>Normal results</span></div><div><strong>12</strong><span>Follow-ups</span></div></div><div className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or patient ID" />{query && <button onClick={() => setQuery("")}><X size={15} /></button>}</div><div className="filter-row">{(["All", "High risk", "Normal"] as RiskFilter[]).map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}{item !== "All" && <span>{patients.filter((patient) => patient.risk === item).length}</span>}</button>)}</div><div className="section-title-row section-title-row--history"><div><span className="eyebrow">SEPTEMBER 2026</span><h2>{filtered.length} screening{filtered.length === 1 ? "" : "s"}</h2></div><button className="icon-button"><SlidersHorizontal size={17} /></button></div><div className="screening-list">{filtered.length ? filtered.map((patient) => <PatientRow key={patient.id} patient={patient} onClick={() => onSelect(patient)} />) : <div className="empty-state"><Search size={20} /><strong>No screenings found</strong><span>Try a different name or filter.</span></div>}</div></div>;
}

function SettingsScreen() {
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("veya_api_endpoint") || import.meta.env.VITE_INFERENCE_API_URL || "http://localhost:8000/predict");
  const [saved, setSaved] = useState(true);
  const [calibrated, setCalibrated] = useState(true);
  const [autoUpload, setAutoUpload] = useState(false);
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="violet"><Settings2 size={18} /></AppIcon><div><span className="eyebrow">WORKSPACE</span><h1>Settings</h1></div></div><button className="icon-button"><CircleHelp size={18} /></button></header><section className="settings-hero"><div className="settings-hero__orb"><PlugZap size={21} /></div><div><span className="eyebrow">DEVICE STATUS</span><h2>Everything is in sync.</h2><p>visoScope 2.0 is paired and ready for your next capture.</p></div><StatusPill compact /></section><div className="settings-group"><div className="group-label"><span>AI BACKEND</span><span className="demo-tag">MODEL READY</span></div><div className="settings-card"><label className="setting-field"><span>API endpoint URL</span><div className="setting-input"><Wifi size={15} /><input value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setSaved(false); }} onBlur={() => { localStorage.setItem("veya_api_endpoint", endpoint); setSaved(true); }} /></div><small>Connect your FastAPI or PyTorch model when ready.</small></label><div className="setting-row"><div><strong>Live AI screening</strong><span>Send fundus images to the configured inference service.</span></div><span className="switch switch--on"><i /></span></div></div></div><div className="settings-group"><div className="group-label"><span>CLINIC PROFILE</span><button className="text-button">Edit <ArrowUpRight size={14} /></button></div><div className="settings-card settings-card--profile"><div className="clinic-avatar">BG</div><div><strong>BIO&GEN Clinic</strong><span>Almaty, Kazakhstan</span></div><ChevronRight size={17} /></div></div><div className="settings-group"><div className="group-label"><span>VISOSCOPE 2.0</span><span className="calibration-status"><Check size={12} /> Calibrated</span></div><div className="settings-card"><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="blue"><Camera size={16} /></AppIcon><div><strong>Optical preset</strong><span>iPhone 14 Pro · Standard field</span></div></div><ChevronRight size={16} /></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="mint"><Target size={16} /></AppIcon><div><strong>Camera calibration</strong><span>Last checked today at 08:12</span></div></div><button className={`toggle-button${calibrated ? " is-active" : ""}`} onClick={() => setCalibrated(!calibrated)}>{calibrated ? "Ready" : "Check"}</button></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="amber"><CloudUpload size={16} /></AppIcon><div><strong>Auto-upload after capture</strong><span>Send captures directly to endpoint</span></div></div><button className={`toggle-switch${autoUpload ? " is-active" : ""}`} onClick={() => setAutoUpload(!autoUpload)} aria-label="Toggle auto-upload"><i /></button></div></div></div><div className="settings-footer"><ShieldCheck size={15} /> Patient data stays on this device in demo mode.</div>{!saved && <span className="save-toast"><Check size={14} />Endpoint draft updated</span>}</div>;
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="patient-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-handle" /><div className="drawer-top"><span className="eyebrow">SCREENING DETAIL</span><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div><div className="drawer-profile"><FundusThumb variant={patient.thumb} /><div><h2>{patient.name}</h2><span>{patient.id} · {patient.date}, {patient.time}</span></div></div><div className="drawer-status"><div><span className="eyebrow">TRIAGE STATUS</span><strong>{patient.risk}</strong></div><RiskBadge risk={patient.risk} /></div><div className="drawer-section"><span className="eyebrow">CAPTURE DETAILS</span><div className="detail-grid"><div><span>Eye</span><strong>{patient.eye} · {patient.eye === "OS" ? "Left" : "Right"}</strong></div><div><span>AI confidence</span><strong>{patient.score}</strong></div><div><span>Latency</span><strong>28.4 sec</strong></div><div><span>Device</span><strong>visoScope 2.0</strong></div></div></div><div className="drawer-section"><span className="eyebrow">RECOMMENDATION</span><div className="recommendation recommendation--drawer"><AppIcon tone="mint"><Stethoscope size={16} /></AppIcon><div><strong>{patient.risk === "High risk" ? "Refer for clinical follow-up" : "Routine annual screening"}</strong><p>Review the full clinical context before making a diagnosis.</p></div></div></div><button className="button button--primary button--full"><Download size={16} />Export report</button></aside></div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [drawerPatient, setDrawerPatient] = useState<Patient | null>(null);
  const navigate = (tab: TabKey) => setActiveTab(tab);
  return <div className="app-shell"><div className="app-frame"><main className="app-main">{activeTab === "dashboard" && <Dashboard onStart={() => setActiveTab("analysis")} onTab={navigate} />}{activeTab === "analysis" && <Analysis onBack={() => setActiveTab("dashboard")} />}{activeTab === "history" && <HistoryScreen onSelect={setDrawerPatient} />}{activeTab === "settings" && <SettingsScreen />}</main><nav className="bottom-bar" aria-label="Primary navigation">{tabs.map(({ key, label, icon: Icon }) => <button key={key} className={activeTab === key ? "is-active" : ""} onClick={() => setActiveTab(key)}><span className="nav-icon"><Icon size={19} strokeWidth={activeTab === key ? 2.4 : 1.8} /></span><span>{label}</span>{key === "history" && <i className="nav-badge">3</i>}</button>)}</nav></div>{drawerPatient && <PatientDrawer patient={drawerPatient} onClose={() => setDrawerPatient(null)} />}</div>;
}
