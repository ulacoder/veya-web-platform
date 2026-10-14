// Shared interpretation of the VEYA inference response.
// Used by the on-screen results, the history drawer and the PDF report so all three always agree.

export type InferenceResult = {
  dr_grade?: { class: number; confidence: number; probabilities?: number[] };
  glaucoma?: { probability: number; positive: boolean };
  cataract?: { probability: number; positive: boolean };
};

export type ModelResult = { result?: InferenceResult };

export type Metric = {
  key: "dr" | "glaucoma" | "cataract";
  label: string;
  value: number; // 0..100
  positive: boolean;
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

export function isHighRisk(result?: InferenceResult | null) {
  return (result?.dr_grade?.class ?? 0) >= 1 || Boolean(result?.glaucoma?.positive) || Boolean(result?.cataract?.positive);
}

export function interpret(result: InferenceResult | null | undefined, t: T): Interpretation {
  const drProbabilities = result?.dr_grade?.probabilities?.length ? result.dr_grade.probabilities : [1, 0, 0, 0, 0];
  // DR disease probability = sum of grades 1..4
  const drValue = pct(drProbabilities.slice(1).reduce((sum, p) => sum + p, 0));
  const glaucomaValue = pct(result?.glaucoma?.probability ?? 0);
  const cataractValue = pct(result?.cataract?.probability ?? 0);
  const highRisk = isHighRisk(result);

  let statusTitle = t("noDr");
  let statusDetail = t("healthyRetina").replace("{grade}", "0").replace("{confidence}", String(pct(drProbabilities[0] ?? 1)));
  const detectedConditions: string[] = [];

  const grade = result?.dr_grade?.class ?? 0;
  if (result?.dr_grade && grade >= 1) {
    statusTitle = t("drDetected");
    statusDetail = t(grade === 1 ? "gradeMild" : grade === 2 ? "gradeModerate" : "gradeSevere").replace("{grade}", String(grade));
    detectedConditions.push(t("drDetected"));
  }
  if (result?.glaucoma?.positive) {
    detectedConditions.push(t("glaucomaDetected"));
    if (detectedConditions.length === 1) {
      statusTitle = t("glaucomaDetected");
      statusDetail = t("glaucomaDetail").replace("{value}", String(glaucomaValue));
    }
  }
  if (result?.cataract?.positive) {
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

  const posNeg = (positive?: boolean) => (positive ? t("positive") : t("negative"));
  const metrics: Metric[] = [
    {
      key: "dr",
      label: t("drName"),
      value: drValue,
      positive: grade >= 1,
      tone: "amber",
      note: result?.dr_grade ? t("drProbability").replace("{value}", String(drValue)).replace("{grade}", String(grade)) : t("noResult"),
      detail: result?.dr_grade ? drProbabilities.map((p, i) => `${t("grade")} ${i}: ${pct(p)}%`).join(", ") : null,
    },
    {
      key: "glaucoma",
      label: t("glaucomaName"),
      value: glaucomaValue,
      positive: Boolean(result?.glaucoma?.positive),
      tone: "blue",
      note: result?.glaucoma ? `${t("probability").replace("{value}", String(glaucomaValue))} · ${posNeg(result.glaucoma.positive)}` : t("noResult"),
      detail: null,
    },
    {
      key: "cataract",
      label: t("cataractName"),
      value: cataractValue,
      positive: Boolean(result?.cataract?.positive),
      tone: "violet",
      note: result?.cataract ? `${t("probability").replace("{value}", String(cataractValue))} · ${posNeg(result.cataract.positive)}` : t("noResult"),
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
