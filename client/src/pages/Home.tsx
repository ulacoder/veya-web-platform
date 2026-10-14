import { createContext, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Download,
  Eye,
  FileDown,
  FileText,
  Gauge,
  History,
  Info,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  PlugZap,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  SunMedium,
  Target,
  Trash2,
  UserRound,
  UsersRound,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { interpret, isHighRisk, type InferenceResult, type ModelResult } from "@/lib/clinical";
import { inspectImage, validateImageFile, type ImageCheck } from "@/lib/image";
import { downloadReport } from "@/lib/report";

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
  en: { readySignal: "Ready for|the signal.", noDr: "Eyes healthy, all clear", healthyRetina: "Eye healthy, retina normal (confidence {confidence}%)", drName: "Diabetic retinopathy", drProbability: "{value}% disease probability (Detected: Grade {grade})", grade: "Grade", glaucomaName: "Glaucoma", cataractName: "Cataract", probability: "{value}% probability", diseasePositive: "POSITIVE", diseaseNegative: "Negative", patientInference: "Real model inference completed.", fundusImage: "FUNDUS IMAGE", uploadedPreview: "Uploaded fundus preview", inferenceTitle: "VEYA AI inference", gradeMild: "Grade {grade}: changes detected; urgent ophthalmology examination recommended.", gradeModerate: "Grade {grade}: significant changes; urgent ophthalmology examination required.", gradeSevere: "Grade {grade}: severe changes; urgent referral required.", drDetected: "Diabetic retinopathy detected", glaucomaDetected: "Glaucoma detected", cataractDetected: "Cataract detected", glaucomaDetail: "Glaucoma probability: {value}%. Ophthalmology examination and intraocular pressure measurement are recommended.", cataractDetail: "Cataract probability: {value}%. Ophthalmology examination is recommended.", multipleDetected: "Multiple conditions detected", detectedConditions: "Detected", comprehensiveExam: "Comprehensive ophthalmology examination is urgently recommended." },
  ru: { readySignal: "Готовы к|анализу.", noDr: "Глаза здоровы, всё в порядке", healthyRetina: "Глаз здоров, сетчатка в норме (уверенность {confidence}%)", drName: "Диабетическая ретинопатия", drProbability: "Вероятность заболевания {value}% (степень: {grade})", grade: "Степень", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Вероятность {value}%", diseasePositive: "ПОЛОЖИТЕЛЬНО", diseaseNegative: "Отрицательно", patientInference: "Работа реальной модели завершена.", fundusImage: "СНИМОК ГЛАЗНОГО ДНА", uploadedPreview: "Предпросмотр снимка", inferenceTitle: "AI-анализ VEYA", gradeMild: "Степень {grade}: выявлены изменения, требуется срочный осмотр офтальмолога.", gradeModerate: "Степень {grade}: выявлены выраженные изменения, требуется срочный осмотр офтальмолога.", gradeSevere: "Степень {grade}: тяжёлые изменения, необходимо срочно обратиться к офтальмологу.", drDetected: "Выявлена диабетическая ретинопатия", glaucomaDetected: "Выявлены признаки глаукомы", cataractDetected: "Выявлены признаки катаракты", glaucomaDetail: "Вероятность глаукомы: {value}%. Рекомендуется осмотр офтальмолога и измерение внутриглазного давления.", cataractDetail: "Вероятность катаракты: {value}%. Рекомендуется осмотр офтальмолога.", multipleDetected: "Выявлено несколько состояний", detectedConditions: "Выявлено", comprehensiveExam: "Необходим срочный комплексный осмотр офтальмолога." },
  kk: { readySignal: "Сигнал|дайын.", noDr: "Көз сау, бәрі жақсы", healthyRetina: "Көз сау, торлы қабық қалыпты (сенімділік {confidence}%)", drName: "Диабеттік ретинопатия", drProbability: "Ауру ықтималдығы {value}% (дәрежесі: {grade})", grade: "Дәреже", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Ықтималдық {value}%", diseasePositive: "ОҢ НӘТИЖЕ", diseaseNegative: "Теріс", patientInference: "Нақты модель талдауы аяқталды.", fundusImage: "КӨЗ ТҮБІНІҢ СУРЕТІ", uploadedPreview: "Сурет алдын ала көрінісі", inferenceTitle: "VEYA AI талдауы", gradeMild: "{grade}-дәреже: өзгерістер анықталды, офтальмологтың шұғыл тексеруі қажет.", gradeModerate: "{grade}-дәреже: айқын өзгерістер анықталды, офтальмологқа шұғыл қаралу қажет.", gradeSevere: "{grade}-дәреже: ауыр өзгерістер, офтальмологқа шұғыл жолдану қажет.", drDetected: "Диабеттік ретинопатия анықталды", glaucomaDetected: "Глаукома белгілері анықталды", cataractDetected: "Катаракта белгілері анықталды", glaucomaDetail: "Глаукома ықтималдығы: {value}%. Офтальмолог тексеруі және көз ішілік қысымды өлшеу қажет.", cataractDetail: "Катаракта ықтималдығы: {value}%. Офтальмолог тексеруі қажет.", multipleDetected: "Бірнеше жағдай анықталды", detectedConditions: "Анықталғаны", comprehensiveExam: "Офтальмологтың шұғыл кешенді тексеруі қажет." },
};
const dashboardTranslations: Record<Language, Record<string, string>> = {
  en: { screenEarlier: "Screen earlier.", seeClearer: "See clearer.", heroDescription: "Veya makes retinal screening accessible in every clinic — with a result in under 30 seconds.", modelReadyFooter: "Model endpoint ready", analysisTime: "~ 30 sec analysis", today: "TODAY AT A GLANCE", practicePulse: "Practice pulse", screeningsToday: "Screenings today", fromYesterday: "+6 from yesterday", highRiskDetected: "High risk detected", needsFollowup: "Needs follow-up", avgLatency: "Avg AI latency", last30: "Last 30 screenings", whatSees: "WHAT VEYA SEES", signalsDecision: "Three signals. One clearer decision.", signalsDescription: "Retinal patterns are screened for early signs of diabetic retinopathy, glaucoma, and cataract.", retinopathy: "Retinopathy", glaucoma: "Glaucoma", cataract: "Cataract", recentActivity: "RECENT ACTIVITY", latestScreenings: "Latest screenings" },
  ru: { screenEarlier: "Начните скрининг раньше.", seeClearer: "Видите яснее.", heroDescription: "Veya делает скрининг сетчатки доступным в каждой клинике — результат менее чем за 30 секунд.", modelReadyFooter: "Модель готова", analysisTime: "~ 30 сек анализа", today: "СЕГОДНЯ", practicePulse: "Пульс клиники", screeningsToday: "Скринингов сегодня", fromYesterday: "+6 со вчера", highRiskDetected: "Высокий риск", needsFollowup: "Нужно наблюдение", avgLatency: "Средняя задержка AI", last30: "Последние 30 скринингов", whatSees: "ЧТО ВИДИТ VEYA", signalsDecision: "Три сигнала. Одно ясное решение.", signalsDescription: "Паттерны сетчатки проверяются на ранние признаки диабетической ретинопатии, глаукомы и катаракты.", retinopathy: "Ретинопатия", glaucoma: "Глаукома", cataract: "Катаракта", recentActivity: "НЕДАВНЯЯ АКТИВНОСТЬ", latestScreenings: "Последние скрининги" },
  kk: { screenEarlier: "Скринингті ертерек бастаңыз.", seeClearer: "Анығырақ көріңіз.", heroDescription: "Veya әр клиникада торлы қабық скринингін қолжетімді етеді — нәтиже 30 секундтан аз уақытта дайын.", modelReadyFooter: "Модель дайын", analysisTime: "~ 30 сек талдау", today: "БҮГІНГІ ШОЛУ", practicePulse: "Клиника көрсеткіші", screeningsToday: "Бүгінгі скринингтер", fromYesterday: "Кешегіден +6", highRiskDetected: "Жоғары қауіп", needsFollowup: "Бақылау қажет", avgLatency: "AI орташа кідірісі", last30: "Соңғы 30 скрининг", whatSees: "VEYA НЕНІ КӨРЕДІ", signalsDecision: "Үш сигнал. Бір анық шешім.", signalsDescription: "Торлы қабық үлгілері диабеттік ретинопатия, глаукома және катарактаның ерте белгілеріне тексеріледі.", retinopathy: "Ретинопатия", glaucoma: "Глаукома", cataract: "Катаракта", recentActivity: "СОҢҒЫ ӘРЕКЕТТЕР", latestScreenings: "Соңғы скринингтер" },
};
const workflowTranslations: Record<Language, Record<string, string>> = {
  en: { essentials: "Let’s start with|the essentials.", context: "A few details help Veya contextualize the screening. You can add the clinical note later.", captureFundus: "Capture the|fundus image.", captureHelp: "Place the visoScope and upload a well-focused retinal view.", age: "Age", reviewImage: "Review image" },
  ru: { essentials: "Начнём с|основных данных.", context: "Эти данные помогут Veya учесть контекст скрининга. Клиническую заметку можно добавить позже.", captureFundus: "Сделайте|снимок глазного дна.", captureHelp: "Разместите visoScope и загрузите чёткий снимок сетчатки.", age: "Возраст", reviewImage: "Проверить снимок" },
  kk: { essentials: "Негізгі|мәліметтерден бастайық.", context: "Бұл мәліметтер Veya-ға скрининг контекстін түсінуге көмектеседі. Клиникалық жазбаны кейін қосуға болады.", captureFundus: "Көз түбінің|суретін түсіріңіз.", captureHelp: "visoScope құрылғысын орналастырып, анық торлы қабық суретін жүктеңіз.", age: "Жасы", reviewImage: "Суретті тексеру" },
};
function useI18n() { return useContext(LanguageContext) ?? { language: "en" as Language, setLanguage: () => undefined, t: (key: string) => key }; }
function LanguageSwitcher() { const { language, setLanguage, t } = useI18n(); return <label className="language-switcher"><span>{t("language")}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}><option value="kk">KZ</option><option value="ru">RU</option><option value="en">EN</option></select></label>; }
const uiTranslations: Record<Language, Record<string, string>> = {
  en: { routineDetail: "No signs detected. Repeat screening in 12 months, or earlier if symptoms appear.", greetMorning: "Good morning", greetAfternoon: "Good afternoon", greetEvening: "Good evening", greetNight: "Good night", deviceConnected: "visoScope 2.0 connected", connectedShort: "Connected", vsYesterday: "{value} vs yesterday", noData: "No data yet", todayWord: "Today", yesterdayWord: "Yesterday", exporting: "Preparing PDF…", pdfReady: "Report saved: {name}", pdfFailed: "Could not create the PDF. Check the connection and try again.", fileTooLarge: "The file is larger than 10 MB. Choose a smaller image.", fileNotImage: "This file is not an image. Use JPG or PNG.", fileUnreadable: "The image could not be opened. Save it as JPG or PNG and try again.", qualityCheck: "Check image quality", issue_lowResolution: "Low resolution — the model works best from 512 px.", issue_tooDark: "The image is very dark — the retina may not be visible.", issue_tooBright: "The image is overexposed.", timeout: "The AI service did not respond within 2 minutes.", networkError: "Could not reach the AI service.", serverError: "The AI service returned an error", invalidResponse: "The AI service returned an unexpected response.", checkEndpoint: "Check the API endpoint in Settings and try again.", coldStart: "Waking up the AI server — the first analysis can take up to a minute.", cancel: "Cancel", storageFull: "Browser storage is full — the image was not saved with this scan.", savedToHistory: "Saved to history", openHistory: "Open history", analysisTimeLabel: "Analysis time {value} s", deleteConfirm: "Delete {count} selected scan(s)? This cannot be undone.", deleteOne: "Delete scan", deleteOneConfirm: "Delete this scan? This cannot be undone.", deleted: "Scan deleted", deleteFailed: "Could not delete the scan", testConnection: "Test connection", testing: "Checking…", reachable: "AI server is reachable", unreachable: "AI server is not reachable", connectionHelp: "Checks that the inference server answers. The first request after idle can take up to a minute.", statusUnknown: "NOT CHECKED", statusOnline: "ONLINE", statusOffline: "OFFLINE", autoUpload: "Auto-analyze after capture", autoUploadHelp: "Start AI screening as soon as a good-quality image is chosen", lastChecked: "Last checked {time}", notChecked: "Not checked yet", showDemo: "Show demo records", showDemoHelp: "Sample patients on the dashboard and in history", dataSection: "DATA", clearHistory: "Clear my scan history", clearHistoryHelp: "Removes scans saved in this browser for your profile", clearHistoryConfirm: "Delete all saved scans in this browser? This cannot be undone.", historyCleared: "History cleared", clearBtn: "Clear", logout: "Log out", help: "Help", helpTitle: "How to run a screening", helpStep1: "Enter the patient’s name, age and ID. Notes go into the PDF report.", helpStep2: "Choose the eye (OD — right, OS — left) and upload a centered fundus image with the optic disc visible.", helpStep3: "Run the AI screening. The model checks for diabetic retinopathy, glaucoma and cataract.", helpStep4: "Save the PDF report, attach it to the patient record and refer high-risk patients to an ophthalmologist.", helpSignalsTitle: "What the model checks", helpSignals: "Diabetic retinopathy grades 0–4, glaucoma and cataract probability. A result is flagged as high risk when any condition is positive.", helpDisclaimerTitle: "Important", helpDisclaimer: "VEYA is a screening support tool, not a diagnosis. Every result must be confirmed by an ophthalmologist.", close: "Close", demoAuthNote: "Demo sign-in: profiles are stored in this browser only.", noScansYet: "No screenings yet. Start your first one.", notesLabel: "Notes", csvExported: "History exported", noDetailStored: "Detailed AI output is not stored for this record.", ageYears: "{value} y.o." },
  ru: { routineDetail: "Признаков не выявлено. Повторный скрининг через 12 месяцев или раньше при появлении симптомов.", greetMorning: "Доброе утро", greetAfternoon: "Добрый день", greetEvening: "Добрый вечер", greetNight: "Доброй ночи", deviceConnected: "visoScope 2.0 подключён", connectedShort: "Подключено", vsYesterday: "{value} к вчера", noData: "Пока нет данных", todayWord: "Сегодня", yesterdayWord: "Вчера", exporting: "Готовим PDF…", pdfReady: "Отчёт сохранён: {name}", pdfFailed: "Не удалось создать PDF. Проверьте подключение и попробуйте снова.", fileTooLarge: "Файл больше 10 МБ. Выберите изображение поменьше.", fileNotImage: "Это не изображение. Используйте JPG или PNG.", fileUnreadable: "Не удалось открыть изображение. Сохраните его как JPG или PNG и повторите.", qualityCheck: "Проверьте качество", issue_lowResolution: "Низкое разрешение — модель лучше работает от 512 px.", issue_tooDark: "Снимок очень тёмный — сетчатка может быть не видна.", issue_tooBright: "Снимок пересвечен.", timeout: "AI-сервис не ответил за 2 минуты.", networkError: "Не удалось связаться с AI-сервисом.", serverError: "AI-сервис вернул ошибку", invalidResponse: "AI-сервис вернул неожиданный ответ.", checkEndpoint: "Проверьте API endpoint в Настройках и повторите.", coldStart: "Запускаем AI-сервер — первый анализ может занять до минуты.", cancel: "Отмена", storageFull: "Память браузера заполнена — снимок не сохранён в истории.", savedToHistory: "Сохранено в историю", openHistory: "Открыть историю", analysisTimeLabel: "Время анализа {value} с", deleteConfirm: "Удалить выбранные сканы ({count})? Это действие нельзя отменить.", deleteOne: "Удалить скан", deleteOneConfirm: "Удалить этот скан? Это действие нельзя отменить.", deleted: "Скан удалён", deleteFailed: "Не удалось удалить скан", testConnection: "Проверить связь", testing: "Проверяем…", reachable: "AI-сервер доступен", unreachable: "AI-сервер недоступен", connectionHelp: "Проверяет, что сервер анализа отвечает. Первый запрос после простоя может занять до минуты.", statusUnknown: "НЕ ПРОВЕРЕНО", statusOnline: "ОНЛАЙН", statusOffline: "ОФЛАЙН", autoUpload: "Автоанализ после снимка", autoUploadHelp: "Запускать AI-скрининг сразу после выбора качественного снимка", lastChecked: "Последняя проверка: {time}", notChecked: "Ещё не проверялась", showDemo: "Показывать демо-записи", showDemoHelp: "Примеры пациентов на главной и в истории", dataSection: "ДАННЫЕ", clearHistory: "Очистить историю сканов", clearHistoryHelp: "Удаляет сканы, сохранённые в этом браузере для вашего профиля", clearHistoryConfirm: "Удалить все сохранённые сканы в этом браузере? Действие нельзя отменить.", historyCleared: "История очищена", clearBtn: "Очистить", logout: "Выйти", help: "Помощь", helpTitle: "Как провести скрининг", helpStep1: "Введите имя, возраст и ID пациента. Заметки попадут в PDF-отчёт.", helpStep2: "Выберите глаз (OD — правый, OS — левый) и загрузите центрированный снимок глазного дна с видимым диском зрительного нерва.", helpStep3: "Запустите AI-скрининг. Модель проверяет признаки диабетической ретинопатии, глаукомы и катаракты.", helpStep4: "Сохраните PDF-отчёт, приложите его к карте пациента и направьте пациентов с высоким риском к офтальмологу.", helpSignalsTitle: "Что проверяет модель", helpSignals: "Стадии диабетической ретинопатии 0–4, вероятность глаукомы и катаракты. Результат отмечается как высокий риск, если любое состояние положительное.", helpDisclaimerTitle: "Важно", helpDisclaimer: "VEYA — инструмент поддержки скрининга, а не диагноз. Каждый результат должен подтвердить офтальмолог.", close: "Закрыть", demoAuthNote: "Демо-вход: профили хранятся только в этом браузере.", noScansYet: "Скринингов пока нет. Начните первый.", notesLabel: "Заметки", csvExported: "История выгружена", noDetailStored: "Подробный ответ AI для этой записи не сохранён.", ageYears: "{value} лет" },
  kk: { routineDetail: "Белгілер анықталмады. Қайта скринингті 12 айдан кейін немесе симптомдар пайда болса ертерек жүргізіңіз.", greetMorning: "Қайырлы таң", greetAfternoon: "Қайырлы күн", greetEvening: "Қайырлы кеш", greetNight: "Қайырлы түн", deviceConnected: "visoScope 2.0 қосылған", connectedShort: "Қосылған", vsYesterday: "кешегімен салыстырғанда {value}", noData: "Әзірге дерек жоқ", todayWord: "Бүгін", yesterdayWord: "Кеше", exporting: "PDF дайындалуда…", pdfReady: "Есеп сақталды: {name}", pdfFailed: "PDF жасалмады. Байланысты тексеріп, қайталап көріңіз.", fileTooLarge: "Файл 10 МБ-тан үлкен. Кішірек сурет таңдаңыз.", fileNotImage: "Бұл сурет емес. JPG немесе PNG пайдаланыңыз.", fileUnreadable: "Суретті ашу мүмкін болмады. Оны JPG немесе PNG ретінде сақтап, қайталаңыз.", qualityCheck: "Сапасын тексеріңіз", issue_lowResolution: "Ажыратымдылығы төмен — модель 512 px-тен жақсы жұмыс істейді.", issue_tooDark: "Сурет тым қараңғы — торлы қабық көрінбеуі мүмкін.", issue_tooBright: "Сурет тым ашық.", timeout: "AI сервисі 2 минут ішінде жауап бермеді.", networkError: "AI сервисіне қосылу мүмкін болмады.", serverError: "AI сервисі қате қайтарды", invalidResponse: "AI сервисі күтпеген жауап қайтарды.", checkEndpoint: "Баптаулардағы API endpoint-ті тексеріп, қайталаңыз.", coldStart: "AI сервері іске қосылуда — алғашқы талдау бір минутқа дейін созылуы мүмкін.", cancel: "Болдырмау", storageFull: "Браузер жады толы — сурет тарихта сақталмады.", savedToHistory: "Тарихқа сақталды", openHistory: "Тарихты ашу", analysisTimeLabel: "Талдау уақыты {value} с", deleteConfirm: "Таңдалған скандарды ({count}) жою керек пе? Бұл әрекетті қайтару мүмкін емес.", deleteOne: "Сканды жою", deleteOneConfirm: "Бұл сканды жою керек пе? Бұл әрекетті қайтару мүмкін емес.", deleted: "Скан жойылды", deleteFailed: "Сканды жою мүмкін болмады", testConnection: "Байланысты тексеру", testing: "Тексерілуде…", reachable: "AI сервері қолжетімді", unreachable: "AI сервері қолжетімсіз", connectionHelp: "Талдау сервері жауап беретінін тексереді. Ұзақ күтуден кейінгі алғашқы сұрау бір минутқа дейін созылуы мүмкін.", statusUnknown: "ТЕКСЕРІЛМЕГЕН", statusOnline: "ОНЛАЙН", statusOffline: "ОФЛАЙН", autoUpload: "Түсірілімнен кейін автоталдау", autoUploadHelp: "Сапалы сурет таңдалғанда AI скринингін бірден бастау", lastChecked: "Соңғы тексеріс: {time}", notChecked: "Әлі тексерілмеген", showDemo: "Демо жазбаларды көрсету", showDemoHelp: "Басты бет пен тарихтағы мысал пациенттер", dataSection: "ДЕРЕКТЕР", clearHistory: "Скан тарихын тазалау", clearHistoryHelp: "Осы браузерде профиліңіз үшін сақталған скандарды жояды", clearHistoryConfirm: "Осы браузердегі барлық сақталған скандарды жою керек пе? Бұл әрекетті қайтару мүмкін емес.", historyCleared: "Тарих тазаланды", clearBtn: "Тазалау", logout: "Шығу", help: "Көмек", helpTitle: "Скринингті қалай жүргізу керек", helpStep1: "Пациенттің аты-жөнін, жасын және ID енгізіңіз. Жазбалар PDF есепке енеді.", helpStep2: "Көзді таңдаңыз (OD — оң, OS — сол) және көру жүйкесінің дискісі көрінетін орталықтанған көз түбі суретін жүктеңіз.", helpStep3: "AI скринингін іске қосыңыз. Модель диабеттік ретинопатия, глаукома және катаракта белгілерін тексереді.", helpStep4: "PDF есепті сақтап, пациент картасына тіркеңіз және жоғары қауіпті пациенттерді офтальмологқа жіберіңіз.", helpSignalsTitle: "Модель нені тексереді", helpSignals: "Диабеттік ретинопатия 0–4 дәрежелері, глаукома мен катаракта ықтималдығы. Кез келген жағдай оң болса, нәтиже жоғары қауіп ретінде белгіленеді.", helpDisclaimerTitle: "Маңызды", helpDisclaimer: "VEYA — скринингті қолдау құралы, диагноз емес. Әр нәтижені офтальмолог растауы тиіс.", close: "Жабу", demoAuthNote: "Демо кіру: профильдер тек осы браузерде сақталады.", noScansYet: "Әзірге скрининг жоқ. Біріншісін бастаңыз.", notesLabel: "Жазбалар", csvExported: "Тарих экспортталды", noDetailStored: "Бұл жазба үшін AI-дың толық жауабы сақталмаған.", ageYears: "{value} жас" },
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
  latencyMs?: number;
};

const HISTORY_STORAGE_KEY_BASE = "veya_scan_history";
const SHOW_DEMO_KEY = "veya_show_demo";
const AUTO_ANALYZE_KEY = "veya_auto_analyze";
const CALIBRATION_KEY = "veya_calibration_checked_at";

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

const tabs: { key: TabKey; icon: typeof Menu }[] = [
  { key: "dashboard", icon: Menu },
  { key: "analysis", icon: Eye },
  { key: "history", icon: History },
  { key: "settings", icon: Settings2 },
  { key: "profile", icon: UserRound },
];

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo-mark${light ? " logo-mark--light" : ""}`} aria-hidden="true">
      <span className="logo-mark__outer" />
      <span className="logo-mark__inner" />
    </span>
  );
}

function StatusPill({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`connection-pill${compact ? " connection-pill--compact" : ""}`}>
      <span className="status-dot" />
      <span>{compact ? t("connectedShort") : t("deviceConnected")}</span>
    </span>
  );
}

function AppIcon({ children, tone = "mint" }: { children: ReactNode; tone?: string }) {
  return <span className={`app-icon app-icon--${tone}`}>{children}</span>;
}

function FundusThumb({ variant, image }: { variant: string; image?: string }) {
  return (
    <span className={`fundus-thumb ${variant}`} aria-hidden="true">
      <span className="fundus-thumb__vessel fundus-thumb__vessel--one" />
      <span className="fundus-thumb__vessel fundus-thumb__vessel--two" />
      <span className="fundus-thumb__disc" />
      <span className="fundus-thumb__glow" />
      {image && <img className="fundus-thumb__img" src={image} alt="" />}
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
  const { t } = useI18n();
  return <span className={`risk-badge risk-badge--${risk === "High risk" ? "high" : "normal"}`}><span />{risk === "High risk" ? t("highRiskFilter") : t("normalFilter")}</span>;
}

function formatToday(language: Language) {
  const today = new Date();
  if (language === "kk") {
    const weekdays = ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"];
    const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
    return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()} ж., ${weekdays[today.getDay()]}`;
  }
  return new Intl.DateTimeFormat(localeFor(language), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(today);
}

function greetingKey() {
  const hour = new Date().getHours();
  return hour < 5 ? "greetNight" : hour < 12 ? "greetMorning" : hour < 18 ? "greetAfternoon" : hour < 23 ? "greetEvening" : "greetNight";
}

function Dashboard({ history, onStart, onTab, onSelect, onHelp }: { history: Patient[]; onStart: () => void; onTab: (tab: TabKey) => void; onSelect: (patient: Patient) => void; onHelp: () => void }) {
  const { language, t } = useI18n();
  const profile = activeProfile();
  const stats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const onDay = (scan: Patient, day: Date) => Boolean(scan.scannedAt) && new Date(scan.scannedAt as string).toDateString() === day.toDateString();
    const todayCount = history.filter((scan) => onDay(scan, today)).length;
    const yesterdayCount = history.filter((scan) => onDay(scan, yesterday)).length;
    const highRisk = history.filter((scan) => scan.risk === "High risk").length;
    const latencies = history.filter((scan) => scan.latencyMs).slice(0, 30).map((scan) => scan.latencyMs as number);
    const avgLatency = latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length / 1000 : null;
    return { todayCount, yesterdayCount, highRisk, avgLatency, latencyCount: latencies.length };
  }, [history]);
  const delta = stats.todayCount - stats.yesterdayCount;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  const trend = stats.yesterdayCount ? `${signed(Math.round((delta / stats.yesterdayCount) * 100))}%` : undefined;
  const recent = history.slice(0, 4);
  return (
    <div className="screen screen--dashboard">
      <header className="topbar">
        <div className="brand-lockup"><LogoMark /><div><div className="brand-name">VEYA<span>AI</span></div><div className="brand-kicker">{t("ophthalmic")}</div></div></div>
        <button className="avatar-button" aria-label={t("profile")} onClick={() => onTab("profile")}><span>{profileInitials(profile?.name || "Dr")}</span><span className="avatar-status" /></button>
      </header>

      <section className="welcome-row">
        <div><p className="date-line"><SunMedium size={14} /> {formatToday(language)}</p><h1>{t(greetingKey())}, <em>{profile?.name || "Doctor"}</em></h1><p className="welcome-detail">{profile?.hospital || t("workspaceReady")}</p></div>
        <StatusPill />
      </section>

      <section className="hero-card">
        <div className="hero-card__ambient" />
        <div className="hero-card__content"><span className="hero-card__eyebrow"><Sparkles size={14} /> {t("clinical")}</span><h2>{t("screenEarlier")}<br /><em>{t("seeClearer")}</em></h2><p>{t("heroDescription")}</p><button className="button button--light" onClick={onStart}>{t("start")} <ArrowUpRight size={17} /></button></div>
        <div className="hero-eye" aria-hidden="true"><span className="hero-eye__ring hero-eye__ring--outer" /><span className="hero-eye__ring hero-eye__ring--middle" /><span className="hero-eye__ring hero-eye__ring--inner" /><span className="hero-eye__spark" /></div>
        <div className="hero-card__footer"><span><span className="mini-live" /> {t("modelReadyFooter")}</span><span>{t("analysisTime")} <Zap size={12} /></span></div>
      </section>

      <div className="section-title-row"><div><span className="eyebrow">{t("today")}</span><h2>{t("practicePulse")}</h2></div><button className="text-button" onClick={() => onTab("history")}>{t("viewHistory")} <ChevronRight size={15} /></button></div>
      <section className="stat-grid">
        <StatCard icon={<Activity size={17} />} tone="mint" value={String(stats.todayCount)} label={t("screeningsToday")} detail={t("vsYesterday").replace("{value}", signed(delta))} trend={trend} />
        <StatCard icon={<AlertCircle size={17} />} tone="coral" value={String(stats.highRisk)} label={t("highRiskDetected")} detail={t("needsFollowup")} />
        <StatCard icon={<Gauge size={17} />} tone="violet" value={stats.avgLatency === null ? "—" : `${stats.avgLatency.toFixed(1)}s`} label={t("avgLatency")} detail={stats.latencyCount ? t("last30") : t("noData")} />
      </section>

      <button className="tech-card tech-card--button" onClick={onHelp}><div className="tech-card__icon"><Target size={20} /></div><div className="tech-card__body"><span className="eyebrow">{t("whatSees")}</span><h3>{t("signalsDecision")}</h3><p>{t("signalsDescription")}</p><div className="signal-row"><span><i className="signal-dot signal-dot--amber" />{t("retinopathy")}</span><span><i className="signal-dot signal-dot--blue" />{t("glaucoma")}</span><span><i className="signal-dot signal-dot--violet" />{t("cataract")}</span></div></div><ChevronRight className="tech-card__arrow" size={18} /></button>

      <div className="section-title-row section-title-row--recent"><div><span className="eyebrow">{t("recentActivity")}</span><h2>{t("latestScreenings")}</h2></div><button className="icon-button" onClick={() => onTab("history")} aria-label={t("viewHistory")}><MoreHorizontal size={19} /></button></div>
      {recent.length ? <div className="screening-list screening-list--dashboard">{recent.map((patient) => <PatientRow key={`${patient.source}-${scanKey(patient)}`} patient={patient} compact onClick={() => onSelect(patient)} />)}</div> : <button className="empty-state empty-state--button" onClick={onStart}><Sparkles size={20} /><strong>{t("noScansYet")}</strong><span>{t("start")}</span></button>}
    </div>
  );
}

function PatientRow({ patient, compact = false, onClick }: { patient: Patient; compact?: boolean; onClick?: () => void }) {
  const { language, t } = useI18n();
  return (
    <button className={`patient-row${compact ? " patient-row--compact" : ""}`} onClick={onClick}>
      <FundusThumb variant={patient.thumb} image={patient.image} />
      <span className="patient-row__main"><strong>{patient.name}</strong><span>{patient.id} <b>·</b> {scanWhen(patient, language, t)}{patient.source === "demo" && <i className="demo-chip">{t("demo")}</i>}</span></span>
      <span className="patient-row__end"><RiskBadge risk={patient.risk} /><span className="patient-score">{patient.score}</span></span>
      {!compact && <ChevronRight size={16} className="patient-row__chevron" />}
    </button>
  );
}

function SplitTitle({ text }: { text: string }) {
  return <>{text.split("|").map((part, index) => <span key={`${index}-${part}`}>{index > 0 && <br />}{index === 1 ? <em>{part}</em> : part}</span>)}</>;
}

function Analysis({ onBack, onOpenHistory }: { onBack: () => void; onOpenHistory: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [eye, setEye] = useState<"OS" | "OD">("OS");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageCheck, setImageCheck] = useState<ImageCheck | null>(null);
  const [scanning, setScanning] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [scanError, setScanError] = useState("");
  const [savedScan, setSavedScan] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: "", age: "", id: "", notes: "" });
  const fileInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const beginScan = async (file: File | null = uploadedFile, check: ImageCheck | null = imageCheck) => {
    if (!file || scanning) return;
    setScanning(true);
    setScanError("");
    setSlowHint(false);
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const slowTimer = window.setTimeout(() => setSlowHint(true), 8000);
    const timeoutTimer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 120_000);
    const started = performance.now();
    try {
      const payload = new FormData();
      payload.append("file", file);
      const response = await fetch(readInferenceEndpoint(), { method: "POST", body: payload, signal: controller.signal });
      if (!response.ok) throw new Error(`${t("serverError")} (HTTP ${response.status}).`);
      const data = (await response.json()) as ModelResult & InferenceResult;
      const inference: InferenceResult | undefined = data?.result ?? (data?.dr_grade || data?.glaucoma || data?.cataract ? data : undefined);
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
        image: check?.preview,
        result: inference,
        latencyMs,
      };
      if (!saveScan(scan)) toast.warning(t("storageFull"));
      setSavedScan(scan);
      setStep(4);
    } catch (error) {
      if (controller.signal.aborted && !timedOut) return; // cancelled by the user or the screen closed
      const message = timedOut ? t("timeout") : error instanceof TypeError ? t("networkError") : error instanceof Error ? error.message : t("networkError");
      setScanError(`${message} ${t("checkEndpoint")}`);
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      if (abortRef.current === controller) abortRef.current = null;
      setScanning(false);
      setSlowHint(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (fileInput.current) fileInput.current.value = ""; // allow choosing the same file again
    if (!file) return;
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
    if (readFlag(AUTO_ANALYZE_KEY, false) && !check.issues.length) void beginScan(file, check);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragActive(false); void handleFile(event.dataTransfer.files?.[0]); };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => void handleFile(event.target.files?.[0]);
  const cancelScan = () => abortRef.current?.abort();
  const restart = () => { abortRef.current?.abort(); setStep(1); setFileName(""); setFileUrl(""); setUploadedFile(null); setImageCheck(null); setSavedScan(null); setScanError(""); setForm({ name: "", age: "", id: "", notes: "" }); };
  const qualityOk = !imageCheck?.issues.length;

  return (
    <div className="screen screen--analysis">
      <header className="subpage-header"><button className="icon-button" onClick={onBack} aria-label={t("back")}><ArrowLeft size={19} /></button><div><span className="eyebrow">{t("newWorkflow")}</span><h1>{t("newScreening")}</h1></div><span className="step-counter">0{Math.min(step, 4)} <span>/ 04</span></span></header>
      <div className="progress-track"><span style={{ width: `${step * 25}%` }} /></div>

      {step === 1 && <section className="flow-section flow-section--intro"><div className="flow-icon"><Stethoscope size={25} /></div><span className="eyebrow">{t("stepPatient")}</span><h2><SplitTitle text={t("essentials")} /></h2><p className="flow-lead">{t("context")}</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setStep(2); }}><label>{t("patientName")}<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aigerim Sadykova" autoComplete="off" /></label><div className="form-row"><label>{t("age")}<input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })} placeholder={t("years")} /></label><label>{t("patientId")}<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="VE-00000" autoComplete="off" /></label></div><label>{t("symptoms")} <span className="optional">{t("optional")}</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notePlaceholder")} rows={3} /></label><button className="button button--primary button--full" type="submit">{t("continueCapture")} <ChevronRight size={17} /></button></form></section>}

      {step === 2 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">{t("stepCapture")}</span><h2><SplitTitle text={t("captureFundus")} /></h2></div><AppIcon tone="blue"><Camera size={19} /></AppIcon></div><p className="flow-lead">{t("captureHelp")}</p><div className="eye-toggle"><button className={eye === "OS" ? "is-active" : ""} onClick={() => setEye("OS")}><span>{t("leftEye")}</span><b>OS</b></button><button className={eye === "OD" ? "is-active" : ""} onClick={() => setEye("OD")}><span>{t("rightEye")}</span><b>OD</b></button></div><div role="button" tabIndex={0} className={`capture-zone${dragActive ? " is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={() => fileInput.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.current?.click(); } }}><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onInput} hidden /><div className="viewfinder"><span className="viewfinder__crosshair" /><span className="viewfinder__arc viewfinder__arc--one" /><span className="viewfinder__arc viewfinder__arc--two" /><Eye size={23} /></div><strong>{fileName || t("dropImage")}</strong><span>{fileName ? t("imageReady") : t("browseImage")}</span></div>{scanError ? <div className="capture-tip capture-tip--error"><AlertCircle size={15} /><span>{scanError}</span></div> : <div className="capture-tip"><Info size={15} /><span>{t("bestResults")}</span></div>}<button className="button button--primary button--full" onClick={() => fileName ? setStep(3) : fileInput.current?.click()}>{fileName ? t("reviewImage") : t("uploadImage")} <CloudUpload size={17} /></button><button className="button button--ghost button--full" onClick={() => setStep(1)}>{t("backPatient")}</button></section>}

      {step === 3 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">{t("stepReview")}</span><h2><SplitTitle text={t("readySignal")} /></h2></div><AppIcon tone="violet"><Sparkles size={18} /></AppIcon></div><p className="flow-lead">{t("reviewHelp")}</p><div className="scan-preview">{fileUrl ? <img src={fileUrl} alt={t("uploadedPreview")} /> : <FundusThumb variant="fundus-amber" />}<div className="scan-preview__overlay"><span className="scan-eye-label">{eye} · {t("fundusImage")}</span><span className={`scan-quality${qualityOk ? "" : " scan-quality--warn"}`}>{qualityOk ? <Check size={13} /> : <AlertCircle size={13} />} {qualityOk ? t("qualityGood") : t("qualityCheck")}</span></div></div>{!qualityOk && <div className="capture-tip capture-tip--warn"><AlertCircle size={15} /><span>{imageCheck?.issues.map((issue) => t(`issue_${issue}`)).join(" ")}</span></div>}<div className="review-meta"><span><FileText size={15} />{fileName}{imageCheck ? ` · ${imageCheck.width}×${imageCheck.height}` : ""}</span><button onClick={() => { cancelScan(); setStep(2); }} disabled={scanning}><RotateCcw size={14} />{t("replace")}</button></div><div className="model-note"><span className="mini-live" /><div><strong>{t("inferenceTitle")}</strong><span>{slowHint ? t("coldStart") : t("modelInference")}</span></div></div>{scanError && <div className="capture-tip capture-tip--error"><AlertCircle size={15} /><span>{scanError}</span></div>}<button className="button button--primary button--full" onClick={() => void beginScan()} disabled={scanning}>{scanning ? t("analyzing") : t("runScreening")} {scanning ? <Loader2 size={17} className="spin" /> : <ArrowUpRight size={17} />}</button>{scanning ? <button className="button button--ghost button--full" onClick={cancelScan}>{t("cancel")}</button> : <button className="button button--ghost button--full" onClick={() => setStep(2)}>{t("backCapture")}</button>}</section>}

      {step === 4 && savedScan && <Results scan={savedScan} onRestart={restart} onOpenHistory={onOpenHistory} />}
    </div>
  );
}

function MetricsCard({ result, live }: { result: InferenceResult | null | undefined; live: boolean }) {
  const { t } = useI18n();
  const analysis = interpret(result, t);
  return <div className="metrics-card"><div className="card-title-row"><div><span className="eyebrow">{t("signalBreakdown")}</span><h3>{t("modelResults")}</h3></div><span className="demo-tag">{live ? t("liveModel") : t("demo")}</span></div>{analysis.metrics.map((metric) => <div className="metric-bar" key={metric.key}><div><span>{metric.label}</span><strong>{metric.value}%</strong></div><div className="metric-track"><span className={`metric-fill metric-fill--${metric.tone}`} style={{ width: `${metric.value}%` }} /></div><small>{metric.note}</small>{metric.detail && <small className="metric-detail">{metric.detail}</small>}</div>)}{live && <details className="raw-response"><summary>{t("rawResponse")}</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>}</div>;
}

function Results({ scan, onRestart, onOpenHistory }: { scan: Patient; onRestart: () => void; onOpenHistory: () => void }) {
  const { t } = useI18n();
  const analysis = interpret(scan.result, t);
  const { exporting, exportReport } = useReportExport();
  const meta = [scan.name, scan.age ? t("ageYears").replace("{value}", scan.age) : "", scan.latencyMs ? t("analysisTimeLabel").replace("{value}", (scan.latencyMs / 1000).toFixed(1)) : ""].filter(Boolean).join(" · ");
  return <section className="flow-section results-section"><div className="result-head"><div className="result-check"><Check size={24} /></div><span className="eyebrow">{t("screeningComplete")} · {scan.eye}</span><h2><SplitTitle text={t("clinicalSignal")} /></h2><p className="flow-lead">{meta}</p></div><div className={`result-banner ${analysis.highRisk ? "result-banner--high" : "result-banner--normal"}`}><div><span className="eyebrow">{t("triage")}</span><strong>{analysis.statusTitle}</strong><p>{analysis.statusDetail}</p></div>{analysis.highRisk ? <AlertCircle size={28} /> : <Check size={28} />}</div><MetricsCard result={scan.result} live /><div className="recommendation"><AppIcon tone="mint"><Stethoscope size={17} /></AppIcon><div><span className="eyebrow">{t("clinicalAction")}</span><strong>{analysis.recommendationTitle}</strong><p>{analysis.recommendationDetail}</p></div></div><p className="disclaimer-note"><ShieldCheck size={13} />{t("helpDisclaimer")}</p><button className="button button--primary button--full" onClick={() => void exportReport(scan)} disabled={exporting}>{exporting ? <Loader2 size={17} className="spin" /> : <Download size={17} />}{exporting ? t("exporting") : t("exportReport")}</button><div className="button-pair"><button className="button button--ghost button--full" onClick={onOpenHistory}><History size={16} />{t("openHistory")}</button><button className="button button--ghost button--full" onClick={onRestart}><RotateCcw size={16} />{t("another")}</button></div></section>;
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
  const toggleSelected = (patient: Patient) => { if (patient.source !== "live") return; const key = scanKey(patient); setSelectedIds((ids) => ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key]); };
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
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="mint"><History size={18} /></AppIcon><div><span className="eyebrow">{t("archive")}</span><h1>{t("history")}</h1></div></div><div className="history-actions"><button className="icon-button" onClick={exportCsv} aria-label={t("export")} title={t("export")} disabled={!filtered.length}><FileDown size={18} /></button><button className={`icon-button${manageMode ? " is-active" : ""}`} onClick={() => { setManageMode(!manageMode); setSelectedIds([]); }} aria-label={t("manage")} title={t("manage")}><SlidersHorizontal size={17} /></button></div></header><div className="history-summary"><div><strong>{history.length}</strong><span>{t("total")}</span></div><div><strong>{history.length ? Math.round((normalCount / history.length) * 100) : 0}%</strong><span>{t("normal")}</span></div><div><strong>{highRiskCount}</strong><span>{t("followups")}</span></div></div><div className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />{query && <button onClick={() => setQuery("")} aria-label={t("close")}><X size={15} /></button>}</div><div className="filter-row">{(["All", "High risk", "Normal"] as RiskFilter[]).map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{filterLabel(item)}{item !== "All" && <span>{history.filter((patient) => patient.risk === item).length}</span>}</button>)}</div>{manageMode && <div className="history-manage-bar"><span>{selectedScans.length} {t("selected")} · {t("demoProtected")}</span><button className="text-button" disabled={!selectedScans.length || busy} onClick={() => void removeSelected()}><Trash2 size={14} />{busy ? t("deleting") : t("delete")}</button></div>}<div className="section-title-row section-title-row--history"><div><span className="eyebrow">{t("allScans")}</span><h2>{filtered.length} {filtered.length === 1 ? t("screening") : t("screenings")}</h2></div></div><div className="screening-list">{filtered.length ? filtered.map((patient) => <div className="history-item" key={`${patient.source}-${scanKey(patient)}`}>{manageMode && <input type="checkbox" disabled={patient.source !== "live"} checked={selectedIds.includes(scanKey(patient))} onChange={() => toggleSelected(patient)} aria-label={patient.name} />}<PatientRow patient={patient} onClick={() => manageMode ? toggleSelected(patient) : onSelect(patient)} /></div>) : <div className="empty-state"><Search size={20} /><strong>{t("noFound")}</strong><span>{t("tryAgain")}</span></div>}</div></div>;
}

function SettingsScreen({ onTab, onHelp, showDemo, onShowDemo }: { onTab: (tab: TabKey) => void; onHelp: () => void; showDemo: boolean; onShowDemo: (value: boolean) => void }) {
  const { language, t } = useI18n();
  const profile = activeProfile();
  const [endpoint, setEndpoint] = useState(() => readInferenceEndpoint());
  const [saved, setSaved] = useState(true);
  const [connection, setConnection] = useState<"unknown" | "testing" | "online" | "offline">("unknown");
  const [calibratedAt, setCalibratedAt] = useState(() => readSetting(CALIBRATION_KEY));
  const [autoUpload, setAutoUpload] = useState(() => readFlag(AUTO_ANALYZE_KEY, false));
  const commitEndpoint = () => { const next = saveInferenceEndpoint(endpoint); setEndpoint(next); if (!saved) { setSaved(true); setConnection("unknown"); toast.success(t("save")); } };
  const testConnection = async () => {
    commitEndpoint();
    setConnection("testing");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 75_000);
    try {
      const url = new URL(readInferenceEndpoint());
      // Any HTTP answer from the server means it is up; no-cors avoids CORS rejections on the health probe.
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
  const runCalibration = () => { const now = new Date().toISOString(); writeSetting(CALIBRATION_KEY, now); setCalibratedAt(now); };
  const toggleAuto = () => { const next = !autoUpload; setAutoUpload(next); writeSetting(AUTO_ANALYZE_KEY, next ? "1" : "0"); };
  const clearHistory = () => { if (!window.confirm(t("clearHistoryConfirm"))) return; writeScans([]); notifyHistory(); toast.success(t("historyCleared")); };
  const calibratedLabel = calibratedAt ? t("lastChecked").replace("{time}", new Date(calibratedAt).toLocaleString(localeFor(language), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) : t("notChecked");
  const statusTag = connection === "online" ? t("statusOnline") : connection === "offline" ? t("statusOffline") : connection === "testing" ? t("testing") : t("statusUnknown");
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="violet"><Settings2 size={18} /></AppIcon><div><span className="eyebrow">{t("workspace")}</span><h1>{t("settingsTitle")}</h1></div></div><button className="icon-button" onClick={onHelp} aria-label={t("help")} title={t("help")}><CircleHelp size={18} /></button></header><section className="settings-hero"><div className="settings-hero__orb"><PlugZap size={21} /></div><div><span className="eyebrow">{t("deviceStatus")}</span><h2>{t("inSync")}</h2><p>{t("captureReady")}</p></div><StatusPill compact /></section>
    <div className="settings-group"><div className="group-label"><span>{t("aiBackend")}</span><span className={`demo-tag demo-tag--${connection}`}>{statusTag}</span></div><div className="settings-card"><label className="setting-field"><span>{t("endpoint")}</span><div className="setting-input"><Wifi size={15} /><input value={endpoint} inputMode="url" spellCheck={false} onChange={(e) => { setEndpoint(e.target.value); setSaved(false); }} onBlur={commitEndpoint} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></div><small>{t("endpointHelp")}</small></label><div className="setting-row"><div><strong>{t("testConnection")}</strong><span>{t("connectionHelp")}</span></div><button className={`toggle-button${connection === "online" ? " is-active" : ""}`} onClick={() => void testConnection()} disabled={connection === "testing"}>{connection === "testing" ? <Loader2 size={13} className="spin" /> : t("check")}</button></div></div></div>
    <div className="settings-group"><div className="group-label"><span>{t("clinicProfile")}</span><button className="text-button" onClick={() => onTab("profile")}>{t("edit")} <ArrowUpRight size={14} /></button></div><button className="settings-card settings-card--profile settings-card--button" onClick={() => onTab("profile")}><div className="clinic-avatar">{profileInitials(profile?.hospital || profile?.name || "VE")}</div><div><strong>{profile?.hospital || "—"}</strong><span>{profile?.name || ""}{profile?.email ? ` · ${profile.email}` : ""}</span></div><ChevronRight size={17} /></button></div>
    <div className="settings-group"><div className="group-label"><span>{t("captureSystem")}</span><span className="calibration-status"><Check size={12} /> {calibratedAt ? t("calibrated") : t("notChecked")}</span></div><div className="settings-card"><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="blue"><Camera size={16} /></AppIcon><div><strong>{t("optical")}</strong><span>{t("standardField")}</span></div></div></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="mint"><Target size={16} /></AppIcon><div><strong>{t("cameraCalibration")}</strong><span>{calibratedLabel}</span></div></div><button className={`toggle-button${calibratedAt ? " is-active" : ""}`} onClick={runCalibration}>{t("check")}</button></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="amber"><CloudUpload size={16} /></AppIcon><div><strong>{t("autoUpload")}</strong><span>{t("autoUploadHelp")}</span></div></div><button role="switch" aria-checked={autoUpload} className={`toggle-switch${autoUpload ? " is-active" : ""}`} onClick={toggleAuto} aria-label={t("autoUpload")}><i /></button></div></div></div>
    <div className="settings-group"><div className="group-label"><span>{t("dataSection")}</span></div><div className="settings-card"><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="violet"><UsersRound size={16} /></AppIcon><div><strong>{t("showDemo")}</strong><span>{t("showDemoHelp")}</span></div></div><button role="switch" aria-checked={showDemo} className={`toggle-switch${showDemo ? " is-active" : ""}`} onClick={() => onShowDemo(!showDemo)} aria-label={t("showDemo")}><i /></button></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="coral"><Trash2 size={16} /></AppIcon><div><strong>{t("clearHistory")}</strong><span>{t("clearHistoryHelp")}</span></div></div><button className="toggle-button toggle-button--danger" onClick={clearHistory}>{t("clearBtn")}</button></div></div></div>
    <div className="settings-footer"><ShieldCheck size={15} /> {t("historyStored")}<button className="text-button" onClick={() => { writeSetting(ACTIVE_PROFILE_KEY, null); window.location.reload(); }}><LogOut size={13} />{t("logout")}</button></div></div>;
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { language, t } = useI18n();
  const { exporting, exportReport } = useReportExport();
  const [deleting, setDeleting] = useState(false);
  useEscape(onClose);
  const analysis = interpret(patient.result, t);
  const remove = async () => {
    if (!window.confirm(t("deleteOneConfirm"))) return;
    setDeleting(true);
    const ok = await deleteScan(patient);
    setDeleting(false);
    if (ok) { toast.success(t("deleted")); onClose(); } else toast.error(t("deleteFailed"));
  };
  return <div className="drawer-backdrop" onClick={onClose}><aside className="patient-drawer" role="dialog" aria-modal="true" aria-label={t("screeningDetail")} onClick={(e) => e.stopPropagation()}><div className="drawer-handle" /><div className="drawer-top"><span className="eyebrow">{t("screeningDetail")}</span><button className="icon-button" onClick={onClose} aria-label={t("close")}><X size={18} /></button></div><div className="drawer-profile"><FundusThumb variant={patient.thumb} image={patient.image} /><div><h2>{patient.name}</h2><span>{patient.id} · {scanWhen(patient, language, t)}{patient.age ? ` · ${t("ageYears").replace("{value}", patient.age)}` : ""}</span></div></div>{patient.image && <img className="drawer-image" src={patient.image} alt={t("uploadedPreview")} />}<div className={`drawer-status drawer-status--${patient.risk === "High risk" ? "high" : "normal"}`}><div><span className="eyebrow">{t("triage")}</span><strong>{analysis.hasResult ? analysis.statusTitle : patient.risk === "High risk" ? t("highRiskFilter") : t("normalFilter")}</strong>{analysis.hasResult && <p>{analysis.statusDetail}</p>}</div><RiskBadge risk={patient.risk} /></div><div className="drawer-section"><span className="eyebrow">{t("captureDetails")}</span><div className="detail-grid"><div><span>{t("eye")}</span><strong>{patient.eye} · {patient.eye === "OS" ? t("left") : t("right")}</strong></div><div><span>{t("confidence")}</span><strong>{patient.score}</strong></div><div><span>{t("latency")}</span><strong>{patient.latencyMs ? `${(patient.latencyMs / 1000).toFixed(1)} s` : "—"}</strong></div><div><span>{t("device")}</span><strong>visoScope 2.0</strong></div></div></div>{analysis.hasResult ? <div className="drawer-section"><MetricsCard result={patient.result} live={patient.source === "live"} /></div> : <p className="drawer-muted">{t("noDetailStored")}</p>}{patient.notes && <div className="drawer-section"><span className="eyebrow">{t("notesLabel")}</span><p className="drawer-notes">{patient.notes}</p></div>}<div className="drawer-section"><span className="eyebrow">{t("recommendation")}</span><div className="recommendation recommendation--drawer"><AppIcon tone="mint"><Stethoscope size={16} /></AppIcon><div><strong>{patient.risk === "High risk" ? t("followup") : t("routine")}</strong><p>{patient.risk === "High risk" ? t("reviewContext") : t("routineDetail")}</p></div></div></div><button className="button button--primary button--full" onClick={() => void exportReport(patient)} disabled={exporting}>{exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}{exporting ? t("exporting") : t("exportReport")}</button>{patient.source === "live" && <button className="button button--danger-ghost button--full" onClick={() => void remove()} disabled={deleting}><Trash2 size={15} />{t("deleteOne")}</button>}</aside></div>;
}

function HelpSheet({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const { t } = useI18n();
  useEscape(onClose);
  return <div className="drawer-backdrop" onClick={onClose}><aside className="patient-drawer help-sheet" role="dialog" aria-modal="true" aria-label={t("helpTitle")} onClick={(e) => e.stopPropagation()}><div className="drawer-handle" /><div className="drawer-top"><span className="eyebrow">VEYA AI · {t("help")}</span><button className="icon-button" onClick={onClose} aria-label={t("close")}><X size={18} /></button></div><h2 className="help-title">{t("helpTitle")}</h2><ol className="help-steps">{[1, 2, 3, 4].map((n) => <li key={n}><span>{n}</span><p>{t(`helpStep${n}`)}</p></li>)}</ol><div className="drawer-section"><span className="eyebrow">{t("helpSignalsTitle")}</span><p className="drawer-notes">{t("helpSignals")}</p><div className="signal-row"><span><i className="signal-dot signal-dot--amber" />{t("retinopathy")}</span><span><i className="signal-dot signal-dot--blue" />{t("glaucoma")}</span><span><i className="signal-dot signal-dot--violet" />{t("cataract")}</span></div></div><div className="help-warning"><ShieldCheck size={16} /><div><strong>{t("helpDisclaimerTitle")}</strong><p>{t("helpDisclaimer")}</p></div></div><button className="button button--primary button--full" onClick={() => { onClose(); onStart(); }}>{t("start")} <ArrowUpRight size={16} /></button><button className="button button--ghost button--full" onClick={onClose}>{t("close")}</button></aside></div>;
}

function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { language } = useI18n(); const current = activeProfile();
  const ru = language === "ru"; const kk = language === "kk";
  const text = { title: ru ? "Профиль" : kk ? "Профиль" : "Profile", name: ru ? "Имя врача" : kk ? "Дәрігер аты" : "Doctor name", hospital: ru ? "Больница или клиника" : kk ? "Аурухана немесе клиника" : "Hospital or clinic", email: "Email", save: ru ? "Сохранить изменения" : kk ? "Өзгерістерді сақтау" : "Save changes", logout: ru ? "Выйти из аккаунта" : kk ? "Аккаунттан шығу" : "Log out", saved: ru ? "Профиль сохранён" : kk ? "Профиль сақталды" : "Profile saved", hint: ru ? "Имя врача и клиника печатаются в PDF-отчётах." : kk ? "Дәрігер аты мен клиника PDF есептерде басылады." : "Your name and clinic are printed on PDF reports." };
  const [name, setName] = useState(current?.name || ""); const [hospital, setHospital] = useState(current?.hospital || "");
  const save = (event: React.FormEvent) => { event.preventDefault(); if (!current) return; const next = readProfiles().map((profile) => profile.id === current.id ? { ...profile, name: name.trim() || profile.name, hospital: hospital.trim() || profile.hospital } : profile); localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(next)); toast.success(text.saved); };
  return <div className="screen profile-screen"><header className="topbar"><div className="page-brand"><AppIcon tone="violet"><UserRound size={18} /></AppIcon><div><span className="eyebrow">VEYA AI</span><h1>{text.title}</h1></div></div></header><section className="profile-hero"><div className="profile-avatar">{profileInitials(name)}</div><h2>{name || "Doctor"}</h2><p>{hospital}</p></section><form className="profile-card" onSubmit={save}><label>{text.name}<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>{text.hospital}<input value={hospital} onChange={(event) => setHospital(event.target.value)} /></label><label>{text.email}<input value={current?.email || ""} disabled /></label><small className="profile-hint">{text.hint}</small><button className="button button--primary button--full" type="submit">{text.save}</button><button className="button button--ghost button--full" type="button" onClick={onLogout}><LogOut size={15} />{text.logout}</button></form></div>;
}

async function hashPassword(password: string) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`veya:${password}`));
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return password; // insecure context without WebCrypto: fall back to the old behaviour
  }
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (profile: Profile) => void }) {
  const { language, t } = useI18n();
  const ru = language === "ru"; const kk = language === "kk";
  const text = { title: ru ? "Вход в VEYA" : kk ? "VEYA жүйесіне кіру" : "Sign in to VEYA", subtitle: ru ? "Ваши скрининги будут сохранены в личном профиле." : kk ? "Скринингтеріңіз жеке профиліңізде сақталады." : "Your screenings are saved in your private profile.", login: ru ? "Войти" : kk ? "Кіру" : "Sign in", register: ru ? "Создать профиль" : kk ? "Профиль жасау" : "Create profile", name: ru ? "Имя врача" : kk ? "Дәрігер аты" : "Doctor name", hospital: ru ? "Клиника или больница" : kk ? "Клиника немесе аурухана" : "Clinic or hospital", email: "Email", password: ru ? "Пароль" : kk ? "Құпиясөз" : "Password", submit: ru ? "Продолжить" : kk ? "Жалғастыру" : "Continue", short: ru ? "Пароль должен быть не короче 6 символов." : kk ? "Құпиясөз кемінде 6 таңбадан тұруы керек." : "Password must be at least 6 characters." };
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
    if (profile.password !== hashed) localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users.map((user) => user.id === profile.id ? { ...user, password: hashed } : user))); // upgrade legacy plain-text password
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    onAuthenticated({ ...profile, password: hashed });
  };
  return <div className="auth-screen"><div className="language-floating"><LanguageSwitcher /></div><div className="auth-card"><div className="auth-brand">VEYA<span>AI</span></div><span className="eyebrow">{text.title}</span><h1>{registerMode ? text.register : text.title}</h1><p>{text.subtitle}</p><form onSubmit={(event) => void submit(event)}>{registerMode && <><label>{text.name}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label><label>{text.hospital}<input value={form.hospital} onChange={(event) => setForm({ ...form, hospital: event.target.value })} autoComplete="organization" /></label></>}<label>{text.email}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label><label>{text.password}<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={registerMode ? "new-password" : "current-password"} /></label>{error && <div className="auth-error">{error}</div>}<button className="button button--primary button--full" type="submit" disabled={busy}>{text.submit}</button></form><button className="button button--ghost button--full" onClick={() => { setRegisterMode(!registerMode); setError(""); }}>{registerMode ? text.login : text.register}</button><small>{t("demoAuthNote")}</small></div></div>;
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(() => activeProfile());
  const [language, setLanguage] = useState<Language>(() => { const saved = readSetting("veya_language"); return saved === "ru" || saved === "kk" || saved === "en" ? saved : "en"; });
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [drawerPatient, setDrawerPatient] = useState<Patient | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(() => readFlag(SHOW_DEMO_KEY, true));
  const [savedScans, setSavedScans] = useState<Patient[]>(() => readSavedScans());
  const [demo] = useState(demoPatients);
  const t = (key: string) => key === "profile" ? (language === "en" ? "Profile" : "Профиль") : uiTranslations[language][key] || clinicalTranslations[language][key] || resultTranslations[language][key] || workflowTranslations[language][key] || dashboardTranslations[language][key] || extraTranslations[language][key] || translations[language][key] || uiTranslations.en[key] || clinicalTranslations.en[key] || resultTranslations.en[key] || workflowTranslations.en[key] || dashboardTranslations.en[key] || extraTranslations.en[key] || translations.en[key] || key;

  useEffect(() => { const refresh = () => setSavedScans(readSavedScans()); refresh(); window.addEventListener("veya-history-updated", refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener("veya-history-updated", refresh); window.removeEventListener("storage", refresh); }; }, [profile?.id]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [activeTab]);

  const history = useMemo(() => [...savedScans, ...(showDemo ? demo : [])].sort((a, b) => (Date.parse(b.scannedAt || "") || 0) - (Date.parse(a.scannedAt || "") || 0)), [savedScans, showDemo, demo]);
  const navigate = (tab: TabKey) => setActiveTab(tab);
  const changeLanguage = (next: Language) => { setLanguage(next); writeSetting("veya_language", next); };
  const changeShowDemo = (value: boolean) => { setShowDemo(value); writeSetting(SHOW_DEMO_KEY, value ? "1" : "0"); };
  const logout = () => { writeSetting(ACTIVE_PROFILE_KEY, null); setProfile(null); setActiveTab("dashboard"); };
  const closeDrawer = () => setDrawerPatient(null);
  const closeHelp = () => setHelpOpen(false);

  if (!profile) return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}><AuthScreen onAuthenticated={setProfile} /></LanguageContext.Provider>;
  return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}><div className="app-shell"><div className="app-frame"><div className="language-floating"><LanguageSwitcher /></div><main className="app-main">{activeTab === "dashboard" && <Dashboard history={history} onStart={() => setActiveTab("analysis")} onTab={navigate} onSelect={setDrawerPatient} onHelp={() => setHelpOpen(true)} />}{activeTab === "analysis" && <Analysis onBack={() => setActiveTab("dashboard")} onOpenHistory={() => setActiveTab("history")} />}{activeTab === "history" && <HistoryScreen history={history} onSelect={setDrawerPatient} />}{activeTab === "settings" && <SettingsScreen onTab={navigate} onHelp={() => setHelpOpen(true)} showDemo={showDemo} onShowDemo={changeShowDemo} />}{activeTab === "profile" && <ProfileScreen key={profile.id} onLogout={logout} />}</main><nav className="bottom-bar" aria-label="Primary navigation">{tabs.map(({ key, icon: Icon }) => <button key={key} className={activeTab === key ? "is-active" : ""} aria-current={activeTab === key ? "page" : undefined} onClick={() => setActiveTab(key)}><span className="nav-icon"><Icon size={19} strokeWidth={activeTab === key ? 2.4 : 1.8} /></span><span>{t(key === "dashboard" ? "main" : key)}</span></button>)}</nav></div>{drawerPatient && <PatientDrawer patient={drawerPatient} onClose={closeDrawer} />}{helpOpen && <HelpSheet onClose={closeHelp} onStart={() => setActiveTab("analysis")} />}</div></LanguageContext.Provider>;
}
