// PDF report for a single VEYA screening.
// pdfmake (+ Roboto, which covers Latin, Russian and Kazakh Cyrillic) is loaded lazily on first export
// so it does not weigh down the initial page load.
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { DISEASE_ORDER, interpret, type Explanation, type InferenceResult, type Recommendations } from "./clinical";

export type ReportLanguage = "en" | "ru" | "kk";

export type ReportScan = {
  name: string;
  id: string;
  age?: string;
  notes?: string;
  eye: "OD" | "OS";
  risk: "High risk" | "Normal";
  score: string;
  scannedAt?: string;
  date: string;
  time: string;
  image?: string;
  result?: InferenceResult | null;
  explanation?: Explanation;
  recommendations?: Recommendations;
  latencyMs?: number;
  source?: "live" | "demo";
  recordId?: string;
};

export type ReportClinician = { name?: string; hospital?: string; email?: string };

const L: Record<ReportLanguage, Record<string, string>> = {
  en: {
    title: "AI retinal screening report", reportNo: "Report No.", generated: "Generated", clinic: "Clinic", clinician: "Clinician",
    patient: "PATIENT", name: "Name", pid: "Patient ID / IIN", age: "Age", eye: "Eye", od: "OD · right", os: "OS · left", scanDate: "Screening date",
    image: "FUNDUS IMAGE", triage: "TRIAGE", high: "HIGH RISK — REFERRAL RECOMMENDED", normal: "NO SIGNS DETECTED",
    findings: "AI FINDINGS", condition: "Condition", probability: "Probability", result: "Result", positive: "Positive", negative: "Negative",
    grades: "Diabetic retinopathy grade distribution", grade: "Grade", gradeNames: "No DR|Mild|Moderate|Severe|Proliferative",
    recommendation: "RECOMMENDATION", notes: "CLINICAL NOTES", none: "—", latency: "Analysis time", confidence: "AI confidence",
    noDetail: "Detailed model output is not available for this record. Summary values are shown.", demo: "Demo record",
    disclaimer: "This report was produced by the VEYA AI screening system and is intended to support, not replace, clinical judgement. It is not a diagnosis. All findings must be confirmed by a qualified ophthalmologist.",
    reasoning: "AI REASONING", heatmap: "AI attention map (Grad-CAM)", when: "When", actions: "What to do", exams: "Examinations",
    signature: "Physician signature", stamp: "Date", page: "Page", of: "of",
  },
  ru: {
    title: "Отчёт AI-скрининга сетчатки", reportNo: "Отчёт №", generated: "Сформирован", clinic: "Клиника", clinician: "Врач",
    patient: "ПАЦИЕНТ", name: "ФИО", pid: "ID пациента / ИИН", age: "Возраст", eye: "Глаз", od: "OD · правый", os: "OS · левый", scanDate: "Дата скрининга",
    image: "СНИМОК ГЛАЗНОГО ДНА", triage: "ТРИАЖ", high: "ВЫСОКИЙ РИСК — РЕКОМЕНДОВАНО НАПРАВЛЕНИЕ", normal: "ПРИЗНАКОВ НЕ ВЫЯВЛЕНО",
    findings: "РЕЗУЛЬТАТЫ AI-АНАЛИЗА", condition: "Состояние", probability: "Вероятность", result: "Результат", positive: "Положительно", negative: "Отрицательно",
    grades: "Распределение по стадиям диабетической ретинопатии", grade: "Стадия", gradeNames: "Нет ДР|Лёгкая|Умеренная|Тяжёлая|Пролиферативная",
    recommendation: "РЕКОМЕНДАЦИЯ", notes: "КЛИНИЧЕСКИЕ ЗАМЕТКИ", none: "—", latency: "Время анализа", confidence: "Уверенность AI",
    noDetail: "Подробный ответ модели для этой записи недоступен. Показаны итоговые значения.", demo: "Демо-запись",
    disclaimer: "Отчёт сформирован системой AI-скрининга VEYA и служит поддержкой клинического решения, а не его заменой. Это не диагноз. Все результаты должны быть подтверждены врачом-офтальмологом.",
    reasoning: "ОБОСНОВАНИЕ ИИ", heatmap: "Карта внимания ИИ (Grad-CAM)", when: "Когда", actions: "Что сделать", exams: "Обследования",
    signature: "Подпись врача", stamp: "Дата", page: "Стр.", of: "из",
  },
  kk: {
    title: "Торлы қабықтың AI-скрининг есебі", reportNo: "Есеп №", generated: "Құрылды", clinic: "Клиника", clinician: "Дәрігер",
    patient: "ПАЦИЕНТ", name: "Аты-жөні", pid: "Пациент ID / ЖСН", age: "Жасы", eye: "Көз", od: "OD · оң", os: "OS · сол", scanDate: "Скрининг күні",
    image: "КӨЗ ТҮБІНІҢ СУРЕТІ", triage: "ТРИАЖ", high: "ЖОҒАРЫ ҚАУІП — ЖОЛДАМА ҰСЫНЫЛАДЫ", normal: "БЕЛГІЛЕР АНЫҚТАЛМАДЫ",
    findings: "AI ТАЛДАУ НӘТИЖЕЛЕРІ", condition: "Жағдай", probability: "Ықтималдық", result: "Нәтиже", positive: "Оң", negative: "Теріс",
    grades: "Диабеттік ретинопатия дәрежелері бойынша бөлу", grade: "Дәреже", gradeNames: "ДР жоқ|Жеңіл|Орташа|Ауыр|Пролиферативті",
    recommendation: "ҰСЫНЫС", notes: "КЛИНИКАЛЫҚ ЖАЗБАЛАР", none: "—", latency: "Талдау уақыты", confidence: "AI сенімділігі",
    noDetail: "Бұл жазба үшін модельдің толық жауабы жоқ. Қорытынды мәндер көрсетілген.", demo: "Демо жазба",
    disclaimer: "Есепті VEYA AI-скрининг жүйесі құрды. Ол клиникалық шешімді алмастырмайды, тек қолдайды. Бұл диагноз емес. Барлық нәтижелерді офтальмолог дәрігер растауы тиіс.",
    reasoning: "ЖИ НЕГІЗДЕМЕСІ", heatmap: "ЖИ назар картасы (Grad-CAM)", when: "Қашан", actions: "Не істеу керек", exams: "Тексерулер",
    signature: "Дәрігердің қолы", stamp: "Күні", page: "Бет", of: "/",
  },
};

const C = { deep: "#0b6b4f", green: "#26a96c", ink: "#12231d", muted: "#6f857c", line: "#dfe9e4", soft: "#f2f8f5", red: "#c2410c", redSoft: "#fff1ea" };

function locale(language: ReportLanguage) {
  return language === "ru" ? "ru-RU" : language === "kk" ? "kk-KZ" : "en-GB";
}

function formatDateTime(iso: string | undefined, fallback: string, language: ReportLanguage) {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat(locale(language), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

function reportNumber(scan: ReportScan) {
  const stamp = scan.scannedAt ? new Date(scan.scannedAt) : new Date();
  const ymd = Number.isNaN(stamp.getTime()) ? "00000000" : stamp.toISOString().slice(0, 10).replaceAll("-", "");
  const tail = (scan.recordId || scan.id || "").replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase() || "00000";
  return `VEYA-${ymd}-${tail}`;
}

export function reportFileName(scan: ReportScan) {
  const safe = (scan.name || "patient").trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").slice(0, 40) || "patient";
  return `${reportNumber(scan)}_${safe}.pdf`;
}

function label(text: string): Content {
  return { text, fontSize: 7.5, bold: true, color: C.muted, characterSpacing: 1.1, margin: [0, 14, 0, 6] };
}

function kv(rows: Array<[string, string]>): Content {
  return {
    table: {
      widths: [110, "*"],
      body: rows.map(([k, v]) => [
        { text: k, color: C.muted, fontSize: 9 },
        { text: v || "—", color: C.ink, fontSize: 9.5, bold: true },
      ]),
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => C.line, paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 0 },
  };
}

export function buildReportDefinition(scan: ReportScan, language: ReportLanguage, t: (key: string) => string, clinician: ReportClinician, endpointHost?: string): TDocumentDefinitions {
  const s = L[language];
  const analysis = interpret(scan.result, t);
  const hasDetail = analysis.hasResult;
  const highRisk = hasDetail ? analysis.highRisk : scan.risk === "High risk";
  const generatedAt = formatDateTime(new Date().toISOString(), "", language);
  const scannedAt = formatDateTime(scan.scannedAt, `${scan.date}, ${scan.time}`, language);

  const content: Content[] = [];

  // Header
  content.push({
    columns: [
      { stack: [
        { text: [{ text: "VEYA", bold: true, color: C.deep, fontSize: 20, characterSpacing: 3 }, { text: " AI", bold: true, color: C.green, fontSize: 9 }] },
        { text: s.title, fontSize: 11, color: C.ink, bold: true, margin: [0, 4, 0, 0] },
      ] },
      { width: 200, alignment: "right", stack: [
        { text: `${s.reportNo} ${reportNumber(scan)}`, fontSize: 8.5, color: C.ink, bold: true },
        { text: `${s.generated}: ${generatedAt}`, fontSize: 8, color: C.muted, margin: [0, 3, 0, 0] },
        ...(clinician.hospital ? [{ text: `${s.clinic}: ${clinician.hospital}`, fontSize: 8, color: C.muted, margin: [0, 2, 0, 0] } as Content] : []),
        ...(clinician.name ? [{ text: `${s.clinician}: ${clinician.name}`, fontSize: 8, color: C.muted, margin: [0, 2, 0, 0] } as Content] : []),
      ] },
    ],
  });
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: C.deep }], margin: [0, 12, 0, 0] });

  // Patient + image side by side
  const patientBlock: Content = { stack: [
    label(s.patient),
    kv([
      [s.name, scan.name],
      [s.pid, scan.id],
      [s.age, scan.age || s.none],
      [s.eye, scan.eye === "OD" ? s.od : s.os],
      [s.scanDate, scannedAt],
      [s.confidence, scan.score],
      ...(scan.latencyMs ? [[s.latency, `${(scan.latencyMs / 1000).toFixed(1)} s`] as [string, string]] : []),
    ]),
    ...(scan.source === "demo" ? [{ text: s.demo, fontSize: 8, italics: true, color: C.muted, margin: [0, 4, 0, 0] } as Content] : []),
  ] };
  if (scan.image && /^data:image\/(jpeg|png)/.test(scan.image)) {
    content.push({ columns: [
      { width: "*", ...patientBlock } as Content,
      { width: 170, stack: [label(s.image), { image: scan.image, fit: [170, 170], alignment: "center" }] },
    ], columnGap: 22 });
  } else {
    content.push(patientBlock);
  }

  // Triage banner
  content.push(label(s.triage));
  content.push({
    table: { widths: ["*"], body: [[{
      stack: [
        { text: highRisk ? s.high : s.normal, bold: true, fontSize: 10, color: highRisk ? C.red : C.deep, characterSpacing: 0.4 },
        ...(hasDetail ? [
          { text: analysis.statusTitle, bold: true, fontSize: 12, color: C.ink, margin: [0, 5, 0, 2] } as Content,
          { text: scan.recommendations ? `${scan.recommendations.headline} — ${scan.recommendations.timeframe}.` : analysis.statusDetail, fontSize: 9, color: C.ink, lineHeight: 1.25 } as Content,
        ] : []),
      ],
      fillColor: highRisk ? C.redSoft : C.soft,
      margin: [10, 8, 10, 9],
    }]] },
    layout: "noBorders",
  });

  // Findings
  content.push(label(s.findings));
  if (hasDetail) {
    content.push({
      table: {
        headerRows: 1,
        widths: ["*", 80, 90],
        body: [
          [s.condition, s.probability, s.result].map((h) => ({ text: h, bold: true, fontSize: 8.5, color: C.muted })),
          ...analysis.metrics.map((m) => [
            { text: m.label, fontSize: 10, color: C.ink, bold: true },
            { text: `${m.value}%`, fontSize: 10, color: C.ink },
            { text: m.positive ? s.positive : s.negative, fontSize: 10, bold: m.positive, color: m.positive ? C.red : C.deep },
          ]),
        ],
      },
      layout: { hLineWidth: (i: number) => (i === 0 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => C.line, paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 0 },
    });
    if (scan.result?.dr_grade) {
      const names = s.gradeNames.split("|");
      const dominant = scan.result.dr_grade.class;
      content.push({ text: s.grades, fontSize: 8.5, color: C.muted, margin: [0, 12, 0, 5] });
      content.push({
        table: {
          widths: ["*", "*", "*", "*", "*"],
          body: [
            analysis.drProbabilities.slice(0, 5).map((_, i) => ({ text: `${s.grade} ${i}\n${names[i] || ""}`, fontSize: 7.5, color: C.muted, alignment: "center" })),
            analysis.drProbabilities.slice(0, 5).map((p, i) => ({ text: `${Math.round(p * 100)}%`, fontSize: 11, bold: i === dominant, color: i === dominant ? (i > 0 ? C.red : C.deep) : C.ink, alignment: "center", fillColor: i === dominant ? (i > 0 ? C.redSoft : C.soft) : undefined })),
          ],
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => C.line, vLineColor: () => C.line, paddingTop: () => 5, paddingBottom: () => 5 },
      });
    }
  } else {
    content.push({ text: s.noDetail, fontSize: 9, color: C.muted, italics: true });
  }

  // Why the AI answered so
  const ex = scan.explanation;
  if (ex) {
    content.push(label(s.reasoning));
    const flagged = ex.findings.filter((f) => f.status !== "negative");
    const shown = flagged.length ? flagged : ex.findings;
    const reasoning: Content = { stack: [
      { text: ex.summary, bold: true, fontSize: 9.5, color: C.ink, lineHeight: 1.25 },
      ...shown.map((f) => ({ stack: [
        { text: f.title, bold: true, fontSize: 9.5, color: f.status === "positive" ? C.red : C.ink, margin: [0, 7, 0, 2] },
        { ul: f.evidence.map((line) => ({ text: line, fontSize: 8.5, color: C.ink, lineHeight: 1.2 })) },
      ] } as Content)),
    ] };
    if (ex.heatmap && /^data:image\/(jpeg|png)/.test(ex.heatmap)) {
      content.push({ columns: [
        { width: "*", ...reasoning } as Content,
        { width: 150, stack: [{ image: ex.heatmap, fit: [150, 150], alignment: "center" }, { text: s.heatmap, fontSize: 7, color: C.muted, alignment: "center", margin: [0, 3, 0, 0] }] },
      ], columnGap: 18 });
    } else {
      content.push(reasoning);
    }
  }

  // Recommendation
  content.push(label(s.recommendation));
  const rec = scan.recommendations;
  if (rec) {
    const urgent = rec.urgency === "urgent" || rec.urgency === "emergency";
    content.push({
      table: { widths: ["*"], body: [[{
        stack: [
          { text: `${rec.urgency_label.toUpperCase()} · ${rec.timeframe}`, bold: true, fontSize: 10, color: urgent ? C.red : C.deep },
          { text: rec.headline, bold: true, fontSize: 11, color: C.ink, margin: [0, 4, 0, 0] },
        ],
        fillColor: urgent ? C.redSoft : C.soft,
        margin: [10, 7, 10, 8],
      }]] },
      layout: "noBorders",
    });
    for (const key of DISEASE_ORDER) {
      const block = rec.by_disease[key];
      if (!block) continue;
      const name = analysis.metrics.find((m) => m.key === key)?.label ?? key;
      content.push({ text: `${name} — ${s.when.toLowerCase()}: ${block.timeframe}`, bold: true, fontSize: 9.5, color: C.ink, margin: [0, 8, 0, 3] });
      if (block.actions.length) content.push({ text: s.actions, fontSize: 8, color: C.muted, margin: [0, 2, 0, 2] }, { ul: block.actions.map((a) => ({ text: a, fontSize: 8.5 })) });
      if (block.exams.length) content.push({ text: s.exams, fontSize: 8, color: C.muted, margin: [0, 4, 0, 2] }, { ul: block.exams.map((a) => ({ text: a, fontSize: 8.5 })) });
    }
    if (rec.general.length) content.push({ ul: rec.general.map((a) => ({ text: a, fontSize: 8.5 })), margin: [0, 8, 0, 0] });
    content.push({
      table: { widths: ["*"], body: [[{
        stack: [
          { text: rec.red_flags_title, bold: true, fontSize: 8.5, color: C.red },
          { ul: rec.red_flags.map((a) => ({ text: a, fontSize: 8.5, color: C.ink })), margin: [0, 3, 0, 0] },
        ],
        fillColor: C.redSoft,
        margin: [10, 6, 10, 7],
      }]] },
      layout: "noBorders",
      margin: [0, 8, 0, 0],
    });
  } else {
    content.push({ text: highRisk ? t("referDilated") : t("routine"), bold: true, fontSize: 10.5, color: C.ink });
    content.push({ text: highRisk ? t("confirmFollowup") : t("routineDetail"), fontSize: 9, color: C.ink, margin: [0, 3, 0, 0], lineHeight: 1.25 });
  }

  if (scan.notes?.trim()) {
    content.push(label(s.notes));
    content.push({ text: scan.notes.trim(), fontSize: 9.5, color: C.ink, lineHeight: 1.3 });
  }

  // Signature
  content.push({
    margin: [0, 34, 0, 0],
    columns: [
      { stack: [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.6, lineColor: C.muted }] }, { text: s.signature, fontSize: 8, color: C.muted, margin: [0, 4, 0, 0] }] },
      { width: 160, stack: [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 0.6, lineColor: C.muted }] }, { text: s.stamp, fontSize: 8, color: C.muted, margin: [0, 4, 0, 0] }] },
    ],
    columnGap: 40,
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 70],
    info: { title: `${s.title} — ${scan.name}`, author: clinician.name || "VEYA AI", subject: reportNumber(scan), creator: "VEYA AI" },
    defaultStyle: { font: "Roboto", fontSize: 10, color: C.ink },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 10, 40, 0],
      stack: [
        { text: s.disclaimer, fontSize: 7, color: C.muted, lineHeight: 1.2 },
        { columns: [
          { text: `VEYA AI${endpointHost ? ` · ${endpointHost}` : ""}`, fontSize: 7, color: C.muted },
          { text: `${s.page} ${currentPage} ${s.of} ${pageCount}`, fontSize: 7, color: C.muted, alignment: "right" },
        ], margin: [0, 5, 0, 0] },
      ],
    }),
  };
}

let pdfMakePromise: Promise<{ createPdf: (doc: TDocumentDefinitions, layouts?: unknown, fonts?: unknown, vfs?: Record<string, string>) => { download: (name: string) => void; getBlob: (cb: (blob: Blob) => void) => void }; vfs: Record<string, string> }> | null = null;

function loadPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]).then(([pdfMakeModule, fontsModule]) => {
      const pdfMake = ((pdfMakeModule as { default?: unknown }).default ?? pdfMakeModule) as { createPdf: never; vfs: Record<string, string> };
      const fonts = fontsModule as unknown as { default?: Record<string, unknown>; pdfMake?: { vfs: Record<string, string> } };
      const raw = (fonts.default ?? fonts) as Record<string, unknown>;
      const vfs = ((raw.pdfMake as { vfs?: Record<string, string> } | undefined)?.vfs ?? (raw.vfs as Record<string, string> | undefined) ?? raw) as Record<string, string>;
      pdfMake.vfs = vfs;
      return { createPdf: pdfMake.createPdf, vfs };
    }).catch((error) => {
      pdfMakePromise = null;
      throw error;
    });
  }
  return pdfMakePromise;
}

export async function downloadReport(scan: ReportScan, language: ReportLanguage, t: (key: string) => string, clinician: ReportClinician, endpointHost?: string) {
  const pdfMake = await loadPdfMake();
  const definition = buildReportDefinition(scan, language, t, clinician, endpointHost);
  const fonts = { Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } };
  const blob = await new Promise<Blob>((resolve) => pdfMake.createPdf(definition, undefined, fonts, pdfMake.vfs).getBlob(resolve));
  const name = reportFileName(scan);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return name;
}
