// Shared interpretation of the VEYA inference response.
// Used by the on-screen results, the history drawer and the PDF report so all three always agree.

export type ScreeningStatus = "positive" | "negative" | "uncertain";
export type ScreeningEntry = { probability: number; threshold?: number; status: ScreeningStatus };

export type InferenceResult = {
  dr_grade?: { class: number; confidence: number; probabilities?: number[] };
  glaucoma?: { probability: number; positive: boolean };
  cataract?: { probability: number; positive: boolean };
  dr?: { probability: number; positive: boolean };
  // The API's own decision per disease (calibrated threshold + "doubt zone"). Stored with the scan so the
  // verdict, the probabilities and the recommendation always come from the same numbers.
  screening?: Partial<Record<"dr" | "glaucoma" | "cataract", ScreeningEntry>>;
};

// Explanation and recommendations returned by the VEYA API (texts are already in the requested language).
export type DiseaseKey = "dr" | "glaucoma" | "cataract";
export type RegionKey = "optic_disc" | "macula" | "vascular_arcades" | "periphery";

export type Finding = {
  disease: DiseaseKey;
  name: string;
  status: "positive" | "negative" | "uncertain";
  title: string;
  evidence: string[];
  attention?: { region: RegionKey; share: number }[];
};

export type Explanation = {
  method?: string;
  summary: string;
  findings: Finding[];
  image_quality?: { issues?: string[]; issues_text?: string[] };
  macula_involved?: boolean;
  heatmap_disease?: DiseaseKey;
  heatmap?: string;
  heatmaps?: Partial<Record<DiseaseKey, string>>;
};

export type Urgency = "routine" | "planned" | "soon" | "urgent" | "emergency";

export type RecommendationBlock = { urgency: Urgency; timeframe: string; headline: string; actions: string[]; exams: string[] };

export type Recommendations = {
  urgency: Urgency;
  urgency_label: string;
  timeframe: string;
  headline: string;
  by_disease: Partial<Record<DiseaseKey, RecommendationBlock>>;
  general: string[];
  red_flags_title: string;
  red_flags: string[];
};

export type ModelResult = { result?: InferenceResult; explanation?: Explanation; recommendations?: Recommendations };

export const DISEASE_ORDER: DiseaseKey[] = ["dr", "glaucoma", "cataract"];

export type Metric = {
  key: "dr" | "glaucoma" | "cataract";
  label: string;
  value: number; // 0..100
  positive: boolean;
  status: ScreeningStatus;
  tone: "amber" | "blue" | "violet";
  note: string;
  detail: string | null;
};

export type Interpretation = {
  highRisk: boolean;
  statusTitle: string;
  statusDetail: string;
  detectedConditions: string[];
  metrics: Metric[];
  drProbabilities: number[];
  recommendationTitle: string;
  recommendationDetail: string;
  hasResult: boolean;
};

type T = (key: string) => string;
const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100)));

/** Status of one disease: the API's screening decision when present, otherwise the legacy flags. */
export function diseaseStatus(result: InferenceResult | null | undefined, key: DiseaseKey): ScreeningStatus {
  const st = result?.screening?.[key]?.status;
  if (st === "positive" || st === "negative" || st === "uncertain") return st;
  if (key === "dr") return result?.dr ? (result.dr.positive ? "positive" : "negative") : (result?.dr_grade?.class ?? 0) >= 1 ? "positive" : "negative";
  return result?.[key]?.positive ? "positive" : "negative";
}

/** Probability shown for a disease (0..100) — the same number the API's decision was made on. */
export function diseaseValue(result: InferenceResult | null | undefined, key: DiseaseKey): number {
  const sc = result?.screening?.[key]?.probability;
  if (typeof sc === "number") return pct(sc);
  if (key === "dr") {
    if (typeof result?.dr?.probability === "number") return pct(result.dr.probability);
    const probs = result?.dr_grade?.probabilities ?? [1, 0, 0, 0, 0];
    return pct(probs.slice(1).reduce((sum, p) => sum + p, 0));
  }
  return pct(result?.[key]?.probability ?? 0);
}

/** High risk = anything that needs an ophthalmologist: a positive finding OR an inconclusive one. */
export function isHighRisk(result?: InferenceResult | null) {
  return DISEASE_ORDER.some((k) => diseaseStatus(result, k) !== "negative");
}

export function interpret(result: InferenceResult | null | undefined, t: T): Interpretation {
  const drProbabilities = result?.dr_grade?.probabilities?.length ? result.dr_grade.probabilities : [1, 0, 0, 0, 0];
  const status = { dr: diseaseStatus(result, "dr"), glaucoma: diseaseStatus(result, "glaucoma"), cataract: diseaseStatus(result, "cataract") };
  const value = { dr: diseaseValue(result, "dr"), glaucoma: diseaseValue(result, "glaucoma"), cataract: diseaseValue(result, "cataract") };
  const drValue = value.dr, glaucomaValue = value.glaucoma, cataractValue = value.cataract;
  const highRisk = isHighRisk(result);
  const grade = result?.dr_grade?.class ?? 0;
  const label = { dr: t("drName"), glaucoma: t("glaucomaName"), cataract: t("cataractName") };

  let statusTitle = t("noDr");
  let statusDetail = t("healthyRetina").replace("{dr}", String(drValue)).replace("{gl}", String(glaucomaValue)).replace("{cat}", String(cataractValue))
    .replace("{grade}", "0").replace("{confidence}", String(pct(drProbabilities[0] ?? 1)));
  const detectedConditions: string[] = [];

  if (status.dr === "positive") {
    statusTitle = t("drDetected");
    statusDetail = grade >= 1
      ? t(grade === 1 ? "gradeMild" : grade === 2 ? "gradeModerate" : "gradeSevere").replace("{grade}", String(grade))
      : t("drDetectedNoStage");
    detectedConditions.push(t("drDetected"));
  }
  if (status.glaucoma === "positive") {
    detectedConditions.push(t("glaucomaDetected"));
    if (detectedConditions.length === 1) {
      statusTitle = t("glaucomaDetected");
      statusDetail = t("glaucomaDetail").replace("{value}", String(glaucomaValue));
    }
  }
  if (status.cataract === "positive") {
    detectedConditions.push(t("cataractDetected"));
    if (detectedConditions.length === 1) {
      statusTitle = t("cataractDetected");
      statusDetail = t("cataractDetail").replace("{value}", String(cataractValue));
    }
  }
  if (detectedConditions.length > 1) {
    statusTitle = t("multipleDetected");
    statusDetail = `${t("detectedConditions")}: ${detectedConditions.join(", ")}. ${t("comprehensiveExam")}`;
  }
  const unsure = DISEASE_ORDER.filter((k) => status[k] === "uncertain");
  if (unsure.length) {
    const list = unsure.map((k) => `${label[k]} ${value[k]}%`).join(", ");
    if (!detectedConditions.length) {
      statusTitle = t("uncertainTitle");
      statusDetail = t("uncertainDetail").replace("{list}", list);
    } else {
      statusDetail = `${statusDetail} ${t("uncertainDetail").replace("{list}", list)}`;
    }
  }

  const posNeg = (st: ScreeningStatus) => (st === "positive" ? t("positive") : st === "uncertain" ? t("uncertainShort") : t("negative"));
  const metrics: Metric[] = [
    {
      key: "dr",
      label: t("drName"),
      value: drValue,
      positive: status.dr === "positive",
      status: status.dr,
      tone: "amber",
      note: result?.dr_grade ? t("drProbability").replace("{value}", String(drValue)).replace("{grade}", String(grade)) : t("noResult"),
      detail: result?.dr_grade ? drProbabilities.map((p, i) => `${t("grade")} ${i}: ${pct(p)}%`).join(", ") : null,
    },
    {
      key: "glaucoma",
      label: t("glaucomaName"),
      value: glaucomaValue,
      positive: status.glaucoma === "positive",
      status: status.glaucoma,
      tone: "blue",
      note: result?.glaucoma ? `${t("probability").replace("{value}", String(glaucomaValue))} · ${posNeg(status.glaucoma)}` : t("noResult"),
      detail: null,
    },
    {
      key: "cataract",
      label: t("cataractName"),
      value: cataractValue,
      positive: status.cataract === "positive",
      status: status.cataract,
      tone: "violet",
      note: result?.cataract ? `${t("probability").replace("{value}", String(cataractValue))} · ${posNeg(status.cataract)}` : t("noResult"),
      detail: null,
    },
  ];

  return {
    highRisk,
    statusTitle,
    statusDetail,
    detectedConditions,
    metrics,
    drProbabilities,
    recommendationTitle: highRisk ? t("referDilated") : t("routine"),
    recommendationDetail: highRisk ? t("confirmFollowup") : t("routineDetail"),
    hasResult: Boolean(result && (result.dr_grade || result.glaucoma || result.cataract)),
  };
}
