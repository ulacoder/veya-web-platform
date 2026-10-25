import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Download,
  FileDown,
  FileText,
  History,
  House,
  ImageUp,
  Info,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  PlugZap,
  Plus,
  RotateCcw,
  ScanEye,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { interpret, isHighRisk, type Explanation, type InferenceResult, type ModelResult, type Recommendations } from "@/lib/clinical";
import { inspectImage, validateImageFile, type ImageCheck } from "@/lib/image";
import { extractBestFrames, isVideoFile, MAX_VIDEO_BYTES, representativeFrame, type FrameAnswer, type VideoFrame } from "@/lib/video";
import { downloadReport } from "@/lib/report";
import { FundusArt } from "@/components/FundusArt";
import { ExplanationCard, RecommendationCard } from "@/components/Explanation";

type TabKey = "dashboard" | "analysis" | "history" | "settings" | "profile";
type RiskFilter = "All" | "High risk" | "Normal";
type Language = "en" | "ru" | "kk";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (key: string) => string } | null>(null);
type Profile = { id: string; name: string; email: string; password: string; hospital: string };
const AUTH_USERS_KEY = "veya_mock_users";
const ACTIVE_PROFILE_KEY = "veya_active_profile";
function readProfiles(): Profile[] { try { const value = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function activeProfile(): Profile | null { const id = localStorage.getItem(ACTIVE_PROFILE_KEY); return readProfiles().find((profile) => profile.id === id) || null; }
function profileInitials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "DR"; }
const DEFAULT_INFERENCE_ENDPOINT = import.meta.env.VITE_INFERENCE_API_URL || "https://veya-inference.onrender.com/predict";
const ENDPOINT_STORAGE_KEY = "veya_api_endpoint";
const ENDPOINT_VERSION_KEY = "veya_api_endpoint_version";
const ENDPOINT_VERSION = "2"; // bump to move every device back to DEFAULT_INFERENCE_ENDPOINT
const isUsableEndpoint = (url: string) => /^https:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(url);
function readInferenceEndpoint() {
  try {
    if (localStorage.getItem(ENDPOINT_VERSION_KEY) !== ENDPOINT_VERSION) {
      // One-time migration: drop endpoints saved by older builds (localhost, temporary tunnels, old hosts).
      localStorage.removeItem(ENDPOINT_STORAGE_KEY);
      localStorage.setItem(ENDPOINT_VERSION_KEY, ENDPOINT_VERSION);
    }
    const stored = (localStorage.getItem(ENDPOINT_STORAGE_KEY) || "").trim();
    return isUsableEndpoint(stored) ? stored : DEFAULT_INFERENCE_ENDPOINT;
  } catch {
    return DEFAULT_INFERENCE_ENDPOINT;
  }
}
function saveInferenceEndpoint(value: string) {
  const url = value.trim();
  try {
    if (!url || url === DEFAULT_INFERENCE_ENDPOINT || !isUsableEndpoint(url)) localStorage.removeItem(ENDPOINT_STORAGE_KEY);
    else localStorage.setItem(ENDPOINT_STORAGE_KEY, url);
  } catch { /* storage unavailable: keep using the default */ }
  return url && isUsableEndpoint(url) ? url : DEFAULT_INFERENCE_ENDPOINT;
}
function profileHistoryKey() { return `${HISTORY_STORAGE_KEY_BASE}_${localStorage.getItem(ACTIVE_PROFILE_KEY) || "guest"}`; }
// The API writes the explanation and recommendations in the language it is asked for.
function withLanguage(endpoint: string, language: Language) {
  try {
    const url = new URL(endpoint);
    if (!url.searchParams.has("lang")) url.searchParams.set("lang", language);
    return url.toString();
  } catch {
    return endpoint;
  }
}
const translations: Record<Language, Record<string, string>> = {
  en: { main: "Main", analysis: "Analysis", history: "History", settings: "Settings", archive: "PATIENT ARCHIVE", total: "Total screenings", normal: "Normal results", followups: "Follow-ups", allScans: "ALL SAVED SCANS", screening: "screening", screenings: "screenings", search: "Search by name or patient ID", export: "Export history", manage: "Manage history", selected: "selected", demoProtected: "demo items cannot be deleted", delete: "Delete selected", deleting: "Deleting...", noFound: "No screenings found", tryAgain: "Try a different name or filter.", language: "Language", live: "Live", demo: "Demo", ophthalmic: "Ophthalmic screening", morning: "Good morning", workspaceReady: "Your screening workspace is ready.", clinical: "CLINICAL INTELLIGENCE", start: "Start new screening", viewHistory: "View history", newWorkflow: "NEW WORKFLOW", newScreening: "New screening", patient: "Patient", continue: "Continue", capture: "Capture", review: "Review", settingsTitle: "Settings", connected: "Connected", save: "Save", back: "Back", upload: "Upload image", run: "Run AI screening", analyzing: "Analyzing signal...", languageSaved: "Language is saved on this device" },
  ru: { main: "Главная", analysis: "Анализ", history: "История", settings: "Настройки", archive: "АРХИВ ПАЦИЕНТОВ", total: "Всего скринингов", normal: "Нормальные результаты", followups: "На контроле", allScans: "ВСЕ СОХРАНЁННЫЕ СКАНЫ", screening: "сканирование", screenings: "сканирований", search: "Поиск по имени или ID пациента", export: "Экспорт истории", manage: "Управление историей", selected: "выбрано", demoProtected: "демо-записи нельзя удалить", delete: "Удалить выбранные", deleting: "Удаление...", noFound: "Сканы не найдены", tryAgain: "Измените имя или фильтр.", language: "Язык", live: "Реальный", demo: "Демо", ophthalmic: "Офтальмологический скрининг", morning: "Доброе утро", workspaceReady: "Рабочее пространство готово к скринингу.", clinical: "КЛИНИЧЕСКИЙ ИНТЕЛЛЕКТ", start: "Начать скрининг", viewHistory: "Открыть историю", newWorkflow: "НОВЫЙ ПРОЦЕСС", newScreening: "Новый скрининг", patient: "Пациент", continue: "Продолжить", capture: "Снимок", review: "Проверка", settingsTitle: "Настройки", connected: "Подключено", save: "Сохранить", back: "Назад", upload: "Загрузить изображение", run: "Запустить AI-скрининг", analyzing: "Анализируем...", languageSaved: "Язык сохранён на этом устройстве" },
  kk: { main: "Басты бет", analysis: "Анализ", history: "Тарих", settings: "Баптаулар", archive: "ПАЦИЕНТТЕР МҰРАҒАТЫ", total: "Барлық скринингтер", normal: "Қалыпты нәтижелер", followups: "Бақылау қажет", allScans: "БАРЛЫҚ САҚТАЛҒАН СКАНДАР", screening: "скрининг", screenings: "скрининг", search: "Пациент аты немесе ID бойынша іздеу", export: "Тарихты экспорттау", manage: "Тарихты басқару", selected: "таңдалды", demoProtected: "демо жазбаларын жоюға болмайды", delete: "Таңдалғанды жою", deleting: "Жойылуда...", noFound: "Скан табылмады", tryAgain: "Басқа ат немесе сүзгі таңдаңыз.", language: "Тіл", live: "Нақты", demo: "Демо", ophthalmic: "Офтальмологиялық скрининг", morning: "Қайырлы таң", workspaceReady: "Скрининг жұмыс кеңістігі дайын.", clinical: "КЛИНИКАЛЫҚ ИНТЕЛЛЕКТ", start: "Скринингті бастау", viewHistory: "Тарихты ашу", newWorkflow: "ЖАҢА ПРОЦЕСС", newScreening: "Жаңа скрининг", patient: "Пациент", continue: "Жалғастыру", capture: "Түсірілім", review: "Тексеру", settingsTitle: "Баптаулар", connected: "Қосылған", save: "Сақтау", back: "Артқа", upload: "Суретті жүктеу", run: "AI скринингін іске қосу", analyzing: "Талдау орындалуда...", languageSaved: "Тіл осы құрылғыда сақталды" },
};
const extraTranslations: Record<Language, Record<string, string>> = {
  en: { workspace: "WORKSPACE", settingsTitle: "Settings", deviceStatus: "DEVICE STATUS", inSync: "Everything is in sync.", captureReady: "Capture service is paired and ready for your next scan.", aiBackend: "AI BACKEND", modelReady: "MODEL READY", endpoint: "API endpoint URL", endpointHelp: "Defaults to the hosted VEYA model (Render). Leave empty to reset.", liveScreening: "Live AI screening", liveHelp: "Send fundus images to the configured inference service.", clinicProfile: "CLINIC PROFILE", edit: "Edit", captureSystem: "CAPTURE SYSTEM", calibrated: "Calibrated", optical: "Optical capture", standardField: "Standard retinal field", cameraCalibration: "Camera calibration", lastChecked: "Last checked today at 08:12", ready: "Ready", check: "Check", autoUpload: "Auto-upload after capture", autoUploadHelp: "Send captures directly to endpoint", historyStored: "Scan history is stored securely in this browser.", screeningDetail: "SCREENING DETAIL", triage: "TRIAGE STATUS", captureDetails: "CAPTURE DETAILS", eye: "Eye", left: "Left", right: "Right", confidence: "AI confidence", latency: "Latency", device: "Device", recommendation: "RECOMMENDATION", followup: "Refer for clinical follow-up", routine: "Routine annual screening", reviewContext: "Review the full clinical context before making a diagnosis.", stepPatient: "STEP 01 · PATIENT", patientName: "Patient name", patientId: "Patient ID / IIN", symptoms: "Symptoms or clinical notes", optional: "Optional", years: "Years", notePlaceholder: "Add a note for the screening report...", continueCapture: "Continue to capture", stepCapture: "STEP 02 · CAPTURE", leftEye: "Left eye", rightEye: "Right eye", dropImage: "Drop a fundus image here", imageReady: "Image ready for analysis", browseImage: "or tap to browse · JPG, PNG up to 10MB", bestResults: "For best results, use a centered image with the optic disc visible.", uploadImage: "Upload image", backPatient: "Back to patient details", stepReview: "STEP 03 · REVIEW", reviewHelp: "Review the capture before starting the AI analysis.", qualityGood: "Image quality good", replace: "Replace", modelInference: "Image will be sent to the configured FastAPI model endpoint.", runScreening: "Run AI screening", analyzing: "Analyzing signal...", backCapture: "Back to capture", exportReport: "Export PDF report", save: "Save" },
  ru: { workspace: "РАБОЧЕЕ ПРОСТРАНСТВО", settingsTitle: "Настройки", deviceStatus: "СТАТУС УСТРОЙСТВА", inSync: "Всё синхронизировано.", captureReady: "Система съёмки подключена и готова к следующему скринингу.", aiBackend: "AI-БЭКЕНД", modelReady: "МОДЕЛЬ ГОТОВА", endpoint: "URL API endpoint", endpointHelp: "По умолчанию — облачная модель VEYA (Render). Очистите поле, чтобы вернуть.", liveScreening: "Живой AI-скрининг", liveHelp: "Отправлять снимки сетчатки в настроенный сервис анализа.", clinicProfile: "ПРОФИЛЬ КЛИНИКИ", edit: "Изменить", captureSystem: "СИСТЕМА СЪЁМКИ", calibrated: "Откалибровано", optical: "Оптическая съёмка", standardField: "Стандартное поле сетчатки", cameraCalibration: "Калибровка камеры", lastChecked: "Последняя проверка сегодня в 08:12", ready: "Готово", check: "Проверить", autoUpload: "Автозагрузка после съёмки", autoUploadHelp: "Отправлять снимки сразу в endpoint", historyStored: "История сканов безопасно хранится в браузере.", screeningDetail: "ДЕТАЛИ СКРИНИНГА", triage: "СТАТУС ТРИАЖА", captureDetails: "ДЕТАЛИ СНИМКА", eye: "Глаз", left: "Левый", right: "Правый", confidence: "Уверенность AI", latency: "Задержка", device: "Устройство", recommendation: "РЕКОМЕНДАЦИЯ", followup: "Направить на клиническое наблюдение", routine: "Плановый ежегодный скрининг", reviewContext: "Проверьте полный клинический контекст перед постановкой диагноза.", stepPatient: "ШАГ 01 · ПАЦИЕНТ", patientName: "Имя пациента", patientId: "ID пациента / ИИН", symptoms: "Симптомы или клинические заметки", optional: "Необязательно", years: "Лет", notePlaceholder: "Добавьте заметку к отчёту...", continueCapture: "Продолжить к снимку", stepCapture: "ШАГ 02 · СНИМОК", leftEye: "Левый глаз", rightEye: "Правый глаз", dropImage: "Перетащите снимок глазного дна", imageReady: "Изображение готово к анализу", browseImage: "или нажмите для выбора · JPG, PNG до 10 МБ", bestResults: "Для лучшего результата используйте центрированное изображение с видимым диском зрительного нерва.", uploadImage: "Загрузить снимок", backPatient: "Назад к данным пациента", stepReview: "ШАГ 03 · ПРОВЕРКА", reviewHelp: "Проверьте снимок перед запуском AI-анализа.", qualityGood: "Качество изображения хорошее", replace: "Заменить", modelInference: "Изображение будет отправлено на настроенный FastAPI endpoint.", runScreening: "Запустить AI-скрининг", analyzing: "Анализируем...", backCapture: "Назад к снимку", exportReport: "Экспорт PDF-отчёта", save: "Сохранить" },
  kk: { workspace: "ЖҰМЫС КЕҢІСТІГІ", settingsTitle: "Баптаулар", deviceStatus: "ҚҰРЫЛҒЫ КҮЙІ", inSync: "Барлығы синхрондалды.", captureReady: "Түсірілім жүйесі қосылған және келесі скринингке дайын.", aiBackend: "AI БЭКЕНДІ", modelReady: "МОДЕЛЬ ДАЙЫН", endpoint: "API endpoint URL", endpointHelp: "Әдепкі бойынша — VEYA бұлттық моделі (Render). Қалпына келтіру үшін өрісті тазалаңыз.", liveScreening: "Нақты AI скринингі", liveHelp: "Торлы қабық суреттерін талдау сервисіне жіберу.", clinicProfile: "КЛИНИКА ПРОФИЛІ", edit: "Өзгерту", captureSystem: "ТҮСІРІЛІМ ЖҮЙЕСІ", calibrated: "Калибрленген", optical: "Оптикалық түсірілім", standardField: "Торлы қабықтың стандартты өрісі", cameraCalibration: "Камера калибрлеуі", lastChecked: "Соңғы тексеріс бүгін 08:12-де", ready: "Дайын", check: "Тексеру", autoUpload: "Түсірілімнен кейін автоматты жүктеу", autoUploadHelp: "Суреттерді endpoint-ке бірден жіберу", historyStored: "Скан тарихы браузерде қауіпсіз сақталады.", screeningDetail: "СКРИНИНГ МӘЛІМЕТТЕРІ", triage: "ТРИАЖ МӘРТЕБЕСІ", captureDetails: "ТҮСІРІЛІМ МӘЛІМЕТТЕРІ", eye: "Көз", left: "Сол жақ", right: "Оң жақ", confidence: "AI сенімділігі", latency: "Кідіріс", device: "Құрылғы", recommendation: "ҰСЫНЫС", followup: "Клиникалық бақылауға жіберу", routine: "Жыл сайынғы жоспарлы скрининг", reviewContext: "Диагноз қоймас бұрын толық клиникалық контексті тексеріңіз.", stepPatient: "01-ҚАДАМ · ПАЦИЕНТ", patientName: "Пациент аты", patientId: "Пациент ID / ЖСН", symptoms: "Симптомдар немесе клиникалық жазбалар", optional: "Міндетті емес", years: "Жыл", notePlaceholder: "Скрининг есебіне жазба қосыңыз...", continueCapture: "Түсірілімге өту", stepCapture: "02-ҚАДАМ · ТҮСІРІЛІМ", leftEye: "Сол көз", rightEye: "Оң көз", dropImage: "Көз түбінің суретін осы жерге апарыңыз", imageReady: "Сурет талдауға дайын", browseImage: "немесе таңдау үшін басыңыз · JPG, PNG 10 МБ дейін", bestResults: "Жақсы нәтиже үшін көру жүйкесі дискісі көрінетін орталықтанған суретті пайдаланыңыз.", uploadImage: "Суретті жүктеу", backPatient: "Пациент мәліметтеріне оралу", stepReview: "03-ҚАДАМ · ТЕКСЕРУ", reviewHelp: "AI талдауын бастамас бұрын суретті тексеріңіз.", qualityGood: "Сурет сапасы жақсы", replace: "Ауыстыру", modelInference: "Сурет бапталған FastAPI моделіне жіберіледі.", runScreening: "AI скринингін іске қосу", analyzing: "Талдау орындалуда...", backCapture: "Түсірілімге оралу", exportReport: "PDF есебін экспорттау", save: "Сақтау" },
};
const resultTranslations: Record<Language, Record<string, string>> = {
  en: { screeningComplete: "SCREENING COMPLETE", clinicalSignal: "Review the|clinical signal.", inferenceDone: "Real model inference completed.", triage: "TRIAGE STATUS", noResult: "No result", signalBreakdown: "SIGNAL BREAKDOWN", modelResults: "AI Model Results", liveModel: "LIVE MODEL", rawResponse: "Raw AI Response (JSON)", clinicalAction: "CLINICAL ACTION", referDilated: "Refer for dilated eye examination", confirmFollowup: "Consider confirming with a clinical exam and documenting patient follow-up.", exportReport: "Export PDF report", another: "Start another screening", allFilter: "All", highRiskFilter: "High risk", normalFilter: "Normal", negative: "Negative", positive: "POSITIVE" },
  ru: { screeningComplete: "СКРИНИНГ ЗАВЕРШЁН", clinicalSignal: "Проверьте|клинический сигнал.", inferenceDone: "Работа реальной модели завершена.", triage: "СТАТУС ТРИАЖА", noResult: "Нет результата", signalBreakdown: "РАЗБОР СИГНАЛОВ", modelResults: "Результаты AI-модели", liveModel: "ЖИВАЯ МОДЕЛЬ", rawResponse: "Сырой ответ AI (JSON)", clinicalAction: "КЛИНИЧЕСКОЕ ДЕЙСТВИЕ", referDilated: "Направить на расширенное обследование", confirmFollowup: "Результат следует подтвердить клиническим осмотром и зафиксировать наблюдение.", exportReport: "Экспорт PDF-отчёта", another: "Начать новый скрининг", allFilter: "Все", highRiskFilter: "Высокий риск", normalFilter: "Норма", negative: "Отрицательно", positive: "ПОЛОЖИТЕЛЬНО" },
  kk: { screeningComplete: "СКРИНИНГ АЯҚТАЛДЫ", clinicalSignal: "Клиникалық|сигналды тексеріңіз.", inferenceDone: "Нақты модель талдауы аяқталды.", triage: "ТРИАЖ МӘРТЕБЕСІ", noResult: "Нәтиже жоқ", signalBreakdown: "СИГНАЛ ТАЛДАУЫ", modelResults: "AI моделінің нәтижелері", liveModel: "НАҒЫЗ МОДЕЛЬ", rawResponse: "AI жауабы (JSON)", clinicalAction: "КЛИНИКАЛЫҚ ӘРЕКЕТ", referDilated: "Кеңейтілген тексеруге жіберу", confirmFollowup: "Нәтижені клиникалық тексерумен растау және бақылауды тіркеу қажет.", exportReport: "PDF есебін экспорттау", another: "Жаңа скрининг бастау", allFilter: "Барлығы", highRiskFilter: "Жоғары қауіп", normalFilter: "Қалыпты", negative: "Теріс", positive: "ОҢ НӘТИЖЕ" },
};
const clinicalTranslations: Record<Language, Record<string, string>> = {
  en: { uncertainTitle: "Ophthalmologist check needed", uncertainDetail: "Inconclusive AI result: {list}. The final decision is the doctor's.", uncertainShort: "Check needed", drDetectedNoStage: "Signs of diabetic retinopathy; the stage should be determined by an ophthalmologist.", readySignal: "Ready for|the signal.", noDr: "No signs of disease found", healthyRetina: "All values are below the screening thresholds: retinopathy {dr}%, glaucoma {gl}%, cataract {cat}%.", drName: "Diabetic retinopathy", drProbability: "{value}% disease probability (Detected: Grade {grade})", grade: "Grade", glaucomaName: "Glaucoma", cataractName: "Cataract", probability: "{value}% probability", diseasePositive: "POSITIVE", diseaseNegative: "Negative", patientInference: "Real model inference completed.", fundusImage: "FUNDUS IMAGE", uploadedPreview: "Uploaded fundus preview", inferenceTitle: "VEYA AI inference", gradeMild: "Grade {grade}: changes detected; urgent ophthalmology examination recommended.", gradeModerate: "Grade {grade}: significant changes; urgent ophthalmology examination required.", gradeSevere: "Grade {grade}: severe changes; urgent referral required.", drDetected: "Diabetic retinopathy detected", glaucomaDetected: "Glaucoma detected", cataractDetected: "Cataract detected", glaucomaDetail: "Glaucoma probability: {value}%. Ophthalmology examination and intraocular pressure measurement are recommended.", cataractDetail: "Cataract probability: {value}%. Ophthalmology examination is recommended.", multipleDetected: "Multiple conditions detected", detectedConditions: "Detected", comprehensiveExam: "Comprehensive ophthalmology examination is urgently recommended." },
  ru: { uncertainTitle: "Нужна проверка офтальмолога", uncertainDetail: "Сомнительный результат ИИ: {list}. Окончательное решение — за врачом.", uncertainShort: "Нужна проверка", drDetectedNoStage: "Признаки диабетической ретинопатии; стадию определит офтальмолог.", readySignal: "Готовы к|анализу.", noDr: "Признаков заболеваний не выявлено", healthyRetina: "Все показатели ниже порогов скрининга: ретинопатия {dr}%, глаукома {gl}%, катаракта {cat}%.", drName: "Диабетическая ретинопатия", drProbability: "Вероятность заболевания {value}% (степень: {grade})", grade: "Степень", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Вероятность {value}%", diseasePositive: "ПОЛОЖИТЕЛЬНО", diseaseNegative: "Отрицательно", patientInference: "Работа реальной модели завершена.", fundusImage: "СНИМОК ГЛАЗНОГО ДНА", uploadedPreview: "Предпросмотр снимка", inferenceTitle: "AI-анализ VEYA", gradeMild: "Степень {grade}: выявлены изменения, требуется срочный осмотр офтальмолога.", gradeModerate: "Степень {grade}: выявлены выраженные изменения, требуется срочный осмотр офтальмолога.", gradeSevere: "Степень {grade}: тяжёлые изменения, необходимо срочно обратиться к офтальмологу.", drDetected: "Выявлена диабетическая ретинопатия", glaucomaDetected: "Выявлены признаки глаукомы", cataractDetected: "Выявлены признаки катаракты", glaucomaDetail: "Вероятность глаукомы: {value}%. Рекомендуется осмотр офтальмолога и измерение внутриглазного давления.", cataractDetail: "Вероятность катаракты: {value}%. Рекомендуется осмотр офтальмолога.", multipleDetected: "Выявлено несколько состояний", detectedConditions: "Выявлено", comprehensiveExam: "Необходим срочный комплексный осмотр офтальмолога." },
  kk: { uncertainTitle: "Офтальмолог тексеруі қажет", uncertainDetail: "ЖИ нәтижесі күмәнді: {list}. Соңғы шешімді дәрігер қабылдайды.", uncertainShort: "Тексеру қажет", drDetectedNoStage: "Диабеттік ретинопатия белгілері; сатысын офтальмолог анықтайды.", readySignal: "Сигнал|дайын.", noDr: "Ауру белгілері анықталмады", healthyRetina: "Барлық көрсеткіштер скрининг шегінен төмен: ретинопатия {dr}%, глаукома {gl}%, катаракта {cat}%.", drName: "Диабеттік ретинопатия", drProbability: "Ауру ықтималдығы {value}% (дәрежесі: {grade})", grade: "Дәреже", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Ықтималдық {value}%", diseasePositive: "ОҢ НӘТИЖЕ", diseaseNegative: "Теріс", patientInference: "Нақты модель талдауы аяқталды.", fundusImage: "КӨЗ ТҮБІНІҢ СУРЕТІ", uploadedPreview: "Сурет алдын ала көрінісі", inferenceTitle: "VEYA AI талдауы", gradeMild: "{grade}-дәреже: өзгерістер анықталды, офтальмологтың шұғыл тексеруі қажет.", gradeModerate: "{grade}-дәреже: айқын өзгерістер анықталды, офтальмологқа шұғыл қаралу қажет.", gradeSevere: "{grade}-дәреже: ауыр өзгерістер, офтальмологқа шұғыл жолдану қажет.", drDetected: "Диабеттік ретинопатия анықталды", glaucomaDetected: "Глаукома белгілері анықталды", cataractDetected: "Катаракта белгілері анықталды", glaucomaDetail: "Глаукома ықтималдығы: {value}%. Офтальмолог тексеруі және көз ішілік қысымды өлшеу қажет.", cataractDetail: "Катаракта ықтималдығы: {value}%. Офтальмолог тексеруі қажет.", multipleDetected: "Бірнеше жағдай анықталды", detectedConditions: "Анықталғаны", comprehensiveExam: "Офтальмологтың шұғыл кешенді тексеруі қажет." },
};
const dashboardTranslations: Record<Language, Record<string, string>> = {
  en: { screenEarlier: "Screen earlier.", seeClearer: "See clearer.", heroDescription: "Veya makes retinal screening accessible in every clinic — with a result in under 30 seconds.", modelReadyFooter: "Model endpoint ready", analysisTime: "~ 30 sec analysis", today: "TODAY AT A GLANCE", practicePulse: "Practice pulse", screeningsToday: "Screenings today", fromYesterday: "+6 from yesterday", highRiskDetected: "High risk detected", needsFollowup: "Needs follow-up", avgLatency: "Avg AI latency", last30: "Last 30 screenings", whatSees: "WHAT VEYA SEES", signalsDecision: "Three signals. One clearer decision.", signalsDescription: "Retinal patterns are screened for early signs of diabetic retinopathy, glaucoma, and cataract.", retinopathy: "Retinopathy", glaucoma: "Glaucoma", cataract: "Cataract", recentActivity: "RECENT ACTIVITY", latestScreenings: "Latest screenings" },
  ru: { screenEarlier: "Начните скрининг раньше.", seeClearer: "Видите яснее.", heroDescription: "Veya делает скрининг сетчатки доступным в каждой клинике — результат менее чем за 30 секунд.", modelReadyFooter: "Модель готова", analysisTime: "~ 30 сек анализа", today: "СЕГОДНЯ", practicePulse: "Пульс клиники", screeningsToday: "Скринингов сегодня", fromYesterday: "+6 со вчера", highRiskDetected: "Высокий риск", needsFollowup: "Нужно наблюдение", avgLatency: "Средняя задержка AI", last30: "Последние 30 скринингов", whatSees: "ЧТО ВИДИТ VEYA", signalsDecision: "Три сигнала. Одно ясное решение.", signalsDescription: "Паттерны сетчатки проверяются на ранние признаки диабетической ретинопатии, глаукомы и катаракты.", retinopathy: "Ретинопатия", glaucoma: "Глаукома", cataract: "Катаракта", recentActivity: "НЕДАВНЯЯ АКТИВНОСТЬ", latestScreenings: "Последние скрининги" },
  kk: { screenEarlier: "Скринингті ертерек бастаңыз.", seeClearer: "Анығырақ көріңіз.", heroDescription: "Veya әр клиникада торлы қабық скринингін қолжетімді етеді — нәтиже 30 секундтан аз уақытта дайын.", modelReadyFooter: "Модель дайын", analysisTime: "~ 30 сек талдау", today: "БҮГІНГІ ШОЛУ", practicePulse: "Клиника көрсеткіші", screeningsToday: "Бүгінгі скринингтер", fromYesterday: "Кешегіден +6", highRiskDetected: "Жоғары қауіп", needsFollowup: "Бақылау қажет", avgLatency: "AI орташа кідірісі", last30: "Соңғы 30 скрининг", whatSees: "VEYA НЕНІ КӨРЕДІ", signalsDecision: "Үш сигнал. Бір анық шешім.", signalsDescription: "Торлы қабық үлгілері диабеттік ретинопатия, глаукома және катарактаның ерте белгілеріне тексеріледі.", retinopathy: "Ретинопатия", glaucoma: "Глаукома", cataract: "Катаракта", recentActivity: "СОҢҒЫ ӘРЕКЕТТЕР", latestScreenings: "Соңғы скринингтер" },
};
const workflowTranslations: Record<Language, Record<string, string>> = {
  en: { essentials: "Let’s start with|the essentials.", context: "A few details help Veya contextualize the screening. You can add the clinical note later.", captureFundus: "Capture the|fundus image.", captureHelp: "Upload a sharp, well-focused image of the retina.", age: "Age", reviewImage: "Review image" },
  ru: { essentials: "Начнём с|основных данных.", context: "Эти данные помогут Veya учесть контекст скрининга. Клиническую заметку можно добавить позже.", captureFundus: "Сделайте|снимок глазного дна.", captureHelp: "Загрузите чёткий, хорошо сфокусированный снимок сетчатки.", age: "Возраст", reviewImage: "Проверить снимок" },
  kk: { essentials: "Негізгі|мәліметтерден бастайық.", context: "Бұл мәліметтер Veya-ға скрининг контекстін түсінуге көмектеседі. Клиникалық жазбаны кейін қосуға болады.", captureFundus: "Көз түбінің|суретін түсіріңіз.", captureHelp: "Торлы қабықтың анық, жақсы фокусталған суретін жүктеңіз.", age: "Жасы", reviewImage: "Суретті тексеру" },
};
const videoTranslations: Record<Language, Record<string, string>> = {
  en: { captureHelp: "Upload a sharp fundus photo or a short video (5–15 s) filmed through the adapter.", imageHint: "Photo JPG/PNG up to 10 MB, or video MP4/MOV up to 300 MB. From a video Veya picks the sharpest frames itself.", chooseFile: "Choose photo or video", videoExtracting: "Picking the sharpest frames from the video… {value}%", videoTooLarge: "The video is larger than 300 MB. Trim it to 5–15 seconds.", videoUnreadable: "This video cannot be opened in the browser. Save it as MP4 (H.264) and try again.", videoNoRetina: "No frame with a clearly visible retina was found. Film the fundus closer and steadier.", videoFramesNote: "From the {duration} s video Veya picked the {n} sharpest frames. The AI checks each one and combines the answers — one blurry frame no longer decides the result.", videoFrameProgress: "Analyzing frame {i} of {n}…", videoResultTitle: "Video analysis", videoResultNote: "{n} frames analyzed; the report shows the most typical one. Frames agreeing: retinopathy {dr}/{n}, glaucoma {gl}/{n}, cataract {cat}/{n}.", videoBadge: "Video · {n} frames", framesPick: "Tap the frames the AI should analyze: {n} selected, about {sec} s.", framesPickHint: "Frames are sorted from the sharpest. More frames are more reliable (the AI compares them), fewer are faster." },
  ru: { captureHelp: "Загрузите чёткий снимок глазного дна или короткое видео (5–15 с), снятое через насадку.", imageHint: "Фото JPG/PNG до 10 МБ или видео MP4/MOV до 300 МБ. Из видео Veya сама выберет самые чёткие кадры.", chooseFile: "Выбрать фото или видео", videoExtracting: "Выбираем самые чёткие кадры из видео… {value}%", videoTooLarge: "Видео больше 300 МБ. Обрежьте его до 5–15 секунд.", videoUnreadable: "Это видео не открывается в браузере. Сохраните его в MP4 (H.264) и повторите.", videoNoRetina: "Не найден кадр с хорошо видимой сетчаткой. Снимите глазное дно ближе и ровнее.", videoFramesNote: "Из видео длиной {duration} с Veya выбрала {n} самых чётких кадров. ИИ проверит каждый и объединит ответы — один смазанный кадр больше не решает результат.", videoFrameProgress: "Анализируем кадр {i} из {n}…", videoResultTitle: "Анализ видео", videoResultNote: "Проанализировано кадров: {n}, в отчёте — самый типичный. Совпадение кадров: ретинопатия {dr}/{n}, глаукома {gl}/{n}, катаракта {cat}/{n}.", videoBadge: "Видео · {n} кадров", framesPick: "Нажмите на кадры, которые проверит ИИ: выбрано {n}, примерно {sec} с.", framesPickHint: "Кадры идут от самого чёткого. Больше кадров — надёжнее (ИИ сравнит их между собой), меньше — быстрее." },
  kk: { captureHelp: "Көз түбінің анық суретін немесе қондырма арқылы түсірілген қысқа бейнені (5–15 с) жүктеңіз.", imageHint: "JPG/PNG сурет 10 МБ дейін немесе MP4/MOV бейне 300 МБ дейін. Бейнеден Veya ең анық кадрларды өзі таңдайды.", chooseFile: "Сурет не бейне таңдау", videoExtracting: "Бейнеден ең анық кадрлар таңдалуда… {value}%", videoTooLarge: "Бейне 300 МБ-тан үлкен. Оны 5–15 секундқа дейін қысқартыңыз.", videoUnreadable: "Бұл бейне браузерде ашылмайды. Оны MP4 (H.264) ретінде сақтап, қайталаңыз.", videoNoRetina: "Торлы қабық анық көрінетін кадр табылмады. Көз түбін жақынырақ әрі тұрақты түсіріңіз.", videoFramesNote: "{duration} с бейнеден Veya ең анық {n} кадрды таңдады. ИИ әрқайсысын тексеріп, жауаптарды біріктіреді.", videoFrameProgress: "{n} кадрдың {i}-і талдануда…", videoResultTitle: "Бейне талдауы", videoResultNote: "Талданған кадрлар: {n}, есепте ең типтік кадр. Кадрлардың сәйкестігі: ретинопатия {dr}/{n}, глаукома {gl}/{n}, катаракта {cat}/{n}.", videoBadge: "Бейне · {n} кадр", framesPick: "ИИ тексеретін кадрларды басыңыз: {n} таңдалды, шамамен {sec} с.", framesPickHint: "Кадрлар ең анығынан басталады. Кадр көп болса — сенімдірек (ИИ оларды салыстырады), аз болса — жылдамырақ." },
};
const explainTranslations: Record<Language, Record<string, string>> = {
  en: { explainTitle: "Why the AI answered so", explainOriginal: "Your image", explainHeatmap: "AI attention map", explainHeatmapHint: "Bright areas are where the image influenced the AI answer most (Grad-CAM).", explainAttention: "Share of AI attention by retinal area", explainClear: "No signs found", explainQuality: "Image quality", recActions: "What to do", recExams: "Examinations at the visit", region_optic_disc: "Optic disc", region_macula: "Macula", region_vascular_arcades: "Vascular arcades", region_periphery: "Periphery" },
  ru: { explainTitle: "Обоснование ИИ", explainOriginal: "Ваш снимок", explainHeatmap: "Карта внимания ИИ", explainHeatmapHint: "Светлые зоны — участки снимка, которые сильнее всего повлияли на ответ ИИ (Grad-CAM).", explainAttention: "Доля внимания ИИ по зонам сетчатки", explainClear: "Признаков не найдено", explainQuality: "Качество снимка", recActions: "Что сделать", recExams: "Обследования на приёме", region_optic_disc: "Диск зрительного нерва", region_macula: "Макула", region_vascular_arcades: "Сосудистые аркады", region_periphery: "Периферия" },
  kk: { explainTitle: "ЖИ негіздемесі", explainOriginal: "Сіздің суретіңіз", explainHeatmap: "ЖИ назар картасы", explainHeatmapHint: "Ашық аймақтар — ЖИ жауабына ең көп әсер еткен сурет бөліктері (Grad-CAM).", explainAttention: "Тор аймақтары бойынша ЖИ назарының үлесі", explainClear: "Белгілер табылмады", explainQuality: "Сурет сапасы", recActions: "Не істеу керек", recExams: "Қабылдаудағы тексерулер", region_optic_disc: "Көру нервінің дискі", region_macula: "Макула", region_vascular_arcades: "Тамыр аркалары", region_periphery: "Шеткі бөлік" },
};
function useI18n() { return useContext(LanguageContext) ?? { language: "en" as Language, setLanguage: () => undefined, t: (key: string) => key }; }
const uiTranslations: Record<Language, Record<string, string>> = {
  en: { routineDetail: "No signs detected. Repeat screening in 12 months, or earlier if symptoms appear.", greetMorning: "Good morning", greetAfternoon: "Good afternoon", greetEvening: "Good evening", greetNight: "Good night", connectedShort: "Connected", vsYesterday: "{value} vs yesterday", noData: "No data yet", todayWord: "Today", yesterdayWord: "Yesterday", exporting: "Preparing PDF…", pdfReady: "Report saved: {name}", pdfFailed: "Could not create the PDF. Check the connection and try again.", fileTooLarge: "The file is larger than 10 MB. Choose a smaller image.", fileNotImage: "This file is not an image. Use JPG or PNG.", fileUnreadable: "The image could not be opened. Save it as JPG or PNG and try again.", qualityCheck: "Check image quality", issue_lowResolution: "Low resolution — the model works best from 512 px.", issue_tooDark: "The image is very dark — the retina may not be visible.", issue_tooBright: "The image is overexposed.", timeout: "The AI service did not respond within 2 minutes.", networkError: "Could not reach the AI service.", serverError: "The AI service returned an error", invalidResponse: "The AI service returned an unexpected response.", checkEndpoint: "Check the API endpoint in Settings and try again.", coldStart: "Waking up the AI server — the first analysis can take up to a minute.", cancel: "Cancel", storageFull: "Browser storage is full — the image was not saved with this scan.", savedToHistory: "Saved to history", openHistory: "Open history", analysisTimeLabel: "Analysis time {value} s", deleteConfirm: "Delete {count} selected scan(s)? This cannot be undone.", deleteOne: "Delete scan", deleteOneConfirm: "Delete this scan? This cannot be undone.", deleted: "Scan deleted", deleteFailed: "Could not delete the scan", testConnection: "Test connection", testing: "Checking…", reachable: "AI server is reachable", unreachable: "AI server is not reachable", connectionHelp: "Checks that the inference server answers. The first request after idle can take up to a minute.", statusUnknown: "NOT CHECKED", statusOnline: "ONLINE", statusOffline: "OFFLINE", autoUpload: "Auto-analyze after capture", autoUploadHelp: "Start AI screening as soon as a good-quality image is chosen", lastChecked: "Last checked {time}", notChecked: "Not checked yet", showDemo: "Show demo records", showDemoHelp: "Sample patients on the dashboard and in history", dataSection: "DATA", clearHistory: "Clear my scan history", clearHistoryHelp: "Removes scans saved in this browser for your profile", clearHistoryConfirm: "Delete all saved scans in this browser? This cannot be undone.", historyCleared: "History cleared", clearBtn: "Clear", logout: "Log out", help: "Help", helpTitle: "How to run a screening", helpStep1: "Enter the patient’s name, age and ID. Notes go into the PDF report.", helpStep2: "Choose the eye (OD — right, OS — left) and upload a centered fundus image with the optic disc visible.", helpStep3: "Run the AI screening. The model checks for diabetic retinopathy, glaucoma and cataract.", helpStep4: "Save the PDF report, attach it to the patient record and refer high-risk patients to an ophthalmologist.", helpSignalsTitle: "What the model checks", helpSignals: "Diabetic retinopathy grades 0–4, glaucoma and cataract probability. A result is flagged as high risk when any condition is positive.", helpDisclaimerTitle: "Important", helpDisclaimer: "VEYA is a screening support tool, not a diagnosis. Every result must be confirmed by an ophthalmologist.", close: "Close", demoAuthNote: "Demo sign-in: profiles are stored in this browser only.", noScansYet: "No screenings yet. Start your first one.", notesLabel: "Notes", csvExported: "History exported", noDetailStored: "Detailed AI output is not stored for this record.", ageYears: "{value} y.o." },
  ru: { routineDetail: "Признаков не выявлено. Повторный скрининг через 12 месяцев или раньше при появлении симптомов.", greetMorning: "Доброе утро", greetAfternoon: "Добрый день", greetEvening: "Добрый вечер", greetNight: "Доброй ночи", connectedShort: "Подключено", vsYesterday: "{value} к вчера", noData: "Пока нет данных", todayWord: "Сегодня", yesterdayWord: "Вчера", exporting: "Готовим PDF…", pdfReady: "Отчёт сохранён: {name}", pdfFailed: "Не удалось создать PDF. Проверьте подключение и попробуйте снова.", fileTooLarge: "Файл больше 10 МБ. Выберите изображение поменьше.", fileNotImage: "Это не изображение. Используйте JPG или PNG.", fileUnreadable: "Не удалось открыть изображение. Сохраните его как JPG или PNG и повторите.", qualityCheck: "Проверьте качество", issue_lowResolution: "Низкое разрешение — модель лучше работает от 512 px.", issue_tooDark: "Снимок очень тёмный — сетчатка может быть не видна.", issue_tooBright: "Снимок пересвечен.", timeout: "AI-сервис не ответил за 2 минуты.", networkError: "Не удалось связаться с AI-сервисом.", serverError: "AI-сервис вернул ошибку", invalidResponse: "AI-сервис вернул неожиданный ответ.", checkEndpoint: "Проверьте API endpoint в Настройках и повторите.", coldStart: "Запускаем AI-сервер — первый анализ может занять до минуты.", cancel: "Отмена", storageFull: "Память браузера заполнена — снимок не сохранён в истории.", savedToHistory: "Сохранено в историю", openHistory: "Открыть историю", analysisTimeLabel: "Время анализа {value} с", deleteConfirm: "Удалить выбранные сканы ({count})? Это действие нельзя отменить.", deleteOne: "Удалить скан", deleteOneConfirm: "Удалить этот скан? Это действие нельзя отменить.", deleted: "Скан удалён", deleteFailed: "Не удалось удалить скан", testConnection: "Проверить связь", testing: "Проверяем…", reachable: "AI-сервер доступен", unreachable: "AI-сервер недоступен", connectionHelp: "Проверяет, что сервер анализа отвечает. Первый запрос после простоя может занять до минуты.", statusUnknown: "НЕ ПРОВЕРЕНО", statusOnline: "ОНЛАЙН", statusOffline: "ОФЛАЙН", autoUpload: "Автоанализ после снимка", autoUploadHelp: "Запускать AI-скрининг сразу после выбора качественного снимка", lastChecked: "Последняя проверка: {time}", notChecked: "Ещё не проверялась", showDemo: "Показывать демо-записи", showDemoHelp: "Примеры пациентов на главной и в истории", dataSection: "ДАННЫЕ", clearHistory: "Очистить историю сканов", clearHistoryHelp: "Удаляет сканы, сохранённые в этом браузере для вашего профиля", clearHistoryConfirm: "Удалить все сохранённые сканы в этом браузере? Действие нельзя отменить.", historyCleared: "История очищена", clearBtn: "Очистить", logout: "Выйти", help: "Помощь", helpTitle: "Как провести скрининг", helpStep1: "Введите имя, возраст и ID пациента. Заметки попадут в PDF-отчёт.", helpStep2: "Выберите глаз (OD — правый, OS — левый) и загрузите центрированный снимок глазного дна с видимым диском зрительного нерва.", helpStep3: "Запустите AI-скрининг. Модель проверяет признаки диабетической ретинопатии, глаукомы и катаракты.", helpStep4: "Сохраните PDF-отчёт, приложите его к карте пациента и направьте пациентов с высоким риском к офтальмологу.", helpSignalsTitle: "Что проверяет модель", helpSignals: "Стадии диабетической ретинопатии 0–4, вероятность глаукомы и катаракты. Результат отмечается как высокий риск, если любое состояние положительное.", helpDisclaimerTitle: "Важно", helpDisclaimer: "VEYA — инструмент поддержки скрининга, а не диагноз. Каждый результат должен подтвердить офтальмолог.", close: "Закрыть", demoAuthNote: "Демо-вход: профили хранятся только в этом браузере.", noScansYet: "Скринингов пока нет. Начните первый.", notesLabel: "Заметки", csvExported: "История выгружена", noDetailStored: "Подробный ответ AI для этой записи не сохранён.", ageYears: "{value} лет" },
  kk: { routineDetail: "Белгілер анықталмады. Қайта скринингті 12 айдан кейін немесе симптомдар пайда болса ертерек жүргізіңіз.", greetMorning: "Қайырлы таң", greetAfternoon: "Қайырлы күн", greetEvening: "Қайырлы кеш", greetNight: "Қайырлы түн", connectedShort: "Қосылған", vsYesterday: "кешегімен салыстырғанда {value}", noData: "Әзірге дерек жоқ", todayWord: "Бүгін", yesterdayWord: "Кеше", exporting: "PDF дайындалуда…", pdfReady: "Есеп сақталды: {name}", pdfFailed: "PDF жасалмады. Байланысты тексеріп, қайталап көріңіз.", fileTooLarge: "Файл 10 МБ-тан үлкен. Кішірек сурет таңдаңыз.", fileNotImage: "Бұл сурет емес. JPG немесе PNG пайдаланыңыз.", fileUnreadable: "Суретті ашу мүмкін болмады. Оны JPG немесе PNG ретінде сақтап, қайталаңыз.", qualityCheck: "Сапасын тексеріңіз", issue_lowResolution: "Ажыратымдылығы төмен — модель 512 px-тен жақсы жұмыс істейді.", issue_tooDark: "Сурет тым қараңғы — торлы қабық көрінбеуі мүмкін.", issue_tooBright: "Сурет тым ашық.", timeout: "AI сервисі 2 минут ішінде жауап бермеді.", networkError: "AI сервисіне қосылу мүмкін болмады.", serverError: "AI сервисі қате қайтарды", invalidResponse: "AI сервисі күтпеген жауап қайтарды.", checkEndpoint: "Баптаулардағы API endpoint-ті тексеріп, қайталаңыз.", coldStart: "AI сервері іске қосылуда — алғашқы талдау бір минутқа дейін созылуы мүмкін.", cancel: "Болдырмау", storageFull: "Браузер жады толы — сурет тарихта сақталмады.", savedToHistory: "Тарихқа сақталды", openHistory: "Тарихты ашу", analysisTimeLabel: "Талдау уақыты {value} с", deleteConfirm: "Таңдалған скандарды ({count}) жою керек пе? Бұл әрекетті қайтару мүмкін емес.", deleteOne: "Сканды жою", deleteOneConfirm: "Бұл сканды жою керек пе? Бұл әрекетті қайтару мүмкін емес.", deleted: "Скан жойылды", deleteFailed: "Сканды жою мүмкін болмады", testConnection: "Байланысты тексеру", testing: "Тексерілуде…", reachable: "AI сервері қолжетімді", unreachable: "AI сервері қолжетімсіз", connectionHelp: "Талдау сервері жауап беретінін тексереді. Ұзақ күтуден кейінгі алғашқы сұрау бір минутқа дейін созылуы мүмкін.", statusUnknown: "ТЕКСЕРІЛМЕГЕН", statusOnline: "ОНЛАЙН", statusOffline: "ОФЛАЙН", autoUpload: "Түсірілімнен кейін автоталдау", autoUploadHelp: "Сапалы сурет таңдалғанда AI скринингін бірден бастау", lastChecked: "Соңғы тексеріс: {time}", notChecked: "Әлі тексерілмеген", showDemo: "Демо жазбаларды көрсету", showDemoHelp: "Басты бет пен тарихтағы мысал пациенттер", dataSection: "ДЕРЕКТЕР", clearHistory: "Скан тарихын тазалау", clearHistoryHelp: "Осы браузерде профиліңіз үшін сақталған скандарды жояды", clearHistoryConfirm: "Осы браузердегі барлық сақталған скандарды жою керек пе? Бұл әрекетті қайтару мүмкін емес.", historyCleared: "Тарих тазаланды", clearBtn: "Тазалау", logout: "Шығу", help: "Көмек", helpTitle: "Скринингті қалай жүргізу керек", helpStep1: "Пациенттің аты-жөнін, жасын және ID енгізіңіз. Жазбалар PDF есепке енеді.", helpStep2: "Көзді таңдаңыз (OD — оң, OS — сол) және көру жүйкесінің дискісі көрінетін орталықтанған көз түбі суретін жүктеңіз.", helpStep3: "AI скринингін іске қосыңыз. Модель диабеттік ретинопатия, глаукома және катаракта белгілерін тексереді.", helpStep4: "PDF есепті сақтап, пациент картасына тіркеңіз және жоғары қауіпті пациенттерді офтальмологқа жіберіңіз.", helpSignalsTitle: "Модель нені тексереді", helpSignals: "Диабеттік ретинопатия 0–4 дәрежелері, глаукома мен катаракта ықтималдығы. Кез келген жағдай оң болса, нәтиже жоғары қауіп ретінде белгіленеді.", helpDisclaimerTitle: "Маңызды", helpDisclaimer: "VEYA — скринингті қолдау құралы, диагноз емес. Әр нәтижені офтальмолог растауы тиіс.", close: "Жабу", demoAuthNote: "Демо кіру: профильдер тек осы браузерде сақталады.", noScansYet: "Әзірге скрининг жоқ. Біріншісін бастаңыз.", notesLabel: "Жазбалар", csvExported: "Тарих экспортталды", noDetailStored: "Бұл жазба үшін AI-дың толық жауабы сақталмаған.", ageYears: "{value} жас" },
};

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
  source?: "live" | "demo";
  recordId?: string;
  scannedAt?: string;
  age?: string;
  notes?: string;
  image?: string;
  result?: InferenceResult | null;
  explanation?: Explanation;
  recommendations?: Recommendations;
  latencyMs?: number;
  video?: { frames: number; agreement: Record<string, number> };
};

const HISTORY_STORAGE_KEY_BASE = "veya_scan_history";
const SHOW_DEMO_KEY = "veya_show_demo";

function readSetting(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function writeSetting(key: string, value: string | null) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
function readFlag(key: string, fallback: boolean) { const value = readSetting(key); return value === null ? fallback : value === "1"; }
function uid() { try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; } }
function scanKey(scan: Patient) { return scan.recordId || `${scan.id}|${scan.scannedAt || `${scan.date} ${scan.time}`}`; }

function readSavedScans(): Patient[] {
  try {
    const saved = JSON.parse(localStorage.getItem(profileHistoryKey()) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function notifyHistory() { window.dispatchEvent(new Event("veya-history-updated")); }

/** Writes the history, dropping stored images from the oldest scans if the browser quota is exceeded. */
function writeScans(scans: Patient[]): boolean {
  let next = scans.slice(0, 100);
  let imagesDropped = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      localStorage.setItem(profileHistoryKey(), JSON.stringify(next));
      return !imagesDropped;
    } catch {
      const withImage = next.map((scan, index) => (scan.image ? index : -1)).filter((index) => index >= 0);
      if (!withImage.length) { next = next.slice(0, Math.max(1, Math.floor(next.length / 2))); continue; }
      const drop = new Set(withImage.slice(-Math.max(1, Math.ceil(withImage.length / 3))));
      next = next.map((scan, index) => (drop.has(index) ? { ...scan, image: undefined } : scan));
      imagesDropped = true;
    }
  }
  return false;
}

function saveScan(scan: Patient) {
  const ok = writeScans([scan, ...readSavedScans().filter((item) => scanKey(item) !== scanKey(scan))]);
  notifyHistory();
  return ok;
}

async function deleteScan(scan: Patient): Promise<boolean> {
  if (scan.source !== "live") return false;
  // Records that came from the cloud API carry a server id; local records are removed only from this browser.
  if (scan.recordId && !scan.recordId.startsWith("local-")) {
    try {
      const response = await fetch(`/api/scans?id=${encodeURIComponent(scan.recordId)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) return false;
    } catch {
      return false;
    }
  }
  const key = scanKey(scan);
  writeScans(readSavedScans().filter((item) => scanKey(item) !== key));
  notifyHistory();
  return true;
}

function demoPatients(): Patient[] {
  const at = (daysAgo: number, hours: number, minutes: number) => { const date = new Date(); date.setDate(date.getDate() - daysAgo); date.setHours(hours, minutes, 0, 0); return date.toISOString(); };
  return [
    { name: "Aigerim Sadykova", id: "VE-24081", date: "Today", time: "09:42", scannedAt: at(0, 9, 42), risk: "High risk", score: "78%", eye: "OD", initials: "AS", thumb: "fundus-amber", source: "demo", age: "58", latencyMs: 27_900, result: { dr_grade: { class: 2, confidence: 0.78, probabilities: [0.07, 0.11, 0.78, 0.03, 0.01] }, glaucoma: { probability: 0.18, positive: false }, cataract: { probability: 0.09, positive: false } } },
    { name: "Timur Bekov", id: "VE-24079", date: "Today", time: "08:56", scannedAt: at(0, 8, 56), risk: "Normal", score: "94%", eye: "OS", initials: "TB", thumb: "fundus-coral", source: "demo", age: "44", latencyMs: 26_300, result: { dr_grade: { class: 0, confidence: 0.94, probabilities: [0.94, 0.04, 0.01, 0.005, 0.005] }, glaucoma: { probability: 0.06, positive: false }, cataract: { probability: 0.04, positive: false } } },
    { name: "Madina Omarova", id: "VE-24076", date: "Yesterday", time: "16:20", scannedAt: at(1, 16, 20), risk: "Normal", score: "89%", eye: "OD", initials: "MO", thumb: "fundus-violet", source: "demo", age: "37", latencyMs: 29_800, result: { dr_grade: { class: 0, confidence: 0.89, probabilities: [0.89, 0.07, 0.03, 0.005, 0.005] }, glaucoma: { probability: 0.11, positive: false }, cataract: { probability: 0.05, positive: false } } },
    { name: "Rustam Ilyasov", id: "VE-24072", date: "Yesterday", time: "11:08", scannedAt: at(1, 11, 8), risk: "High risk", score: "67%", eye: "OS", initials: "RI", thumb: "fundus-blue", source: "demo", age: "63", latencyMs: 29_500, result: { dr_grade: { class: 0, confidence: 0.67, probabilities: [0.67, 0.2, 0.1, 0.02, 0.01] }, glaucoma: { probability: 0.74, positive: true }, cataract: { probability: 0.22, positive: false } } },
  ];
}

function localeFor(language: Language) { return language === "ru" ? "ru-RU" : language === "kk" ? "kk-KZ" : "en-US"; }

function scanWhen(scan: Patient, language: Language, t: (key: string) => string) {
  if (!scan.scannedAt) return `${scan.date}, ${scan.time}`;
  const date = new Date(scan.scannedAt);
  if (Number.isNaN(date.getTime())) return `${scan.date}, ${scan.time}`;
  const time = date.toLocaleTimeString(localeFor(language), { hour: "2-digit", minute: "2-digit", hourCycle: language === "en" ? undefined : "h23" });
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `${t("todayWord")}, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `${t("yesterdayWord")}, ${time}`;
  return `${date.toLocaleDateString(localeFor(language), { day: "numeric", month: "short", year: "numeric" })}, ${time}`;
}

function exportScansCsv(scans: Patient[], language: Language, t: (key: string) => string) {
  const pct = (value?: number) => (typeof value === "number" ? `${Math.round(value * 100)}%` : "");
  const rows = [
    ["Patient", "Patient ID", "Age", "Date", "Eye", "Risk", "AI confidence", "DR grade", "Glaucoma", "Cataract", "Analysis time, s", "Notes", "Source"],
    ...scans.map((scan) => [scan.name, scan.id, scan.age || "", scanWhen(scan, language, t), scan.eye, scan.risk, scan.score, scan.result?.dr_grade ? String(scan.result.dr_grade.class) : "", pct(scan.result?.glaucoma?.probability), pct(scan.result?.cataract?.probability), scan.latencyMs ? (scan.latencyMs / 1000).toFixed(1) : "", scan.notes || "", scan.source === "live" ? "Live" : "Demo"]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  // BOM so Excel opens Cyrillic text correctly.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `veya-scan-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function useReportExport() {
  const { language, t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const exportReport = async (scan: Patient) => {
    if (exporting) return;
    setExporting(true);
    try {
      const profile = activeProfile();
      let host = "";
      if (scan.source === "live") { try { host = new URL(readInferenceEndpoint()).host; } catch { host = ""; } }
      const name = await downloadReport(scan, language, t, { name: profile?.name, hospital: profile?.hospital, email: profile?.email }, host);
      toast.success(t("pdfReady").replace("{name}", name));
    } catch (error) {
      console.error(error);
      toast.error(t("pdfFailed"));
    } finally {
      setExporting(false);
    }
  };
  return { exporting, exportReport };
}

const designTranslations: Record<Language, Record<string, string>> = {
  en: { stepNamePatient: "Patient", stepNameImage: "Image", stepNameReview: "Review", stepNameResult: "Result", howItWorks: "How it works", conditionsTitle: "Findings by condition", conditionsHint: "Positive results across all screenings in history", casesCount: "{n} of {total}", secAi: "AI model", secClinic: "Clinic", secCapture: "Capture device", secData: "Data", statusOnline: "Online", statusOffline: "Offline", statusUnknown: "Not checked", resultFor: "Screening result", recTitle: "Recommendation", captureDetailsTitle: "Capture details", exportCsv: "Export CSV", manageShort: "Select", doneShort: "Done", skip: "Skip to content", mainNav: "Main navigation", signedInAs: "Signed in", heroTitle: "Retinal screening during the visit", essentialsTitle: "Patient details", captureTitle: "Upload the fundus image", reviewTitle: "Check the image", optionalShort: "optional", positiveShort: "Positive", negativeShort: "Negative", selectedCount: "Selected: {n}", demoLocked: "Demo records cannot be deleted.", modelTag: "Live model", authLead: "Retinal screening for diabetic retinopathy, glaucoma and cataract — right during the visit.", newPatientHint: "Name and ID are printed on the PDF report.", resultsEmpty: "No screenings yet", resultsEmptyHint: "Run the first screening and it will appear here.", imageHint: "JPG or PNG up to 10 MB. Centered image with the optic disc visible.", chooseFile: "Choose file", dropHere: "or drag it here", eyeQuestion: "Which eye?", fileLabel: "File" },
  ru: { stepNamePatient: "Пациент", stepNameImage: "Снимок", stepNameReview: "Проверка", stepNameResult: "Результат", howItWorks: "Как это работает", conditionsTitle: "Находки по заболеваниям", conditionsHint: "Положительные результаты по всем скринингам в истории", casesCount: "{n} из {total}", secAi: "AI-модель", secClinic: "Клиника", secCapture: "Устройство съёмки", secData: "Данные", statusOnline: "Онлайн", statusOffline: "Офлайн", statusUnknown: "Не проверено", resultFor: "Результат скрининга", recTitle: "Рекомендация", captureDetailsTitle: "Детали снимка", exportCsv: "Экспорт CSV", manageShort: "Выбрать", doneShort: "Готово", skip: "Перейти к содержимому", mainNav: "Основная навигация", signedInAs: "Вы вошли", heroTitle: "Скрининг сетчатки прямо на приёме", essentialsTitle: "Данные пациента", captureTitle: "Загрузите снимок глазного дна", reviewTitle: "Проверьте снимок", optionalShort: "необязательно", positiveShort: "Выявлено", negativeShort: "Не выявлено", selectedCount: "Выбрано: {n}", demoLocked: "Демо-записи удалить нельзя.", modelTag: "Живая модель", authLead: "Скрининг сетчатки на диабетическую ретинопатию, глаукому и катаракту — прямо на приёме.", newPatientHint: "Имя и ID попадут в PDF-отчёт.", resultsEmpty: "Скринингов пока нет", resultsEmptyHint: "Проведите первый скрининг — он появится здесь.", imageHint: "JPG или PNG до 10 МБ. Центрированный снимок с видимым диском зрительного нерва.", chooseFile: "Выбрать файл", dropHere: "или перетащите сюда", eyeQuestion: "Какой глаз?", fileLabel: "Файл" },
  kk: { stepNamePatient: "Пациент", stepNameImage: "Сурет", stepNameReview: "Тексеру", stepNameResult: "Нәтиже", howItWorks: "Бұл қалай жұмыс істейді", conditionsTitle: "Аурулар бойынша нәтижелер", conditionsHint: "Тарихтағы барлық скрининг бойынша оң нәтижелер", casesCount: "{total} ішінен {n}", secAi: "AI моделі", secClinic: "Клиника", secCapture: "Түсіру құрылғысы", secData: "Деректер", statusOnline: "Онлайн", statusOffline: "Офлайн", statusUnknown: "Тексерілмеген", resultFor: "Скрининг нәтижесі", recTitle: "Ұсыныс", captureDetailsTitle: "Түсірілім мәліметтері", exportCsv: "CSV экспорттау", manageShort: "Таңдау", doneShort: "Дайын", skip: "Мазмұнға өту", mainNav: "Негізгі навигация", signedInAs: "Сіз кірдіңіз", heroTitle: "Торлы қабық скринингі қабылдау кезінде", essentialsTitle: "Пациент мәліметтері", captureTitle: "Көз түбінің суретін жүктеңіз", reviewTitle: "Суретті тексеріңіз", optionalShort: "міндетті емес", positiveShort: "Анықталды", negativeShort: "Анықталмады", selectedCount: "Таңдалды: {n}", demoLocked: "Демо жазбаларды жоюға болмайды.", modelTag: "Нақты модель", authLead: "Қабылдау кезінде диабеттік ретинопатия, глаукома және катарактаға торлы қабық скринингі.", newPatientHint: "Аты мен ID PDF есепке енеді.", resultsEmpty: "Әзірге скрининг жоқ", resultsEmptyHint: "Алғашқы скринингті жүргізіңіз — ол осында пайда болады.", imageHint: "JPG немесе PNG, 10 МБ дейін. Көру жүйкесінің дискісі көрінетін орталықтанған сурет.", chooseFile: "Файлды таңдау", dropHere: "немесе осында апарыңыз", eyeQuestion: "Қай көз?", fileLabel: "Файл" },
};

const navItems: { key: TabKey; icon: typeof Menu; label: string }[] = [
  { key: "dashboard", icon: House, label: "main" },
  { key: "analysis", icon: ScanEye, label: "analysis" },
  { key: "history", icon: History, label: "history" },
  { key: "settings", icon: Settings2, label: "settings" },
  { key: "profile", icon: UserRound, label: "profile" },
];

function LogoMark() {
  return <img className="logo-mark" src="/brand/veya-icon.svg" alt="" width={40} height={40} decoding="async" />;
}

// VEYΛ wordmark: the A is drawn without a crossbar so it mirrors the V of the mark.
function Wordmark() {
  return (
    <svg className="wordmark" viewBox="0 0 460 100" role="img" aria-label="VEYA" focusable="false">
      <path fill="currentColor" d="M0 0L36 0L57 58L78 0L114 0L74 100L40 100ZM126 0L208 0L208 27L160 27L160 37L200 37L200 63L160 63L160 73L208 73L208 100L126 100ZM220 0L256 0L277 40L298 0L334 0L294 62L294 100L260 100L260 62ZM386 0L420 0L460 100L424 100L403 42L382 100L346 100Z" />
    </svg>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const options: { value: Language; label: string }[] = [{ value: "kk", label: "KZ" }, { value: "ru", label: "RU" }, { value: "en", label: "EN" }];
  return (
    <div className="lang" role="radiogroup" aria-label={t("language")}>
      {options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={language === option.value} className={language === option.value ? "is-active" : ""} onClick={() => setLanguage(option.value)}>{option.label}</button>)}
    </div>
  );
}

function FundusThumb({ variant, image }: { variant: string; image?: string }) {
  return <span className={`thumb thumb--${variant}`} aria-hidden="true">{image ? <img src={image} alt="" /> : <FundusArt detail={false} />}</span>;
}

function RiskBadge({ risk }: { risk: Patient["risk"] }) {
  const { t } = useI18n();
  return <span className={`badge badge--${risk === "High risk" ? "risk" : "ok"}`}>{risk === "High risk" ? <TriangleAlert size={13} /> : <CircleCheck size={13} />}{risk === "High risk" ? t("highRiskFilter") : t("normalFilter")}</span>;
}

function formatToday(language: Language) {
  const today = new Date();
  if (language === "kk") {
    const weekdays = ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"];
    const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
    return `${today.getDate()} ${months[today.getMonth()]}, ${weekdays[today.getDay()]}`;
  }
  return new Intl.DateTimeFormat(localeFor(language), { weekday: "long", day: "numeric", month: "long" }).format(today);
}

function greetingKey() {
  const hour = new Date().getHours();
  return hour < 5 ? "greetNight" : hour < 12 ? "greetMorning" : hour < 18 ? "greetAfternoon" : hour < 23 ? "greetEvening" : "greetNight";
}


function PatientRow({ patient, onClick, selectable, selected }: { patient: Patient; onClick?: () => void; selectable?: boolean; selected?: boolean }) {
  const { language, t } = useI18n();
  return (
    <button className={`patient-row${selected ? " is-selected" : ""}`} onClick={onClick} aria-pressed={selectable ? selected : undefined}>
      {selectable && <span className={`check${selected ? " is-on" : ""}${patient.source !== "live" ? " is-locked" : ""}`} aria-hidden="true">{selected && <Check size={13} strokeWidth={3} />}</span>}
      <FundusThumb variant={patient.thumb} image={patient.image} />
      <span className="patient-row__main">
        <span className="patient-row__name">{patient.name}{patient.source === "demo" && <span className="tag tag--demo">{t("demo")}</span>}</span>
        <span className="patient-row__meta"><span>{patient.id}</span><span>{scanWhen(patient, language, t)}</span></span>
      </span>
      <span className="patient-row__eye">{patient.eye}</span>
      <span className="patient-row__end"><RiskBadge risk={patient.risk} /><span className="patient-row__score">{patient.score}</span></span>
      <ChevronRight size={18} className="patient-row__chev" aria-hidden="true" />
    </button>
  );
}

function Dashboard({ history, onStart, onTab, onSelect, onHelp }: { history: Patient[]; onStart: () => void; onTab: (tab: TabKey) => void; onSelect: (patient: Patient) => void; onHelp: () => void }) {
  const { language, t } = useI18n();
  const profile = activeProfile();
  const stats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const onDay = (scan: Patient, day: Date) => Boolean(scan.scannedAt) && new Date(scan.scannedAt as string).toDateString() === day.toDateString();
    const latencies = history.filter((scan) => scan.latencyMs).slice(0, 30).map((scan) => scan.latencyMs as number);
    const withResult = history.filter((scan) => scan.result);
    return {
      todayCount: history.filter((scan) => onDay(scan, today)).length,
      yesterdayCount: history.filter((scan) => onDay(scan, yesterday)).length,
      highRisk: history.filter((scan) => scan.risk === "High risk").length,
      avgLatency: latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length / 1000 : null,
      latencyCount: latencies.length,
      total: withResult.length,
      dr: withResult.filter((scan) => (scan.result?.dr_grade?.class ?? 0) >= 1).length,
      glaucoma: withResult.filter((scan) => scan.result?.glaucoma?.positive).length,
      cataract: withResult.filter((scan) => scan.result?.cataract?.positive).length,
    };
  }, [history]);
  const delta = stats.todayCount - stats.yesterdayCount;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  const firstName = (profile?.name || "").trim().split(/\s+/)[0] || "Doctor";
  const conditions = [
    { key: "dr", label: t("retinopathy"), count: stats.dr },
    { key: "glaucoma", label: t("glaucoma"), count: stats.glaucoma },
    { key: "cataract", label: t("cataract"), count: stats.cataract },
  ];
  return (
    <div className="page page--dash">
      <header className="page-head">
        <p className="page-head__kicker">{formatToday(language)}</p>
        <h1>{t(greetingKey())}, {firstName}</h1>
        {profile?.hospital && <p className="page-head__sub">{profile.hospital}</p>}
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h2 id="hero-title">{t("heroTitle")}</h2>
          <p>{t("heroDescription")}</p>
          <div className="hero__actions">
            <button className="btn btn--lime" onClick={onStart}><ScanEye size={19} />{t("start")}</button>
            <button className="btn btn--on-dark" onClick={onHelp}>{t("howItWorks")}</button>
          </div>
          <ul className="hero__status">
            <li><span className="pulse" />{t("modelReadyFooter")}</li>
          </ul>
        </div>
        <div className="hero__scope" aria-hidden="true"><FundusArt className="hero__fundus" /><span className="hero__aperture" /></div>
      </section>

      <section className="kpis" aria-label={t("practicePulse")}>
        <div className="kpi"><span className="kpi__label">{t("screeningsToday")}</span><strong className="kpi__value">{stats.todayCount}</strong><span className="kpi__meta">{t("vsYesterday").replace("{value}", signed(delta))}</span></div>
        <div className="kpi kpi--risk"><span className="kpi__label">{t("highRiskDetected")}</span><strong className="kpi__value">{stats.highRisk}</strong><span className="kpi__meta">{t("needsFollowup")}</span></div>
        <div className="kpi"><span className="kpi__label">{t("avgLatency")}</span><strong className="kpi__value">{stats.avgLatency === null ? "—" : <>{stats.avgLatency.toFixed(1)}<small> s</small></>}</strong><span className="kpi__meta">{stats.latencyCount ? t("last30") : t("noData")}</span></div>
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head"><h2>{t("latestScreenings")}</h2><button className="link-btn" onClick={() => onTab("history")}>{t("viewHistory")}<ChevronRight size={16} /></button></div>
          {history.length ? <div className="list">{history.slice(0, 5).map((patient) => <PatientRow key={`${patient.source}-${scanKey(patient)}`} patient={patient} onClick={() => onSelect(patient)} />)}</div> : <div className="empty"><FundusArt className="empty__art" /><strong>{t("resultsEmpty")}</strong><span>{t("resultsEmptyHint")}</span><button className="btn btn--primary" onClick={onStart}>{t("start")}</button></div>}
        </section>
        <section className="panel panel--conditions">
          <div className="panel__head"><h2>{t("conditionsTitle")}</h2></div>
          <p className="panel__hint">{t("conditionsHint")}</p>
          <ul className="conditions">
            {conditions.map((item) => <li key={item.key}><span className={`cond-dot cond-dot--${item.key}`} /><span className="conditions__name">{item.label}</span><span className="conditions__count">{t("casesCount").replace("{n}", String(item.count)).replace("{total}", String(stats.total))}</span><span className="conditions__bar"><span className={`fill fill--${item.key}`} style={{ width: `${stats.total ? (item.count / stats.total) * 100 : 0}%` }} /></span></li>)}
          </ul>
          <button className="link-btn" onClick={onHelp}><CircleHelp size={16} />{t("howItWorks")}</button>
        </section>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const { t } = useI18n();
  const names = [t("stepNamePatient"), t("stepNameImage"), t("stepNameReview"), t("stepNameResult")];
  return (
    <ol className="stepper">
      {names.map((name, index) => {
        const n = index + 1;
        const state = n < step ? "is-done" : n === step ? "is-current" : "";
        return <li key={name} className={state} aria-current={n === step ? "step" : undefined}><span className="stepper__n">{n < step ? <Check size={14} strokeWidth={3} /> : n}</span><span className="stepper__label">{name}</span></li>;
      })}
    </ol>
  );
}

function Analysis({ onBack, onOpenHistory }: { onBack: () => void; onOpenHistory: () => void }) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(1);
  const [eye, setEye] = useState<"OS" | "OD">("OS");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageCheck, setImageCheck] = useState<ImageCheck | null>(null);
  const [videoFrames, setVideoFrames] = useState<{ frames: VideoFrame[]; duration: number } | null>(null);
  const [extracting, setExtracting] = useState<number | null>(null);
  // times (s) of the video frames the user picked for the AI; each frame takes ~40 s on the server
  const [pickedFrames, setPickedFrames] = useState<number[]>([]);
  const togglePicked = (time: number) => setPickedFrames((prev) => prev.includes(time) ? (prev.length > 1 ? prev.filter((x) => x !== time) : prev) : [...prev, time]);
  const [frameProgress, setFrameProgress] = useState<{ i: number; n: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [scanError, setScanError] = useState("");
  const [savedScan, setSavedScan] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: "", age: "", id: "", notes: "" });
  const fileInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const beginScan = async (file: File | null = uploadedFile, check: ImageCheck | null = imageCheck) => {
    if (!file || scanning) return;
    setScanning(true);
    setScanError("");
    setSlowHint(false);
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const slowTimer = window.setTimeout(() => setSlowHint(true), 8000);
    const frames = (videoFrames?.frames ?? []).filter((f) => pickedFrames.includes(f.time));
    const timeoutTimer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 120_000 + Math.max(0, frames.length - 1) * 45_000);
    const started = performance.now();
    const predict = async (upload: File) => {
      const payload = new FormData();
      payload.append("file", upload);
      const response = await fetch(withLanguage(readInferenceEndpoint(), language), { method: "POST", body: payload, signal: controller.signal });
      if (!response.ok) throw new Error(`${t("serverError")} (HTTP ${response.status}).`);
      return (await response.json()) as ModelResult & InferenceResult;
    };
    try {
      let data: ModelResult & InferenceResult;
      let videoSummary: Patient["video"];
      let shownPreview = check?.preview;
      if (frames.length) {
        // Video: every chosen frame goes to the AI (one at a time — the server is small), then the frame whose
        // answer is closest to the median of all frames becomes the report, so one blurry frame cannot decide.
        const results: Array<{ data: ModelResult & InferenceResult; frame: VideoFrame }> = [];
        let lastError: unknown = null;
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          setFrameProgress({ i: i + 1, n: frames.length });
          try { results.push({ data: await predict(frame.file), frame }); } catch (error) { if (controller.signal.aborted) throw error; lastError = error; }
        }
        const usable = results.filter((r) => (r.data as { screening?: InferenceResult["screening"] }).screening?.dr);
        if (!usable.length) throw lastError ?? new Error(t("invalidResponse"));
        const answers: FrameAnswer[] = usable.map(({ data: d }) => {
          const sc = (d as { screening?: InferenceResult["screening"] }).screening!;
          return {
            probabilities: { dr: sc.dr?.probability ?? 0, glaucoma: sc.glaucoma?.probability ?? 0, cataract: sc.cataract?.probability ?? 0 },
            statuses: { dr: sc.dr?.status ?? "", glaucoma: sc.glaucoma?.status ?? "", cataract: sc.cataract?.status ?? "" },
          };
        });
        const pick = representativeFrame(answers);
        data = usable[pick.index].data;
        shownPreview = usable[pick.index].frame.preview;
        videoSummary = { frames: usable.length, agreement: pick.agreement };
      } else {
        data = await predict(file);
      }
      const base: InferenceResult | undefined = data?.result ?? (data?.dr_grade || data?.glaucoma || data?.cataract ? data : undefined);
      const screening = (data as { screening?: InferenceResult["screening"] })?.screening;
      const inference: InferenceResult | undefined = base && screening ? { ...base, screening: { dr: screening.dr, glaucoma: screening.glaucoma, cataract: screening.cataract } } : base;
      if (!inference) throw new Error(t("invalidResponse"));
      const latencyMs = Math.round(performance.now() - started);
      const highRisk = isHighRisk(inference);
      const probabilities = inference.dr_grade?.probabilities ?? [];
      const rawConfidence = inference.dr_grade?.confidence ?? (probabilities.length ? Math.max(...probabilities) : undefined);
      const now = new Date();
      const name = form.name.trim() || "Unnamed patient";
      const scan: Patient = {
        recordId: `local-${uid()}`,
        name,
        id: form.id.trim() || `VE-${now.getTime().toString().slice(-5)}`,
        date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scannedAt: now.toISOString(),
        risk: highRisk ? "High risk" : "Normal",
        score: typeof rawConfidence === "number" ? `${Math.min(100, Math.max(0, Math.round(rawConfidence * 100)))}%` : "—",
        eye,
        initials: profileInitials(name),
        thumb: highRisk ? "fundus-amber" : "fundus-coral",
        source: "live",
        age: form.age.trim(),
        notes: form.notes.trim(),
        image: shownPreview,
        result: inference,
        explanation: data?.explanation,
        recommendations: data?.recommendations,
        latencyMs,
        video: videoSummary,
      };
      if (!saveScan(scan)) toast.warning(t("storageFull"));
      setSavedScan(scan);
      setStep(4);
    } catch (error) {
      if (controller.signal.aborted && !timedOut) return;
      const message = timedOut ? t("timeout") : error instanceof TypeError ? t("networkError") : error instanceof Error ? error.message : t("networkError");
      setScanError(`${message} ${t("checkEndpoint")}`);
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      if (abortRef.current === controller) abortRef.current = null;
      setScanning(false);
      setSlowHint(false);
      setFrameProgress(null);
    }
  };

  const handleFile = async (file?: File) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (isVideoFile(file)) {
      if (file.size > MAX_VIDEO_BYTES) { setScanError(t("videoTooLarge")); return; }
      setScanError("");
      setExtracting(0);
      try {
        const result = await extractBestFrames(file, { onProgress: (share) => setExtracting(Math.round(share * 100)) });
        const best = result.frames[0];
        const check = await inspectImage(best.file);
        setFileName(file.name);
        setFileUrl(URL.createObjectURL(best.file));
        setUploadedFile(best.file);
        setImageCheck(check);
        setVideoFrames({ frames: result.frames, duration: result.duration });
        setPickedFrames(result.frames.slice(0, 3).map((f) => f.time)); // the 3 sharpest by default
        setStep(3);
      } catch (error) {
        setScanError(t(error instanceof Error && error.message === "noRetina" ? "videoNoRetina" : "videoUnreadable"));
      } finally {
        setExtracting(null);
      }
      return;
    }
    setVideoFrames(null);
    const invalid = validateImageFile(file);
    if (invalid) { setScanError(t(invalid === "tooLarge" ? "fileTooLarge" : "fileNotImage")); return; }
    let check: ImageCheck;
    try { check = await inspectImage(file); } catch { setScanError(t("fileUnreadable")); return; }
    setScanError("");
    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setUploadedFile(file);
    setImageCheck(check);
    setStep(3);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragActive(false); void handleFile(event.dataTransfer.files?.[0]); };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => void handleFile(event.target.files?.[0]);
  const cancelScan = () => abortRef.current?.abort();
  const restart = () => { abortRef.current?.abort(); setStep(1); setFileName(""); setFileUrl(""); setUploadedFile(null); setImageCheck(null); setVideoFrames(null); setPickedFrames([]); setSavedScan(null); setScanError(""); setForm({ name: "", age: "", id: "", notes: "" }); };
  const qualityOk = !imageCheck?.issues.length;
  const openPicker = () => fileInput.current?.click();

  return (
    <div className={`page page--flow${step === 4 ? " page--results" : ""}`}>
      <header className="flow-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("back")}><ArrowLeft size={20} /></button>
        <h1>{t("newScreening")}</h1>
      </header>
      <Stepper step={step} />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/*,video/mp4,video/quicktime,video/webm,video/*" onChange={onInput} hidden />

      {step === 1 && <section className="flow-card">
        <h2>{t("essentialsTitle")}</h2>
        <p className="lead">{t("newPatientHint")}</p>
        <form className="form" onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
          <label className="field"><span className="field__label">{t("patientName")}</span><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aigerim Sadykova" autoComplete="off" /></label>
          <div className="form__row">
            <label className="field field--age"><span className="field__label">{t("age")}</span><input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })} placeholder={t("years")} /></label>
            <label className="field"><span className="field__label">{t("patientId")}</span><input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="VE-00000" autoComplete="off" /></label>
          </div>
          <label className="field"><span className="field__label">{t("symptoms")} <span className="field__opt">{t("optionalShort")}</span></span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notePlaceholder")} rows={3} /></label>
          <div className="flow-actions"><button className="btn btn--primary btn--block" type="submit">{t("continueCapture")}<ChevronRight size={18} /></button></div>
        </form>
      </section>}

      {step === 2 && <section className="flow-card">
        <h2>{t("captureTitle")}</h2>
        <p className="lead">{t("captureHelp")}</p>
        <div className="field"><span className="field__label" id="eye-label">{t("eyeQuestion")}</span>
          <div className="seg seg--eye" role="radiogroup" aria-labelledby="eye-label">
            <button type="button" role="radio" aria-checked={eye === "OS"} className={eye === "OS" ? "is-active" : ""} onClick={() => setEye("OS")}>{t("leftEye")} <b>OS</b></button>
            <button type="button" role="radio" aria-checked={eye === "OD"} className={eye === "OD" ? "is-active" : ""} onClick={() => setEye("OD")}>{t("rightEye")} <b>OD</b></button>
          </div>
        </div>
        <div role="button" tabIndex={0} aria-label={t("uploadImage")} className={`dropzone${dragActive ? " is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={openPicker} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); } }}>
          <span className="dropzone__aperture"><ImageUp size={28} /></span>
          <strong>{extracting !== null ? <><Loader2 size={16} className="spin" /> {t("videoExtracting").replace("{value}", String(extracting))}</> : fileName || t("chooseFile")}</strong>
          <span>{fileName ? t("imageReady") : t("dropHere")}</span>
        </div>
        {scanError ? <p className="note note--error" role="alert"><AlertCircle size={18} />{scanError}</p> : <p className="note"><Info size={18} />{t("imageHint")}</p>}
        <div className="flow-actions">
          <button className="btn btn--primary btn--block" onClick={() => fileName ? setStep(3) : openPicker()}>{fileName ? t("reviewImage") : t("uploadImage")}<Upload size={18} /></button>
          <button className="btn btn--ghost btn--block" onClick={() => setStep(1)}>{t("backPatient")}</button>
        </div>
      </section>}

      {step === 3 && <section className="flow-card">
        <h2>{t("reviewTitle")}</h2>
        <p className="lead">{t("reviewHelp")}</p>
        <figure className={`preview${scanning ? " is-scanning" : ""}`}>
          {fileUrl ? <img src={fileUrl} alt={t("uploadedPreview")} /> : <FundusArt />}
          <figcaption><span className="chip chip--dark">{eye} · {eye === "OS" ? t("leftEye") : t("rightEye")}</span><span className={`chip ${qualityOk ? "chip--ok" : "chip--warn"}`}>{qualityOk ? <Check size={13} /> : <AlertCircle size={13} />}{qualityOk ? t("qualityGood") : t("qualityCheck")}</span></figcaption>
        </figure>
        {videoFrames && <p className="frames-pick-label">{t("framesPick").replace("{n}", String(pickedFrames.length)).replace("{sec}", String(pickedFrames.length * 40))}</p>}
        {videoFrames && <div className="frames-strip" aria-label={t("videoBadge").replace("{n}", String(pickedFrames.length))}>
          {videoFrames.frames.map((frame) => {
            const on = pickedFrames.includes(frame.time);
            return <button type="button" key={frame.time} className={`frame-pick${on ? " is-on" : ""}`} aria-pressed={on} disabled={scanning} onClick={() => togglePicked(frame.time)}>
              <img src={frame.preview} alt="" /><span className="frame-pick__check">{on && <Check size={13} />}</span><span className="frame-pick__time">{frame.time.toFixed(1)} s</span>
            </button>;
          })}
        </div>}
        {videoFrames && <p className="note"><Info size={18} />{t("framesPickHint")}</p>}
        {!qualityOk && <p className="note note--warn"><AlertCircle size={18} />{imageCheck?.issues.map((issue) => t(`issue_${issue}`)).join(" ")}</p>}
        <div className="file-line"><FileText size={17} /><span className="file-line__name">{fileName}</span>{imageCheck && <span className="file-line__dim">{imageCheck.width}×{imageCheck.height}</span>}<button className="link-btn" onClick={() => { cancelScan(); openPicker(); }} disabled={scanning}><RotateCcw size={15} />{t("replace")}</button></div>
        <p className={`note${slowHint ? " note--warn" : ""}`}>{scanning ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />}{frameProgress ? t("videoFrameProgress").replace("{i}", String(frameProgress.i)).replace("{n}", String(frameProgress.n)) + (slowHint && frameProgress.i === 1 ? ` ${t("coldStart")}` : "") : slowHint ? t("coldStart") : t("modelInference")}</p>
        {scanError && <p className="note note--error" role="alert"><AlertCircle size={18} />{scanError}</p>}
        <div className="flow-actions">
          <button className="btn btn--primary btn--block" onClick={() => void beginScan()} disabled={scanning}>{scanning ? <Loader2 size={18} className="spin" /> : <ScanEye size={18} />}{scanning ? t("analyzing") : t("runScreening")}</button>
          {scanning ? <button className="btn btn--ghost btn--block" onClick={cancelScan}>{t("cancel")}</button> : <button className="btn btn--ghost btn--block" onClick={() => setStep(2)}>{t("backCapture")}</button>}
        </div>
      </section>}

      {step === 4 && savedScan && <Results scan={savedScan} onRestart={restart} onOpenHistory={onOpenHistory} />}
    </div>
  );
}

function MetricsCard({ result, live }: { result: InferenceResult | null | undefined; live: boolean }) {
  const { t } = useI18n();
  const analysis = interpret(result, t);
  return (
    <section className="panel metrics">
      <div className="panel__head"><h3>{t("modelResults")}</h3><span className={`tag ${live ? "tag--live" : "tag--demo"}`}>{live ? t("modelTag") : t("demo")}</span></div>
      <ul className="metrics__list">
        {analysis.metrics.map((metric) => (
          <li key={metric.key} className={metric.status === "positive" ? "is-positive" : metric.status === "uncertain" ? "is-uncertain" : ""}>
            <div className="metrics__top"><span className={`cond-dot cond-dot--${metric.key}`} /><span className="metrics__name">{metric.label}</span><span className={`metrics__flag ${metric.status === "positive" ? "metrics__flag--pos" : metric.status === "uncertain" ? "metrics__flag--unc" : ""}`}>{metric.status === "positive" ? t("positiveShort") : metric.status === "uncertain" ? t("uncertainShort") : t("negativeShort")}</span><strong className="metrics__value">{metric.value}%</strong></div>
            <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.value} aria-label={metric.label}><span className={`fill fill--${metric.key}`} style={{ width: `${metric.value}%` }} /></div>
            {metric.key === "dr" && result?.dr_grade && <div className="grades">{analysis.drProbabilities.slice(0, 5).map((p, i) => <span key={i} className={i === result.dr_grade?.class ? "is-max" : ""}><small>{t("grade")} {i}</small>{Math.round(p * 100)}%</span>)}</div>}
          </li>
        ))}
      </ul>
      {live && <details className="raw"><summary>{t("rawResponse")}</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>}
    </section>
  );
}

function Results({ scan, onRestart, onOpenHistory }: { scan: Patient; onRestart: () => void; onOpenHistory: () => void }) {
  const { language, t } = useI18n();
  const analysis = interpret(scan.result, t);
  const { exporting, exportReport } = useReportExport();
  return (
    <section className="results-section">
      <div className={`verdict verdict--${analysis.highRisk ? "risk" : "ok"}`} role="status">
        <span className="verdict__icon">{analysis.highRisk ? <TriangleAlert size={24} /> : <CircleCheck size={24} />}</span>
        <div><p className="verdict__kicker">{t("resultFor")}, {scan.eye === "OS" ? t("leftEye").toLowerCase() : t("rightEye").toLowerCase()}</p><h2>{analysis.statusTitle}</h2><p>{scan.recommendations ? `${scan.recommendations.headline} — ${scan.recommendations.timeframe}.` : analysis.statusDetail}</p></div>
      </div>
      <div className="results-grid">
        <div className="results-main">
          <div className="panel patient-card">
            <FundusThumb variant={scan.thumb} image={scan.image} />
            <div><strong>{scan.name}</strong><span className="patient-card__meta"><span>{scan.id}</span>{scan.age && <span>{t("ageYears").replace("{value}", scan.age)}</span>}<span>{scanWhen(scan, language, t)}</span>{scan.latencyMs && <span>{t("analysisTimeLabel").replace("{value}", (scan.latencyMs / 1000).toFixed(1))}</span>}</span></div>
          </div>
          <MetricsCard result={scan.result} live />
          {scan.video && <div className="panel video-note"><strong>{t("videoResultTitle")}</strong><p>{t("videoResultNote").replaceAll("{n}", String(scan.video.frames)).replace("{dr}", String(scan.video.agreement.dr ?? "—")).replace("{gl}", String(scan.video.agreement.glaucoma ?? "—")).replace("{cat}", String(scan.video.agreement.cataract ?? "—"))}</p></div>}
          {scan.explanation && <ExplanationCard explanation={scan.explanation} image={scan.image} t={t} />}
        </div>
        <aside className="results-side">
          {scan.recommendations
            ? <RecommendationCard rec={scan.recommendations} t={t} />
            : <div className={`panel rec rec--${analysis.highRisk ? "risk" : "ok"}`}><h3>{t("recTitle")}</h3><strong>{analysis.recommendationTitle}</strong><p>{analysis.recommendationDetail}</p></div>}
          <div className="stack">
            <button className="btn btn--primary btn--block" onClick={() => void exportReport(scan)} disabled={exporting}>{exporting ? <Loader2 size={18} className="spin" /> : <Download size={18} />}{exporting ? t("exporting") : t("exportReport")}</button>
            <button className="btn btn--secondary btn--block" onClick={onOpenHistory}><History size={18} />{t("openHistory")}</button>
            <button className="btn btn--ghost btn--block" onClick={onRestart}><Plus size={18} />{t("another")}</button>
          </div>
          <p className="fine-print"><ShieldCheck size={15} />{t("helpDisclaimer")}</p>
        </aside>
      </div>
    </section>
  );
}

function HistoryScreen({ history, onSelect }: { history: Patient[]; onSelect: (patient: Patient) => void }) {
  const { language, t } = useI18n();
  const [filter, setFilter] = useState<RiskFilter>("All");
  const [query, setQuery] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => history.filter((patient) => (filter === "All" || patient.risk === filter) && `${patient.name} ${patient.id}`.toLowerCase().includes(query.trim().toLowerCase())), [filter, history, query]);
  const filterLabel = (item: RiskFilter) => item === "All" ? t("allFilter") : item === "High risk" ? t("highRiskFilter") : t("normalFilter");
  const normalCount = history.filter((patient) => patient.risk === "Normal").length;
  const highRiskCount = history.filter((patient) => patient.risk === "High risk").length;
  const selectedScans = filtered.filter((patient) => patient.source === "live" && selectedIds.includes(scanKey(patient)));
  const toggleSelected = (patient: Patient) => { if (patient.source !== "live") { toast.info(t("demoLocked")); return; } const key = scanKey(patient); setSelectedIds((ids) => ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key]); };
  const removeSelected = async () => {
    if (!selectedScans.length || !window.confirm(t("deleteConfirm").replace("{count}", String(selectedScans.length)))) return;
    setBusy(true);
    let failed = 0;
    for (const scan of selectedScans) if (!(await deleteScan(scan))) failed += 1;
    setSelectedIds([]);
    setBusy(false);
    if (failed) toast.error(t("deleteFailed")); else toast.success(t("deleted"));
  };
  const exportCsv = () => { exportScansCsv(filtered, language, t); toast.success(t("csvExported")); };
  const counts: Record<RiskFilter, number> = { All: history.length, "High risk": highRiskCount, Normal: normalCount };
  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div><h1>{t("history")}</h1><p className="page-head__sub">{t("historyStored")}</p></div>
        <div className="page-actions">
          <button className="btn btn--secondary btn--sm" onClick={exportCsv} disabled={!filtered.length}><FileDown size={17} />{t("exportCsv")}</button>
          <button className={`btn btn--sm ${manageMode ? "btn--primary" : "btn--secondary"}`} onClick={() => { setManageMode(!manageMode); setSelectedIds([]); }} aria-pressed={manageMode}>{manageMode ? <Check size={17} /> : <ListChecks size={17} />}{manageMode ? t("doneShort") : t("manageShort")}</button>
        </div>
      </header>
      <section className="kpis kpis--compact" aria-label={t("total")}>
        <div className="kpi"><span className="kpi__label">{t("total")}</span><strong className="kpi__value">{history.length}</strong></div>
        <div className="kpi"><span className="kpi__label">{t("normal")}</span><strong className="kpi__value">{history.length ? Math.round((normalCount / history.length) * 100) : 0}<small>%</small></strong></div>
        <div className="kpi kpi--risk"><span className="kpi__label">{t("followups")}</span><strong className="kpi__value">{highRiskCount}</strong></div>
      </section>
      <div className="toolbar">
        <label className="search"><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} />{query && <button onClick={() => setQuery("")} aria-label={t("close")}><X size={16} /></button>}</label>
        <div className="seg" role="radiogroup" aria-label={t("allFilter")}>{(["All", "High risk", "Normal"] as RiskFilter[]).map((item) => <button key={item} role="radio" aria-checked={filter === item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{filterLabel(item)}<span className="seg__count">{counts[item]}</span></button>)}</div>
      </div>
      {manageMode && <div className="manage-bar"><span>{t("selectedCount").replace("{n}", String(selectedScans.length))}</span><span className="manage-bar__hint">{t("demoLocked")}</span><button className="btn btn--danger btn--sm" disabled={!selectedScans.length || busy} onClick={() => void removeSelected()}><Trash2 size={16} />{busy ? t("deleting") : t("delete")}</button></div>}
      <section className="panel panel--flush">
        {filtered.length ? <div className="list">{filtered.map((patient) => <PatientRow key={`${patient.source}-${scanKey(patient)}`} patient={patient} selectable={manageMode} selected={selectedIds.includes(scanKey(patient))} onClick={() => manageMode ? toggleSelected(patient) : onSelect(patient)} />)}</div> : <div className="empty"><Search size={22} /><strong>{history.length ? t("noFound") : t("resultsEmpty")}</strong><span>{history.length ? t("tryAgain") : t("resultsEmptyHint")}</span></div>}
      </section>
    </div>
  );
}

function SettingRow({ icon, title, detail, children, tone = "green" }: { icon: ReactNode; title: string; detail?: ReactNode; children?: ReactNode; tone?: string }) {
  return <div className="setting"><span className={`setting__icon setting__icon--${tone}`}>{icon}</span><div className="setting__text"><strong>{title}</strong>{detail && <span>{detail}</span>}</div>{children && <div className="setting__control">{children}</div>}</div>;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch${checked ? " is-on" : ""}`} onClick={onChange}><span /></button>;
}

function SettingsScreen({ onTab, onHelp, showDemo, onShowDemo, onLogout }: { onTab: (tab: TabKey) => void; onHelp: () => void; showDemo: boolean; onShowDemo: (value: boolean) => void; onLogout: () => void }) {
  const { language, t } = useI18n();
  const profile = activeProfile();
  const [endpoint, setEndpoint] = useState(() => readInferenceEndpoint());
  const [saved, setSaved] = useState(true);
  const [connection, setConnection] = useState<"unknown" | "testing" | "online" | "offline">("unknown");
  const commitEndpoint = () => { const next = saveInferenceEndpoint(endpoint); setEndpoint(next); if (!saved) { setSaved(true); setConnection("unknown"); toast.success(t("save")); } };
  const testConnection = async () => {
    commitEndpoint();
    setConnection("testing");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 75_000);
    try {
      const url = new URL(readInferenceEndpoint());
      await fetch(`${url.origin}/`, { method: "GET", mode: "no-cors", cache: "no-store", signal: controller.signal });
      setConnection("online");
      toast.success(t("reachable"));
    } catch {
      setConnection("offline");
      toast.error(t("unreachable"));
    } finally {
      window.clearTimeout(timer);
    }
  };
  const clearHistory = () => { if (!window.confirm(t("clearHistoryConfirm"))) return; writeScans([]); notifyHistory(); toast.success(t("historyCleared")); };
  const statusLabel = connection === "online" ? t("statusOnline") : connection === "offline" ? t("statusOffline") : connection === "testing" ? t("testing") : t("statusUnknown");
  return (
    <div className="page page--narrow">
      <header className="page-head page-head--row"><div><h1>{t("settingsTitle")}</h1></div><button className="btn btn--secondary btn--sm" onClick={onHelp}><CircleHelp size={17} />{t("help")}</button></header>

      <section className="group">
        <div className="group__head"><h2>{t("secAi")}</h2><span className={`status status--${connection}`}><span />{statusLabel}</span></div>
        <div className="group__body">
          <label className="field field--inset"><span className="field__label">{t("endpoint")}</span><span className="input-icon"><Wifi size={17} aria-hidden="true" /><input value={endpoint} inputMode="url" spellCheck={false} onChange={(e) => { setEndpoint(e.target.value); setSaved(false); }} onBlur={commitEndpoint} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></span><span className="field__help">{t("endpointHelp")}</span></label>
          <SettingRow icon={<PlugZap size={18} />} title={t("testConnection")} detail={t("connectionHelp")}><button className="btn btn--secondary btn--sm" onClick={() => void testConnection()} disabled={connection === "testing"}>{connection === "testing" ? <Loader2 size={16} className="spin" /> : null}{t("check")}</button></SettingRow>
        </div>
      </section>

      <section className="group">
        <div className="group__head"><h2>{t("secClinic")}</h2></div>
        <div className="group__body">
          <button className="setting setting--link" onClick={() => onTab("profile")}><span className="avatar avatar--md">{profileInitials(profile?.name || "VE")}</span><span className="setting__text"><strong>{profile?.hospital || "—"}</strong><span>{[profile?.name, profile?.email].filter(Boolean).join(", ")}</span></span><span className="setting__control"><span className="link-btn">{t("edit")}<ChevronRight size={16} /></span></span></button>
        </div>
      </section>

      <section className="group">
        <div className="group__head"><h2>{t("secData")}</h2></div>
        <div className="group__body">
          <SettingRow icon={<UsersRound size={18} />} tone="violet" title={t("showDemo")} detail={t("showDemoHelp")}><Switch checked={showDemo} onChange={() => onShowDemo(!showDemo)} label={t("showDemo")} /></SettingRow>
          <SettingRow icon={<Trash2 size={18} />} tone="red" title={t("clearHistory")} detail={t("clearHistoryHelp")}><button className="btn btn--danger btn--sm" onClick={clearHistory}>{t("clearBtn")}</button></SettingRow>
        </div>
      </section>

      <footer className="page-foot"><span><ShieldCheck size={16} />{t("historyStored")}</span><button className="btn btn--ghost btn--sm" onClick={onLogout}><LogOut size={16} />{t("logout")}</button></footer>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", listener); document.body.style.overflow = overflow; };
  }, [onClose]);
}

function Sheet({ label, onClose, children, className = "" }: { label: string; onClose: () => void; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  useEscape(onClose);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, []);
  // Keep keyboard focus inside the dialog while it is open.
  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !ref.current) return;
    const focusable = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside ref={ref} className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()} onKeyDown={trapFocus}>
        <div className="sheet__bar"><span className="sheet__grip" aria-hidden="true" /><button className="icon-btn" onClick={onClose} aria-label={t("close")} autoFocus><X size={20} /></button></div>
        <div className="sheet__body">{children}</div>
      </aside>
    </div>
  );
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { language, t } = useI18n();
  const { exporting, exportReport } = useReportExport();
  const [deleting, setDeleting] = useState(false);
  const analysis = interpret(patient.result, t);
  const remove = async () => {
    if (!window.confirm(t("deleteOneConfirm"))) return;
    setDeleting(true);
    const ok = await deleteScan(patient);
    setDeleting(false);
    if (ok) { toast.success(t("deleted")); onClose(); } else toast.error(t("deleteFailed"));
  };
  const high = patient.risk === "High risk";
  return (
    <Sheet label={t("screeningDetail")} onClose={onClose} className="sheet--patient">
      <div className="sheet-patient">
        <FundusThumb variant={patient.thumb} image={patient.image} />
        <div><h2>{patient.name}{patient.source === "demo" && <span className="tag tag--demo">{t("demo")}</span>}</h2><p className="sheet-patient__meta"><span>{patient.id}</span><span>{scanWhen(patient, language, t)}</span>{patient.age && <span>{t("ageYears").replace("{value}", patient.age)}</span>}</p></div>
      </div>
      {patient.image && <img className="sheet-image" src={patient.image} alt={t("uploadedPreview")} />}
      <div className={`verdict verdict--compact verdict--${high ? "risk" : "ok"}`}>
        <span className="verdict__icon">{high ? <TriangleAlert size={20} /> : <CircleCheck size={20} />}</span>
        <div><h3>{analysis.hasResult ? analysis.statusTitle : high ? t("highRiskFilter") : t("normalFilter")}</h3>{analysis.hasResult && <p>{patient.recommendations ? `${patient.recommendations.headline} — ${patient.recommendations.timeframe}.` : analysis.statusDetail}</p>}</div>
      </div>
      <dl className="facts">
        <div><dt>{t("eye")}</dt><dd>{patient.eye}, {patient.eye === "OS" ? t("left").toLowerCase() : t("right").toLowerCase()}</dd></div>
        <div><dt>{t("confidence")}</dt><dd>{patient.score}</dd></div>
        <div><dt>{t("latency")}</dt><dd>{patient.latencyMs ? `${(patient.latencyMs / 1000).toFixed(1)} s` : "—"}</dd></div>
      </dl>
      {analysis.hasResult ? <MetricsCard result={patient.result} live={patient.source === "live"} /> : <p className="note">{t("noDetailStored")}</p>}
      {patient.explanation && <ExplanationCard explanation={patient.explanation} image={patient.image} t={t} />}
      {patient.notes && <section className="sheet-section"><h3>{t("notesLabel")}</h3><p className="prose">{patient.notes}</p></section>}
      {patient.recommendations
        ? <RecommendationCard rec={patient.recommendations} t={t} />
        : <section className={`panel rec rec--${high ? "risk" : "ok"}`}><h3>{t("recTitle")}</h3><strong>{high ? t("followup") : t("routine")}</strong><p>{high ? t("reviewContext") : t("routineDetail")}</p></section>}
      <div className="sheet-actions">
        <button className="btn btn--primary btn--block" onClick={() => void exportReport(patient)} disabled={exporting}>{exporting ? <Loader2 size={18} className="spin" /> : <Download size={18} />}{exporting ? t("exporting") : t("exportReport")}</button>
        {patient.source === "live" && <button className="btn btn--ghost-danger btn--block" onClick={() => void remove()} disabled={deleting}><Trash2 size={17} />{t("deleteOne")}</button>}
      </div>
    </Sheet>
  );
}

function HelpSheet({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet label={t("helpTitle")} onClose={onClose} className="sheet--help">
      <h2 className="sheet-title">{t("helpTitle")}</h2>
      <ol className="steps">{[1, 2, 3, 4].map((n) => <li key={n}><span className="steps__n">{n}</span><p>{t(`helpStep${n}`)}</p></li>)}</ol>
      <section className="sheet-section"><h3>{t("helpSignalsTitle")}</h3><p className="prose">{t("helpSignals")}</p>
        <ul className="legend"><li><span className="cond-dot cond-dot--dr" />{t("retinopathy")}</li><li><span className="cond-dot cond-dot--glaucoma" />{t("glaucoma")}</li><li><span className="cond-dot cond-dot--cataract" />{t("cataract")}</li></ul>
      </section>
      <div className="note note--warn note--block"><ShieldCheck size={18} /><div><strong>{t("helpDisclaimerTitle")}</strong><p>{t("helpDisclaimer")}</p></div></div>
      <div className="sheet-actions"><button className="btn btn--primary btn--block" onClick={() => { onClose(); onStart(); }}><ScanEye size={18} />{t("start")}</button></div>
    </Sheet>
  );
}

function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { language } = useI18n(); const current = activeProfile();
  const ru = language === "ru"; const kk = language === "kk";
  const text = { title: ru ? "Профиль" : kk ? "Профиль" : "Profile", name: ru ? "Имя врача" : kk ? "Дәрігер аты" : "Doctor name", hospital: ru ? "Больница или клиника" : kk ? "Аурухана немесе клиника" : "Hospital or clinic", email: "Email", save: ru ? "Сохранить изменения" : kk ? "Өзгерістерді сақтау" : "Save changes", logout: ru ? "Выйти из аккаунта" : kk ? "Аккаунттан шығу" : "Log out", saved: ru ? "Профиль сохранён" : kk ? "Профиль сақталды" : "Profile saved", hint: ru ? "Имя врача и клиника печатаются в PDF-отчётах." : kk ? "Дәрігер аты мен клиника PDF есептерде басылады." : "Your name and clinic are printed on PDF reports." };
  const [name, setName] = useState(current?.name || ""); const [hospital, setHospital] = useState(current?.hospital || "");
  const save = (event: React.FormEvent) => { event.preventDefault(); if (!current) return; const next = readProfiles().map((profile) => profile.id === current.id ? { ...profile, name: name.trim() || profile.name, hospital: hospital.trim() || profile.hospital } : profile); localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(next)); notifyHistory(); toast.success(text.saved); };
  return (
    <div className="page page--narrow">
      <header className="page-head"><h1>{text.title}</h1></header>
      <section className="panel profile">
        <div className="profile__id"><span className="avatar avatar--lg">{profileInitials(name || "Dr")}</span><div><strong>{name || "—"}</strong><span>{hospital}</span><span>{current?.email}</span></div></div>
        <form className="form" onSubmit={save}>
          <label className="field"><span className="field__label">{text.name}</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label className="field"><span className="field__label">{text.hospital}</span><input value={hospital} onChange={(event) => setHospital(event.target.value)} autoComplete="organization" /></label>
          <label className="field"><span className="field__label">{text.email}</span><input value={current?.email || ""} disabled /></label>
          <p className="field__help">{text.hint}</p>
          <div className="form__actions"><button className="btn btn--primary" type="submit">{text.save}</button><button className="btn btn--ghost" type="button" onClick={onLogout}><LogOut size={17} />{text.logout}</button></div>
        </form>
      </section>
    </div>
  );
}

async function hashPassword(password: string) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`veya:${password}`));
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return password;
  }
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (profile: Profile) => void }) {
  const { language, t } = useI18n();
  const ru = language === "ru"; const kk = language === "kk";
  const text = { title: ru ? "Вход в VEYA" : kk ? "VEYA жүйесіне кіру" : "Sign in to VEYA", subtitle: ru ? "Ваши скрининги будут сохранены в личном профиле." : kk ? "Скринингтеріңіз жеке профиліңізде сақталады." : "Your screenings are saved in your private profile.", login: ru ? "У меня уже есть профиль" : kk ? "Менде профиль бар" : "I already have a profile", register: ru ? "Создать профиль" : kk ? "Профиль жасау" : "Create profile", registerTitle: ru ? "Новый профиль врача" : kk ? "Жаңа дәрігер профилі" : "New clinician profile", name: ru ? "Имя врача" : kk ? "Дәрігер аты" : "Doctor name", hospital: ru ? "Клиника или больница" : kk ? "Клиника немесе аурухана" : "Clinic or hospital", email: "Email", password: ru ? "Пароль" : kk ? "Құпиясөз" : "Password", submit: ru ? "Войти" : kk ? "Кіру" : "Sign in", create: ru ? "Создать профиль" : kk ? "Профиль жасау" : "Create profile", short: ru ? "Пароль должен быть не короче 6 символов." : kk ? "Құпиясөз кемінде 6 таңбадан тұруы керек." : "Password must be at least 6 characters.", noAccount: ru ? "Нет профиля?" : kk ? "Профиль жоқ па?" : "No profile yet?" };
  const [registerMode, setRegisterMode] = useState(false); const [form, setForm] = useState({ name: "", hospital: "", email: "", password: "" }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const users = readProfiles();
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password || (registerMode && (!form.name.trim() || !form.hospital.trim()))) { setError(ru ? "Заполните все обязательные поля." : kk ? "Барлық міндетті өрістерді толтырыңыз." : "Fill in all required fields."); return; }
    setBusy(true);
    const hashed = await hashPassword(form.password);
    setBusy(false);
    if (registerMode) {
      if (form.password.length < 6) { setError(text.short); return; }
      if (users.some((user) => user.email === email)) { setError(ru ? "Этот email уже зарегистрирован." : kk ? "Бұл email бұрын тіркелген." : "This email is already registered."); return; }
      const profile = { id: uid(), name: form.name.trim(), hospital: form.hospital.trim(), email, password: hashed };
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([...users, profile]));
      localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
      onAuthenticated(profile);
      return;
    }
    const profile = users.find((user) => user.email === email && (user.password === hashed || user.password === form.password));
    if (!profile) { setError(ru ? "Неверный email или пароль." : kk ? "Email немесе құпиясөз қате." : "Incorrect email or password."); return; }
    if (profile.password !== hashed) localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users.map((user) => user.id === profile.id ? { ...user, password: hashed } : user)));
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    onAuthenticated({ ...profile, password: hashed });
  };
  return (
    <div className="auth">
      <aside className="auth__brand" aria-hidden="true">
        <div className="auth__logo"><LogoMark /><span><Wordmark /></span></div>
        <div className="auth__scope"><FundusArt className="auth__fundus" /><span className="hero__aperture" /></div>
        <p>{t("authLead")}</p>
      </aside>
      <main className="auth__main">
        <div className="auth__top"><div className="auth__logo auth__logo--mobile"><LogoMark /><span><Wordmark /></span></div><LanguageSwitcher /></div>
        <div className="auth__card">
          <FundusArt className="auth__mini" />
          <h1>{registerMode ? text.registerTitle : text.title}</h1>
          <p className="lead">{text.subtitle}</p>
          <form className="form" onSubmit={(event) => void submit(event)}>
            {registerMode && <><label className="field"><span className="field__label">{text.name}</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label><label className="field"><span className="field__label">{text.hospital}</span><input value={form.hospital} onChange={(event) => setForm({ ...form, hospital: event.target.value })} autoComplete="organization" /></label></>}
            <label className="field"><span className="field__label">{text.email}</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
            <label className="field"><span className="field__label">{text.password}</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={registerMode ? "new-password" : "current-password"} /></label>
            {error && <p className="note note--error" role="alert"><AlertCircle size={18} />{error}</p>}
            <button className="btn btn--primary btn--block" type="submit" disabled={busy}>{registerMode ? text.create : text.submit}</button>
          </form>
          <p className="auth__switch">{!registerMode && <span>{text.noAccount}</span>}<button className="link-btn" onClick={() => { setRegisterMode(!registerMode); setError(""); }}>{registerMode ? text.login : text.register}</button></p>
          <p className="fine-print"><ShieldCheck size={15} />{t("demoAuthNote")}</p>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(() => activeProfile());
  const [language, setLanguage] = useState<Language>(() => { const saved = readSetting("veya_language"); return saved === "ru" || saved === "kk" || saved === "en" ? saved : "en"; });
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [drawerPatient, setDrawerPatient] = useState<Patient | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(() => readFlag(SHOW_DEMO_KEY, true));
  const [savedScans, setSavedScans] = useState<Patient[]>(() => readSavedScans());
  const [, setProfileVersion] = useState(0);
  const [demo] = useState(demoPatients);
  const t = (key: string) => key === "profile" ? (language === "en" ? "Profile" : "Профиль") : videoTranslations[language][key] || explainTranslations[language][key] || designTranslations[language][key] || uiTranslations[language][key] || clinicalTranslations[language][key] || resultTranslations[language][key] || workflowTranslations[language][key] || dashboardTranslations[language][key] || extraTranslations[language][key] || translations[language][key] || designTranslations.en[key] || uiTranslations.en[key] || clinicalTranslations.en[key] || resultTranslations.en[key] || workflowTranslations.en[key] || dashboardTranslations.en[key] || extraTranslations.en[key] || translations.en[key] || explainTranslations.en[key] || videoTranslations.en[key] || key;

  useEffect(() => { const refresh = () => { setSavedScans(readSavedScans()); setProfileVersion((v) => v + 1); }; refresh(); window.addEventListener("veya-history-updated", refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener("veya-history-updated", refresh); window.removeEventListener("storage", refresh); }; }, [profile?.id]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [activeTab]);

  const history = useMemo(() => [...savedScans, ...(showDemo ? demo : [])].sort((a, b) => (Date.parse(b.scannedAt || "") || 0) - (Date.parse(a.scannedAt || "") || 0)), [savedScans, showDemo, demo]);
  const changeLanguage = (next: Language) => { setLanguage(next); writeSetting("veya_language", next); };
  const changeShowDemo = (value: boolean) => { setShowDemo(value); writeSetting(SHOW_DEMO_KEY, value ? "1" : "0"); };
  const logout = () => { writeSetting(ACTIVE_PROFILE_KEY, null); setProfile(null); setActiveTab("dashboard"); };
  const closeDrawer = useCallback(() => setDrawerPatient(null), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const current = activeProfile() || profile;
  const initials = profileInitials(current?.name || "Dr");

  if (!profile) return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}><AuthScreen onAuthenticated={setProfile} /></LanguageContext.Provider>;
  const navButton = (item: (typeof navItems)[number]) => { const Icon = item.icon; const active = activeTab === item.key; return <button key={item.key} data-nav={item.key} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} onClick={() => setActiveTab(item.key)}><Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" /><span>{t(item.label)}</span></button>; };
  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      <div className="shell">
        <a className="skip" href="#main">{t("skip")}</a>
        <aside className="sidebar">
          <div className="brand"><LogoMark /><div><strong><Wordmark /></strong><span>{t("ophthalmic")}</span></div></div>
          <nav className="sidebar__nav" aria-label={t("mainNav")}>{navItems.filter((item) => item.key !== "profile").map(navButton)}</nav>
          <div className="sidebar__foot">
            <LanguageSwitcher />
            <button className={`user-chip${activeTab === "profile" ? " is-active" : ""}`} data-nav="profile" onClick={() => setActiveTab("profile")}><span className="avatar">{initials}</span><span className="user-chip__text"><strong>{current?.name}</strong><span>{current?.hospital}</span></span></button>
          </div>
        </aside>
        <header className="appbar">
          <div className="brand brand--compact"><LogoMark /><strong><Wordmark /></strong></div>
          <div className="appbar__end"><LanguageSwitcher /><button className="avatar" onClick={() => setActiveTab("profile")} aria-label={t("profile")}>{initials}</button></div>
        </header>
        <main className="main" id="main" tabIndex={-1}>
          {activeTab === "dashboard" && <Dashboard history={history} onStart={() => setActiveTab("analysis")} onTab={setActiveTab} onSelect={setDrawerPatient} onHelp={() => setHelpOpen(true)} />}
          {activeTab === "analysis" && <Analysis onBack={() => setActiveTab("dashboard")} onOpenHistory={() => setActiveTab("history")} />}
          {activeTab === "history" && <HistoryScreen history={history} onSelect={setDrawerPatient} />}
          {activeTab === "settings" && <SettingsScreen onTab={setActiveTab} onHelp={() => setHelpOpen(true)} showDemo={showDemo} onShowDemo={changeShowDemo} onLogout={logout} />}
          {activeTab === "profile" && <ProfileScreen key={profile.id} onLogout={logout} />}
        </main>
        <nav className="tabbar" aria-label={t("mainNav")}>{navItems.map(navButton)}</nav>
        {drawerPatient && <PatientDrawer patient={drawerPatient} onClose={closeDrawer} />}
        {helpOpen && <HelpSheet onClose={closeHelp} onStart={() => setActiveTab("analysis")} />}
      </div>
    </LanguageContext.Provider>
  );
}
