import { createContext, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
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
  FileDown,
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
  Trash2,
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
type Language = "en" | "ru" | "kk";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (key: string) => string } | null>(null);
const translations: Record<Language, Record<string, string>> = {
  en: { main: "Main", analysis: "Analysis", history: "History", settings: "Settings", archive: "PATIENT ARCHIVE", total: "Total screenings", normal: "Normal results", followups: "Follow-ups", allScans: "ALL SAVED SCANS", screening: "screening", screenings: "screenings", search: "Search by name or patient ID", export: "Export history", manage: "Manage history", selected: "selected", demoProtected: "demo items cannot be deleted", delete: "Delete selected", deleting: "Deleting...", noFound: "No screenings found", tryAgain: "Try a different name or filter.", language: "Language", live: "Live", demo: "Demo", ophthalmic: "Ophthalmic screening", morning: "Good morning", workspaceReady: "Your screening workspace is ready.", clinical: "CLINICAL INTELLIGENCE", start: "Start new screening", viewHistory: "View history", newWorkflow: "NEW WORKFLOW", newScreening: "New screening", patient: "Patient", continue: "Continue", capture: "Capture", review: "Review", settingsTitle: "Settings", connected: "Connected", save: "Save", back: "Back", upload: "Upload image", run: "Run AI screening", analyzing: "Analyzing signal...", languageSaved: "Language is saved on this device" },
  ru: { main: "Главная", analysis: "Анализ", history: "История", settings: "Настройки", archive: "АРХИВ ПАЦИЕНТОВ", total: "Всего скринингов", normal: "Нормальные результаты", followups: "На контроле", allScans: "ВСЕ СОХРАНЁННЫЕ СКАНЫ", screening: "сканирование", screenings: "сканирований", search: "Поиск по имени или ID пациента", export: "Экспорт истории", manage: "Управление историей", selected: "выбрано", demoProtected: "демо-записи нельзя удалить", delete: "Удалить выбранные", deleting: "Удаление...", noFound: "Сканы не найдены", tryAgain: "Измените имя или фильтр.", language: "Язык", live: "Реальный", demo: "Демо", ophthalmic: "Офтальмологический скрининг", morning: "Доброе утро", workspaceReady: "Рабочее пространство готово к скринингу.", clinical: "КЛИНИЧЕСКИЙ ИНТЕЛЛЕКТ", start: "Начать скрининг", viewHistory: "Открыть историю", newWorkflow: "НОВЫЙ ПРОЦЕСС", newScreening: "Новый скрининг", patient: "Пациент", continue: "Продолжить", capture: "Снимок", review: "Проверка", settingsTitle: "Настройки", connected: "Подключено", save: "Сохранить", back: "Назад", upload: "Загрузить изображение", run: "Запустить AI-скрининг", analyzing: "Анализируем...", languageSaved: "Язык сохранён на этом устройстве" },
  kk: { main: "Басты бет", analysis: "Анализ", history: "Тарих", settings: "Баптаулар", archive: "ПАЦИЕНТТЕР МҰРАҒАТЫ", total: "Барлық скринингтер", normal: "Қалыпты нәтижелер", followups: "Бақылау қажет", allScans: "БАРЛЫҚ САҚТАЛҒАН СКАНДАР", screening: "скрининг", screenings: "скрининг", search: "Пациент аты немесе ID бойынша іздеу", export: "Тарихты экспорттау", manage: "Тарихты басқару", selected: "таңдалды", demoProtected: "демо жазбаларын жоюға болмайды", delete: "Таңдалғанды жою", deleting: "Жойылуда...", noFound: "Скан табылмады", tryAgain: "Басқа ат немесе сүзгі таңдаңыз.", language: "Тіл", live: "Нақты", demo: "Демо", ophthalmic: "Офтальмологиялық скрининг", morning: "Қайырлы таң", workspaceReady: "Скрининг жұмыс кеңістігі дайын.", clinical: "КЛИНИКАЛЫҚ ИНТЕЛЛЕКТ", start: "Скринингті бастау", viewHistory: "Тарихты ашу", newWorkflow: "ЖАҢА ПРОЦЕСС", newScreening: "Жаңа скрининг", patient: "Пациент", continue: "Жалғастыру", capture: "Түсірілім", review: "Тексеру", settingsTitle: "Баптаулар", connected: "Қосылған", save: "Сақтау", back: "Артқа", upload: "Суретті жүктеу", run: "AI скринингін іске қосу", analyzing: "Талдау орындалуда...", languageSaved: "Тіл осы құрылғыда сақталды" },
};
const extraTranslations: Record<Language, Record<string, string>> = {
  en: { workspace: "WORKSPACE", settingsTitle: "Settings", deviceStatus: "DEVICE STATUS", inSync: "Everything is in sync.", captureReady: "Capture service is paired and ready for your next scan.", aiBackend: "AI BACKEND", modelReady: "MODEL READY", endpoint: "API endpoint URL", endpointHelp: "Connect your FastAPI or PyTorch model when ready.", liveScreening: "Live AI screening", liveHelp: "Send fundus images to the configured inference service.", clinicProfile: "CLINIC PROFILE", edit: "Edit", captureSystem: "CAPTURE SYSTEM", calibrated: "Calibrated", optical: "Optical capture", standardField: "Standard retinal field", cameraCalibration: "Camera calibration", lastChecked: "Last checked today at 08:12", ready: "Ready", check: "Check", autoUpload: "Auto-upload after capture", autoUploadHelp: "Send captures directly to endpoint", historyStored: "Scan history is stored securely in this browser.", screeningDetail: "SCREENING DETAIL", triage: "TRIAGE STATUS", captureDetails: "CAPTURE DETAILS", eye: "Eye", left: "Left", right: "Right", confidence: "AI confidence", latency: "Latency", device: "Device", recommendation: "RECOMMENDATION", followup: "Refer for clinical follow-up", routine: "Routine annual screening", reviewContext: "Review the full clinical context before making a diagnosis.", stepPatient: "STEP 01 · PATIENT", patientName: "Patient name", patientId: "Patient ID / IIN", symptoms: "Symptoms or clinical notes", optional: "Optional", years: "Years", notePlaceholder: "Add a note for the screening report...", continueCapture: "Continue to capture", stepCapture: "STEP 02 · CAPTURE", leftEye: "Left eye", rightEye: "Right eye", dropImage: "Drop a fundus image here", imageReady: "Image ready for analysis", browseImage: "or tap to browse · JPG, PNG up to 10MB", bestResults: "For best results, use a centered image with the optic disc visible.", uploadImage: "Upload image", backPatient: "Back to patient details", stepReview: "STEP 03 · REVIEW", reviewHelp: "Review the capture before starting the AI analysis.", qualityGood: "Image quality good", replace: "Replace", modelInference: "Image will be sent to the configured FastAPI model endpoint.", runScreening: "Run AI screening", analyzing: "Analyzing signal...", backCapture: "Back to capture", exportReport: "Export PDF report", save: "Save" },
  ru: { workspace: "РАБОЧЕЕ ПРОСТРАНСТВО", settingsTitle: "Настройки", deviceStatus: "СТАТУС УСТРОЙСТВА", inSync: "Всё синхронизировано.", captureReady: "Система съёмки подключена и готова к следующему скринингу.", aiBackend: "AI-БЭКЕНД", modelReady: "МОДЕЛЬ ГОТОВА", endpoint: "URL API endpoint", endpointHelp: "Подключите FastAPI или PyTorch-модель.", liveScreening: "Живой AI-скрининг", liveHelp: "Отправлять снимки сетчатки в настроенный сервис анализа.", clinicProfile: "ПРОФИЛЬ КЛИНИКИ", edit: "Изменить", captureSystem: "СИСТЕМА СЪЁМКИ", calibrated: "Откалибровано", optical: "Оптическая съёмка", standardField: "Стандартное поле сетчатки", cameraCalibration: "Калибровка камеры", lastChecked: "Последняя проверка сегодня в 08:12", ready: "Готово", check: "Проверить", autoUpload: "Автозагрузка после съёмки", autoUploadHelp: "Отправлять снимки сразу в endpoint", historyStored: "История сканов безопасно хранится в браузере.", screeningDetail: "ДЕТАЛИ СКРИНИНГА", triage: "СТАТУС ТРИАЖА", captureDetails: "ДЕТАЛИ СНИМКА", eye: "Глаз", left: "Левый", right: "Правый", confidence: "Уверенность AI", latency: "Задержка", device: "Устройство", recommendation: "РЕКОМЕНДАЦИЯ", followup: "Направить на клиническое наблюдение", routine: "Плановый ежегодный скрининг", reviewContext: "Проверьте полный клинический контекст перед постановкой диагноза.", stepPatient: "ШАГ 01 · ПАЦИЕНТ", patientName: "Имя пациента", patientId: "ID пациента / ИИН", symptoms: "Симптомы или клинические заметки", optional: "Необязательно", years: "Лет", notePlaceholder: "Добавьте заметку к отчёту...", continueCapture: "Продолжить к снимку", stepCapture: "ШАГ 02 · СНИМОК", leftEye: "Левый глаз", rightEye: "Правый глаз", dropImage: "Перетащите снимок глазного дна", imageReady: "Изображение готово к анализу", browseImage: "или нажмите для выбора · JPG, PNG до 10 МБ", bestResults: "Для лучшего результата используйте центрированное изображение с видимым диском зрительного нерва.", uploadImage: "Загрузить снимок", backPatient: "Назад к данным пациента", stepReview: "ШАГ 03 · ПРОВЕРКА", reviewHelp: "Проверьте снимок перед запуском AI-анализа.", qualityGood: "Качество изображения хорошее", replace: "Заменить", modelInference: "Изображение будет отправлено на настроенный FastAPI endpoint.", runScreening: "Запустить AI-скрининг", analyzing: "Анализируем...", backCapture: "Назад к снимку", exportReport: "Экспорт PDF-отчёта", save: "Сохранить" },
  kk: { workspace: "ЖҰМЫС КЕҢІСТІГІ", settingsTitle: "Баптаулар", deviceStatus: "ҚҰРЫЛҒЫ КҮЙІ", inSync: "Барлығы синхрондалды.", captureReady: "Түсірілім жүйесі қосылған және келесі скринингке дайын.", aiBackend: "AI БЭКЕНДІ", modelReady: "МОДЕЛЬ ДАЙЫН", endpoint: "API endpoint URL", endpointHelp: "FastAPI немесе PyTorch моделін қосыңыз.", liveScreening: "Нақты AI скринингі", liveHelp: "Торлы қабық суреттерін талдау сервисіне жіберу.", clinicProfile: "КЛИНИКА ПРОФИЛІ", edit: "Өзгерту", captureSystem: "ТҮСІРІЛІМ ЖҮЙЕСІ", calibrated: "Калибрленген", optical: "Оптикалық түсірілім", standardField: "Торлы қабықтың стандартты өрісі", cameraCalibration: "Камера калибрлеуі", lastChecked: "Соңғы тексеріс бүгін 08:12-де", ready: "Дайын", check: "Тексеру", autoUpload: "Түсірілімнен кейін автоматты жүктеу", autoUploadHelp: "Суреттерді endpoint-ке бірден жіберу", historyStored: "Скан тарихы браузерде қауіпсіз сақталады.", screeningDetail: "СКРИНИНГ МӘЛІМЕТТЕРІ", triage: "ТРИАЖ МӘРТЕБЕСІ", captureDetails: "ТҮСІРІЛІМ МӘЛІМЕТТЕРІ", eye: "Көз", left: "Сол жақ", right: "Оң жақ", confidence: "AI сенімділігі", latency: "Кідіріс", device: "Құрылғы", recommendation: "ҰСЫНЫС", followup: "Клиникалық бақылауға жіберу", routine: "Жыл сайынғы жоспарлы скрининг", reviewContext: "Диагноз қоймас бұрын толық клиникалық контексті тексеріңіз.", stepPatient: "01-ҚАДАМ · ПАЦИЕНТ", patientName: "Пациент аты", patientId: "Пациент ID / ЖСН", symptoms: "Симптомдар немесе клиникалық жазбалар", optional: "Міндетті емес", years: "Жыл", notePlaceholder: "Скрининг есебіне жазба қосыңыз...", continueCapture: "Түсірілімге өту", stepCapture: "02-ҚАДАМ · ТҮСІРІЛІМ", leftEye: "Сол көз", rightEye: "Оң көз", dropImage: "Көз түбінің суретін осы жерге апарыңыз", imageReady: "Сурет талдауға дайын", browseImage: "немесе таңдау үшін басыңыз · JPG, PNG 10 МБ дейін", bestResults: "Жақсы нәтиже үшін көру жүйкесі дискісі көрінетін орталықтанған суретті пайдаланыңыз.", uploadImage: "Суретті жүктеу", backPatient: "Пациент мәліметтеріне оралу", stepReview: "03-ҚАДАМ · ТЕКСЕРУ", reviewHelp: "AI талдауын бастамас бұрын суретті тексеріңіз.", qualityGood: "Сурет сапасы жақсы", replace: "Ауыстыру", modelInference: "Сурет бапталған FastAPI моделіне жіберіледі.", runScreening: "AI скринингін іске қосу", analyzing: "Талдау орындалуда...", backCapture: "Түсірілімге оралу", exportReport: "PDF есебін экспорттау", save: "Сақтау" },
};
const resultTranslations: Record<Language, Record<string, string>> = {
  en: { screeningComplete: "SCREENING COMPLETE", clinicalSignal: "Review the|clinical signal.", inferenceDone: "Real model inference completed.", triage: "TRIAGE STATUS", noResult: "No result", signalBreakdown: "SIGNAL BREAKDOWN", modelResults: "AI Model Results", liveModel: "LIVE MODEL", rawResponse: "Raw AI Response (JSON)", clinicalAction: "CLINICAL ACTION", referDilated: "Refer for dilated eye examination", confirmFollowup: "Consider confirming with a clinical exam and documenting patient follow-up.", exportReport: "Export PDF report", another: "Start another screening", allFilter: "All", highRiskFilter: "High risk", normalFilter: "Normal", negative: "Negative", positive: "POSITIVE" },
  ru: { screeningComplete: "СКРИНИНГ ЗАВЕРШЁН", clinicalSignal: "Проверьте|клинический сигнал.", inferenceDone: "Работа реальной модели завершена.", triage: "СТАТУС ТРИАЖА", noResult: "Нет результата", signalBreakdown: "РАЗБОР СИГНАЛОВ", modelResults: "Результаты AI-модели", liveModel: "ЖИВАЯ МОДЕЛЬ", rawResponse: "Сырой ответ AI (JSON)", clinicalAction: "КЛИНИЧЕСКОЕ ДЕЙСТВИЕ", referDilated: "Направить на расширенное обследование", confirmFollowup: "Результат следует подтвердить клиническим осмотром и зафиксировать наблюдение.", exportReport: "Экспорт PDF-отчёта", another: "Начать новый скрининг", allFilter: "Все", highRiskFilter: "Высокий риск", normalFilter: "Норма", negative: "Отрицательно", positive: "ПОЛОЖИТЕЛЬНО" },
  kk: { screeningComplete: "СКРИНИНГ АЯҚТАЛДЫ", clinicalSignal: "Клиникалық|сигналды тексеріңіз.", inferenceDone: "Нақты модель талдауы аяқталды.", triage: "ТРИАЖ МӘРТЕБЕСІ", noResult: "Нәтиже жоқ", signalBreakdown: "СИГНАЛ ТАЛДАУЫ", modelResults: "AI моделінің нәтижелері", liveModel: "НАҒЫЗ МОДЕЛЬ", rawResponse: "AI жауабы (JSON)", clinicalAction: "КЛИНИКАЛЫҚ ӘРЕКЕТ", referDilated: "Кеңейтілген тексеруге жіберу", confirmFollowup: "Нәтижені клиникалық тексерумен растау және бақылауды тіркеу қажет.", exportReport: "PDF есебін экспорттау", another: "Жаңа скрининг бастау", allFilter: "Барлығы", highRiskFilter: "Жоғары қауіп", normalFilter: "Қалыпты", negative: "Теріс", positive: "ОҢ НӘТИЖЕ" },
};
const clinicalTranslations: Record<Language, Record<string, string>> = {
  en: { readySignal: "Ready for|the signal.", noDr: "Eyes healthy, all clear", healthyRetina: "Eye healthy, retina normal (confidence {confidence}%)", drName: "Diabetic retinopathy", drProbability: "{value}% disease probability (Detected: Grade {grade})", grade: "Grade", glaucomaName: "Glaucoma", cataractName: "Cataract", probability: "{value}% probability", diseasePositive: "POSITIVE", diseaseNegative: "Negative", patientInference: "Real model inference completed.", fundusImage: "FUNDUS IMAGE", uploadedPreview: "Uploaded fundus preview", inferenceTitle: "VEYA AI inference", gradeMild: "Grade {grade}: mild changes, monitoring recommended.", gradeModerate: "Grade {grade}: moderate changes, follow-up recommended.", gradeSevere: "Grade {grade}: severe changes, urgent referral recommended." },
  ru: { readySignal: "Готовы к|анализу.", noDr: "Глаза здоровы, всё в порядке", healthyRetina: "Глаз здоров, сетчатка в норме (уверенность {confidence}%)", drName: "Диабетическая ретинопатия", drProbability: "Вероятность заболевания {value}% (степень: {grade})", grade: "Степень", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Вероятность {value}%", diseasePositive: "ПОЛОЖИТЕЛЬНО", diseaseNegative: "Отрицательно", patientInference: "Работа реальной модели завершена.", fundusImage: "СНИМОК ГЛАЗНОГО ДНА", uploadedPreview: "Предпросмотр снимка", inferenceTitle: "AI-анализ VEYA", gradeMild: "Степень {grade}: лёгкие изменения, рекомендуется наблюдение.", gradeModerate: "Степень {grade}: умеренные изменения, рекомендуется контроль.", gradeSevere: "Степень {grade}: выраженные изменения, требуется срочное направление." },
  kk: { readySignal: "Сигнал|дайын.", noDr: "Көз сау, бәрі жақсы", healthyRetina: "Көз сау, торлы қабық қалыпты (сенімділік {confidence}%)", drName: "Диабеттік ретинопатия", drProbability: "Ауру ықтималдығы {value}% (дәрежесі: {grade})", grade: "Дәреже", glaucomaName: "Глаукома", cataractName: "Катаракта", probability: "Ықтималдық {value}%", diseasePositive: "ОҢ НӘТИЖЕ", diseaseNegative: "Теріс", patientInference: "Нақты модель талдауы аяқталды.", fundusImage: "КӨЗ ТҮБІНІҢ СУРЕТІ", uploadedPreview: "Сурет алдын ала көрінісі", inferenceTitle: "VEYA AI талдауы", gradeMild: "{grade}-дәреже: жеңіл өзгерістер, бақылау қажет.", gradeModerate: "{grade}-дәреже: орташа өзгерістер, қайта тексеру қажет.", gradeSevere: "{grade}-дәреже: ауыр өзгерістер, шұғыл жолдау қажет." },
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
};

type ModelResult = {
  result?: {
    dr_grade?: { class: number; confidence: number; probabilities?: number[] };
    glaucoma?: { probability: number; positive: boolean };
    cataract?: { probability: number; positive: boolean };
  };
};

const HISTORY_STORAGE_KEY = "veya_scan_history";
const SUPABASE_REST_URL = "https://cspuysyofmesmyjrcond.supabase.co/rest/v1/scans";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v7TzPvCO-Z8bn3ePOnm0UA_ZFb3f1mh";

function readSavedScans(): Patient[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveScan(scan: Patient) {
  const next = [scan, ...readSavedScans().filter((item) => item.id !== scan.id)].slice(0, 100);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("veya-history-updated"));
}

function fromApiScan(item: Record<string, unknown>): Patient {
  const scannedAt = new Date(String(item.scanned_at || Date.now()));
  return {
    recordId: String(item.id || ""),
    name: String(item.patient_name || "Unnamed patient"),
    id: String(item.patient_id || "—"),
    date: scannedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: scannedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    risk: item.risk === "High risk" ? "High risk" : "Normal",
    score: String(item.score || "0%"),
    eye: item.eye === "OD" ? "OD" : "OS",
    initials: String(item.initials || "UP"),
    thumb: String(item.thumb || "fundus-coral"),
    source: "live",
  };
}

async function syncScans(): Promise<Patient[] | null> {
  try {
    const response = await fetch("/api/scans?limit=100");
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;
    const scans = data.map((item) => fromApiScan(item));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(scans));
    window.dispatchEvent(new Event("veya-history-updated"));
    return scans;
  } catch {
    return null;
  }
}

async function persistScan(scan: Patient) {
  saveScan(scan);
  try {
    const response = await fetch("/api/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scan) });
    if (response.ok) await syncScans();
  } catch {
    // Keep the local fallback when the API is unavailable.
  }
}

async function deleteScan(scan: Patient): Promise<boolean> {
  if (scan.source !== "live") return false;
  const localKey = scan.recordId || scan.id;
  try {
    if (scan.recordId) {
      const response = await fetch(`/api/scans?id=${encodeURIComponent(scan.recordId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("API delete failed");
    } else {
      const response = await fetch(`${SUPABASE_REST_URL}?patient_id=eq.${encodeURIComponent(scan.id)}`, { method: "DELETE", headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } });
      if (!response.ok) throw new Error("Supabase delete failed");
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(readSavedScans().filter((item) => (item.recordId || item.id) !== localKey && item.id !== scan.id)));
    window.dispatchEvent(new Event("veya-history-updated"));
    return true;
  } catch {
    if (!scan.recordId) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(readSavedScans().filter((item) => item.id !== scan.id)));
      window.dispatchEvent(new Event("veya-history-updated"));
      return true;
    }
    try {
      const response = await fetch(`${SUPABASE_REST_URL}?id=eq.${encodeURIComponent(scan.recordId)}`, { method: "DELETE", headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } });
      if (!response.ok) return false;
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(readSavedScans().filter((item) => item.recordId !== scan.recordId)));
      window.dispatchEvent(new Event("veya-history-updated"));
      return true;
    } catch {
      return false;
    }
  }
}

function exportScansCsv(scans: Patient[]) {
  const rows = [["Patient", "Patient ID", "Date", "Time", "Eye", "Risk", "Score", "Source"], ...scans.map((scan) => [scan.name, scan.id, scan.date, scan.time, scan.eye, scan.risk, scan.score, scan.source === "live" ? "Live" : "Demo"])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `veya-scan-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const tabs: { key: TabKey; label: string; icon: typeof Menu }[] = [
  { key: "dashboard", label: "Main", icon: Menu },
  { key: "analysis", label: "Analysis", icon: Eye },
  { key: "history", label: "History", icon: History },
  { key: "settings", label: "Settings", icon: Settings2 },
];

const patients: Patient[] = [
  { name: "Aigerim Sadykova", id: "VE-24081", date: "Today", time: "09:42", risk: "High risk", score: "78%", eye: "OD", initials: "AS", thumb: "fundus-amber", source: "demo" },
  { name: "Timur Bekov", id: "VE-24079", date: "Today", time: "08:56", risk: "Normal", score: "94%", eye: "OS", initials: "TB", thumb: "fundus-coral", source: "demo" },
  { name: "Madina Omarova", id: "VE-24076", date: "Yesterday", time: "16:20", risk: "Normal", score: "89%", eye: "OD", initials: "MO", thumb: "fundus-violet", source: "demo" },
  { name: "Rustam Ilyasov", id: "VE-24072", date: "Yesterday", time: "11:08", risk: "High risk", score: "67%", eye: "OS", initials: "RI", thumb: "fundus-blue", source: "demo" },
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
  const { t } = useI18n();
  return <span className={`risk-badge risk-badge--${risk === "High risk" ? "high" : "normal"}`}><span />{risk === "High risk" ? t("highRiskFilter") : t("normalFilter")}</span>;
}
function formatToday(language: Language) {
  const locale = language === "kk" ? "kk-KZ" : language === "ru" ? "ru-RU" : "en-US";
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}
function Dashboard({ onStart, onTab }: { onStart: () => void; onTab: (tab: TabKey) => void }) {
  const { language, t } = useI18n();
  return (
    <div className="screen screen--dashboard">
      <header className="topbar">
        <div className="brand-lockup"><LogoMark /><div><div className="brand-name">VEYA<span>AI</span></div><div className="brand-kicker">{t("ophthalmic")}</div></div></div>
        <button className="avatar-button" aria-label="Open clinician profile"><span>DR</span><span className="avatar-status" /></button>
      </header>

      <section className="welcome-row">
        <div><p className="date-line"><SunMedium size={14} /> {formatToday(language)}</p><h1>{t("morning")}, <em>Dr. Aida.</em></h1><p className="welcome-detail">{t("workspaceReady")}</p></div>
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
        <StatCard icon={<Activity size={17} />} tone="mint" value="24" label={t("screeningsToday")} detail={t("fromYesterday")} trend="+33%" />
        <StatCard icon={<AlertCircle size={17} />} tone="coral" value="3" label={t("highRiskDetected")} detail={t("needsFollowup")} />
        <StatCard icon={<Gauge size={17} />} tone="violet" value="28.4s" label={t("avgLatency")} detail={t("last30")} />
      </section>

      <section className="tech-card"><div className="tech-card__icon"><Target size={20} /></div><div className="tech-card__body"><span className="eyebrow">{t("whatSees")}</span><h3>{t("signalsDecision")}</h3><p>{t("signalsDescription")}</p><div className="signal-row"><span><i className="signal-dot signal-dot--amber" />{t("retinopathy")}</span><span><i className="signal-dot signal-dot--blue" />{t("glaucoma")}</span><span><i className="signal-dot signal-dot--violet" />{t("cataract")}</span></div></div><ChevronRight className="tech-card__arrow" size={18} /></section>

      <div className="section-title-row section-title-row--recent"><div><span className="eyebrow">{t("recentActivity")}</span><h2>{t("latestScreenings")}</h2></div><button className="icon-button" onClick={() => onTab("history")} aria-label={t("viewHistory")}><MoreHorizontal size={19} /></button></div>
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
  const { t } = useI18n();
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
      const responseData = await response.json() as ModelResult;
      setModelResult(responseData);
      const inference = responseData.result;
      const highRisk = (inference?.dr_grade?.class ?? 0) >= 1 || Boolean(inference?.glaucoma?.positive) || Boolean(inference?.cataract?.positive);
      const probabilities = inference?.dr_grade?.probabilities ?? [];
      const confidence = Math.round(((inference?.dr_grade?.confidence ?? Math.max(...probabilities, 0)) * 100));
      const now = new Date();
      await persistScan({
        name: form.name.trim() || "Unnamed patient",
        id: form.id.trim() || `VE-${now.getTime().toString().slice(-5)}`,
        date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        risk: highRisk ? "High risk" : "Normal",
        score: `${Math.min(100, Math.max(0, confidence || (highRisk ? 72 : 94)))}%`,
        eye,
        initials: (form.name.trim() || "UP").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        thumb: highRisk ? "fundus-amber" : "fundus-coral",
        source: "live",
      });
      setStep(4);
    } catch (error) {
      setScanError(error instanceof Error ? `${error.message}. Проверьте API endpoint в Settings.` : "Inference failed. Проверьте API endpoint в Settings.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="screen screen--analysis">
      <header className="subpage-header"><button className="icon-button" onClick={onBack} aria-label={t("back")}><ArrowLeft size={19} /></button><div><span className="eyebrow">{t("newWorkflow")}</span><h1>{t("newScreening")}</h1></div><span className="step-counter">0{Math.min(step, 4)} <span>/ 04</span></span></header>
      <div className="progress-track"><span style={{ width: `${step * 25}%` }} /></div>

      {step === 1 && <section className="flow-section flow-section--intro"><div className="flow-icon"><Stethoscope size={25} /></div><span className="eyebrow">{t("stepPatient")}</span><h2>{t("essentials").split("|").map((part, index) => <span key={part}>{index > 0 && <br />}{index === 1 ? <em>{part}</em> : part}</span>)}</h2><p className="flow-lead">{t("context")}</p><div className="form-stack"><label>{t("patientName")}<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aigerim Sadykova" /></label><div className="form-row"><label>{t("age")}<input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder={t("years")} /></label><label>{t("patientId")}<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="VE-00000" /></label></div><label>{t("symptoms")} <span className="optional">{t("optional")}</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notePlaceholder")} rows={3} /></label></div><button className="button button--primary button--full" onClick={() => setStep(2)}>{t("continueCapture")} <ChevronRight size={17} /></button></section>}

      {step === 2 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">{t("stepCapture")}</span><h2>{t("captureFundus").split("|").map((part, index) => <span key={part}>{index > 0 && <br />}{index === 1 ? <em>{part}</em> : part}</span>)}</h2></div><AppIcon tone="blue"><Camera size={19} /></AppIcon></div><p className="flow-lead">{t("captureHelp")}</p><div className="eye-toggle"><button className={eye === "OS" ? "is-active" : ""} onClick={() => setEye("OS")}><span>{t("leftEye")}</span><b>OS</b></button><button className={eye === "OD" ? "is-active" : ""} onClick={() => setEye("OD")}><span>{t("rightEye")}</span><b>OD</b></button></div><div className={`capture-zone${dragActive ? " is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={() => fileInput.current?.click()}><input ref={fileInput} type="file" accept="image/*" onChange={onInput} hidden /><div className="viewfinder"><span className="viewfinder__crosshair" /><span className="viewfinder__arc viewfinder__arc--one" /><span className="viewfinder__arc viewfinder__arc--two" /><Eye size={23} /></div><strong>{fileName || t("dropImage")}</strong><span>{fileName ? t("imageReady") : t("browseImage")}</span></div><div className="capture-tip"><Info size={15} /><span>{t("bestResults")}</span></div><button className="button button--primary button--full" onClick={() => fileName ? setStep(3) : fileInput.current?.click()}>{fileName ? t("reviewImage") : t("uploadImage")} <CloudUpload size={17} /></button><button className="button button--ghost button--full" onClick={() => setStep(1)}>{t("backPatient")}</button></section>}

      {step === 3 && <section className="flow-section"><div className="flow-section__top"><div><span className="eyebrow">{t("stepReview")}</span><h2>{t("readySignal").split("|").map((part, index) => <span key={part}>{index > 0 && <br />}{index === 1 ? <em>{part}</em> : part}</span>)}</h2></div><AppIcon tone="violet"><Sparkles size={18} /></AppIcon></div><p className="flow-lead">{t("reviewHelp")}</p><div className="scan-preview">{fileUrl ? <img src={fileUrl} alt={t("uploadedPreview")} /> : <FundusThumb variant="fundus-amber" />}<div className="scan-preview__overlay"><span className="scan-eye-label">{eye} · {t("fundusImage")}</span><span className="scan-quality"><Check size={13} /> {t("qualityGood")}</span></div></div><div className="review-meta"><span><FileText size={15} />{fileName || "Demo fundus sample.jpg"}</span><button onClick={() => setStep(2)}><RotateCcw size={14} />{t("replace")}</button></div><div className="model-note"><span className="mini-live" /><div><strong>{t("inferenceTitle")}</strong><span>{t("modelInference")}</span></div></div>{scanError && <div className="capture-tip capture-tip--error"><AlertCircle size={15} /><span>{scanError}</span></div>}<button className="button button--primary button--full" onClick={beginScan} disabled={scanning}>{scanning ? t("analyzing") : t("runScreening")} {scanning ? <Activity size={17} className="spin" /> : <ArrowUpRight size={17} />}</button><button className="button button--ghost button--full" onClick={() => setStep(2)}>{t("backCapture")}</button></section>}

      {step === 4 && <Results modelResult={modelResult} onRestart={() => { setStep(1); setFileName(""); setFileUrl(""); setModelResult(null); }} patientName={form.name || "Patient"} eye={eye} />}
    </div>
  );
}

function Results({ onRestart, patientName, eye, modelResult }: { onRestart: () => void; patientName: string; eye: string; modelResult: ModelResult | null }) {
  const { t } = useI18n();
  const result = modelResult?.result;

  // Calculate DR probability as sum of Grade 1-4 (actual disease presence)
  const drProbabilities = result?.dr_grade?.probabilities || [1, 0, 0, 0, 0];
  const drDiseaseProb = drProbabilities.slice(1).reduce((sum, p) => sum + p, 0); // Sum of grades 1-4
  const drValue = Math.round(drDiseaseProb * 100);

  const glaucomaValue = Math.round((result?.glaucoma?.probability ?? 0) * 100);
  const cataractValue = Math.round((result?.cataract?.probability ?? 0) * 100);
  const highRisk = (result?.dr_grade?.class ?? 0) >= 1 || Boolean(result?.glaucoma?.positive) || Boolean(result?.cataract?.positive);

  // Detailed status message
  let statusTitle = t("noDr");
  let statusDetail = t("healthyRetina").replace("{grade}", "0").replace("{confidence}", "100");
  const detectedConditions = [];

  if (result?.dr_grade) {
    const grade = result.dr_grade.class;
    if (grade === 0) {
      statusTitle = t("noDr");
      statusDetail = t("healthyRetina").replace("{grade}", String(grade)).replace("{confidence}", String(Math.round((drProbabilities[0] ?? 0) * 100)));
    } else if (grade === 1) {
      statusTitle = "Mild DR detected";
      statusDetail = t("gradeMild").replace("{grade}", String(grade));
      detectedConditions.push("DR Grade 1");
    } else if (grade === 2) {
      statusTitle = "Moderate DR detected";
      statusDetail = t("gradeModerate").replace("{grade}", String(grade));
      detectedConditions.push("DR Grade 2");
    } else if (grade >= 3) {
      statusTitle = "Severe DR detected";
      statusDetail = t("gradeSevere").replace("{grade}", String(grade));
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
      label: t("drName"),
      value: drValue,
      tone: "amber",
      note: result?.dr_grade ? t("drProbability").replace("{value}", String(drValue)).replace("{grade}", String(result.dr_grade.class)) : t("noResult"),
      detail: drProbs
    },
    {
      label: t("glaucomaName"),
      value: glaucomaValue,
      tone: "blue",
      note: result?.glaucoma ? `${t("probability").replace("{value}", String(glaucomaValue))} - ${result.glaucoma.positive ? t("positive") : t("negative")}` : t("noResult"),
      detail: null
    },
    {
      label: t("cataractName"),
      value: cataractValue,
      tone: "violet",
      note: result?.cataract ? `${t("probability").replace("{value}", String(cataractValue))} - ${result.cataract.positive ? t("positive") : t("negative")}` : t("noResult"),
      detail: null
    }
  ];

  return <section className="flow-section results-section"><div className="result-head"><div className="result-check"><Check size={24} /></div><span className="eyebrow">{t("screeningComplete")} · {eye}</span><h2>{t("clinicalSignal").split("|").map((part, index) => <span key={part}>{index > 0 && <br />}{index === 1 ? <em>{part}</em> : part}</span>)}</h2><p className="flow-lead">{patientName} · {t("inferenceDone")}</p></div><div className={`result-banner ${highRisk ? "result-banner--high" : "result-banner--normal"}`}><div><span className="eyebrow">{t("triage")}</span><strong>{statusTitle}</strong><p>{statusDetail}</p></div>{highRisk ? <AlertCircle size={28} /> : <Check size={28} />}</div><div className="metrics-card"><div className="card-title-row"><div><span className="eyebrow">{t("signalBreakdown")}</span><h3>{t("modelResults")}</h3></div><span className="demo-tag">{t("liveModel")}</span></div>{metrics.map((metric) => <div className="metric-bar" key={metric.label}><div><span>{metric.label}</span><strong>{metric.value}%</strong></div><div className="metric-track"><span className={`metric-fill metric-fill--${metric.tone}`} style={{ width: `${metric.value}%` }} /></div><small>{metric.note}</small>{metric.detail && <small style={{display:'block',marginTop:'4px',opacity:0.7,fontSize:'11px'}}>{metric.detail}</small>}</div>)}<details style={{marginTop:'16px',padding:'12px',background:'rgba(0,0,0,0.02)',borderRadius:'8px',fontSize:'12px'}}><summary style={{cursor:'pointer',fontWeight:600,marginBottom:'8px'}}>{t("rawResponse")}</summary><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',fontSize:'11px',lineHeight:1.4}}>{JSON.stringify(result, null, 2)}</pre></details></div><div className="recommendation"><AppIcon tone="mint"><Stethoscope size={17} /></AppIcon><div><span className="eyebrow">{t("clinicalAction")}</span><strong>{t("referDilated")}</strong><p>{t("confirmFollowup")}</p></div></div><button className="button button--primary button--full"><Download size={17} />{t("exportReport")}</button><button className="button button--guest button--full" onClick={onRestart}>{t("another")}</button></section>;
}

function HistoryScreen({ onSelect }: { onSelect: (patient: Patient) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<RiskFilter>("All");
  const [query, setQuery] = useState("");
  const [savedScans, setSavedScans] = useState<Patient[]>(readSavedScans);
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useMemo(() => [...savedScans, ...patients], [savedScans]);
  const filtered = useMemo(() => history.filter((patient) => (filter === "All" || patient.risk === filter) && `${patient.name} ${patient.id}`.toLowerCase().includes(query.toLowerCase())), [filter, history, query]);
  const filterLabel = (item: RiskFilter) => item === "All" ? t("allFilter") : item === "High risk" ? t("highRiskFilter") : t("normalFilter");
  const normalCount = history.filter((patient) => patient.risk === "Normal").length;
  const highRiskCount = history.filter((patient) => patient.risk === "High risk").length;
  const selectedScans = filtered.filter((patient) => selectedIds.includes(patient.recordId || patient.id));
  const toggleSelected = (patient: Patient) => { const key = patient.recordId || patient.id; setSelectedIds((ids) => ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key]); };
  const removeSelected = async () => { if (!selectedScans.length || !window.confirm(`Delete ${selectedScans.length} selected scan${selectedScans.length === 1 ? "" : "s"}?`)) return; setBusy(true); for (const scan of selectedScans) await deleteScan(scan); setSelectedIds([]); setBusy(false); };
  useEffect(() => { const refresh = () => setSavedScans(readSavedScans()); window.addEventListener("veya-history-updated", refresh); void syncScans().then((scans) => { if (scans) setSavedScans(scans); }); return () => window.removeEventListener("veya-history-updated", refresh); }, []);
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="mint"><History size={18} /></AppIcon><div><span className="eyebrow">{t("archive")}</span><h1>{t("history")}</h1></div></div><div className="history-actions"><button className="icon-button" onClick={() => exportScansCsv(history)} aria-label={t("export")}><FileDown size={18} /></button><button className={`icon-button${manageMode ? " is-active" : ""}`} onClick={() => { setManageMode(!manageMode); setSelectedIds([]); }} aria-label={t("manage")}><SlidersHorizontal size={17} /></button></div></header><div className="history-summary"><div><strong>{history.length}</strong><span>{t("total")}</span></div><div><strong>{history.length ? Math.round((normalCount / history.length) * 100) : 0}%</strong><span>{t("normal")}</span></div><div><strong>{highRiskCount}</strong><span>{t("followups")}</span></div></div><div className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />{query && <button onClick={() => setQuery("")}><X size={15} /></button>}</div><div className="filter-row">{(["All", "High risk", "Normal"] as RiskFilter[]).map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{filterLabel(item)}{item !== "All" && <span>{history.filter((patient) => patient.risk === item).length}</span>}</button>)}</div>{manageMode && <div className="history-manage-bar"><span>{selectedScans.length} {t("selected")} · {t("demoProtected")}</span><button className="text-button" disabled={!selectedScans.length || busy} onClick={removeSelected}><Trash2 size={14} />{busy ? t("deleting") : t("delete")}</button></div>}<div className="section-title-row section-title-row--history"><div><span className="eyebrow">{t("allScans")}</span><h2>{filtered.length} {filtered.length === 1 ? t("screening") : t("screenings")}</h2></div></div><div className="screening-list">{filtered.length ? filtered.map((patient) => <div className="history-item" key={`${patient.source}-${patient.recordId || patient.id}`}>{manageMode && <input type="checkbox" checked={selectedIds.includes(patient.recordId || patient.id)} onChange={() => toggleSelected(patient)} aria-label={`Select ${patient.name}`} />}<PatientRow patient={patient} onClick={() => manageMode ? toggleSelected(patient) : onSelect(patient)} /></div>) : <div className="empty-state"><Search size={20} /><strong>{t("noFound")}</strong><span>{t("tryAgain")}</span></div>}</div></div>;
}

function SettingsScreen() {
  const { t } = useI18n();
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("veya_api_endpoint") || import.meta.env.VITE_INFERENCE_API_URL || "http://localhost:8000/predict");
  const [saved, setSaved] = useState(true);
  const [calibrated, setCalibrated] = useState(true);
  const [autoUpload, setAutoUpload] = useState(false);
  return <div className="screen"><header className="topbar"><div className="page-brand"><AppIcon tone="violet"><Settings2 size={18} /></AppIcon><div><span className="eyebrow">{t("workspace")}</span><h1>{t("settingsTitle")}</h1></div></div><button className="icon-button"><CircleHelp size={18} /></button></header><section className="settings-hero"><div className="settings-hero__orb"><PlugZap size={21} /></div><div><span className="eyebrow">{t("deviceStatus")}</span><h2>{t("inSync")}</h2><p>{t("captureReady")}</p></div><StatusPill compact /></section><div className="settings-group"><div className="group-label"><span>{t("aiBackend")}</span><span className="demo-tag">{t("modelReady")}</span></div><div className="settings-card"><label className="setting-field"><span>{t("endpoint")}</span><div className="setting-input"><Wifi size={15} /><input value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setSaved(false); }} onBlur={() => { localStorage.setItem("veya_api_endpoint", endpoint); setSaved(true); }} /></div><small>{t("endpointHelp")}</small></label><div className="setting-row"><div><strong>{t("liveScreening")}</strong><span>{t("liveHelp")}</span></div><span className="switch switch--on"><i /></span></div></div></div><div className="settings-group"><div className="group-label"><span>{t("clinicProfile")}</span><button className="text-button">{t("edit")} <ArrowUpRight size={14} /></button></div><div className="settings-card settings-card--profile"><div className="clinic-avatar">BG</div><div><strong>BIO&GEN Clinic</strong><span>Almaty, Kazakhstan</span></div><ChevronRight size={17} /></div></div><div className="settings-group"><div className="group-label"><span>{t("captureSystem")}</span><span className="calibration-status"><Check size={12} /> {t("calibrated")}</span></div><div className="settings-card"><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="blue"><Camera size={16} /></AppIcon><div><strong>{t("optical")}</strong><span>{t("standardField")}</span></div></div><ChevronRight size={16} /></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="mint"><Target size={16} /></AppIcon><div><strong>{t("cameraCalibration")}</strong><span>{t("lastChecked")}</span></div></div><button className={`toggle-button${calibrated ? " is-active" : ""}`} onClick={() => setCalibrated(!calibrated)}>{calibrated ? t("ready") : t("check")}</button></div><div className="setting-row"><div className="setting-with-icon"><AppIcon tone="amber"><CloudUpload size={16} /></AppIcon><div><strong>{t("autoUpload")}</strong><span>{t("autoUploadHelp")}</span></div></div><button className={`toggle-switch${autoUpload ? " is-active" : ""}`} onClick={() => setAutoUpload(!autoUpload)} aria-label={t("autoUpload")}><i /></button></div></div></div><div className="settings-footer"><ShieldCheck size={15} /> {t("historyStored")}</div>{!saved && <span className="save-toast"><Check size={14} />{t("save")}</span>}</div>;
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { t } = useI18n();
  return <div className="drawer-backdrop" onClick={onClose}><aside className="patient-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-handle" /><div className="drawer-top"><span className="eyebrow">{t("screeningDetail")}</span><button className="icon-button" onClick={onClose} aria-label={t("back")}><X size={18} /></button></div><div className="drawer-profile"><FundusThumb variant={patient.thumb} /><div><h2>{patient.name}</h2><span>{patient.id} · {patient.date}, {patient.time}</span></div></div><div className="drawer-status"><div><span className="eyebrow">{t("triage")}</span><strong>{patient.risk === "High risk" ? t("highRiskFilter") : t("normalFilter")}</strong></div><RiskBadge risk={patient.risk} /></div><div className="drawer-section"><span className="eyebrow">{t("captureDetails")}</span><div className="detail-grid"><div><span>{t("eye")}</span><strong>{patient.eye} · {patient.eye === "OS" ? t("left") : t("right")}</strong></div><div><span>{t("confidence")}</span><strong>{patient.score}</strong></div><div><span>{t("latency")}</span><strong>28.4 sec</strong></div><div><span>{t("device")}</span><strong>visoScope 2.0</strong></div></div></div><div className="drawer-section"><span className="eyebrow">{t("recommendation")}</span><div className="recommendation recommendation--drawer"><AppIcon tone="mint"><Stethoscope size={16} /></AppIcon><div><strong>{patient.risk === "High risk" ? t("followup") : t("routine")}</strong><p>{t("reviewContext")}</p></div></div></div><button className="button button--primary button--full"><Download size={16} />{t("exportReport")}</button></aside></div>;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("veya_language") as Language) || "en");
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [drawerPatient, setDrawerPatient] = useState<Patient | null>(null);
  const t = (key: string) => clinicalTranslations[language][key] || resultTranslations[language][key] || workflowTranslations[language][key] || dashboardTranslations[language][key] || extraTranslations[language][key] || translations[language][key] || clinicalTranslations.en[key] || resultTranslations.en[key] || workflowTranslations.en[key] || dashboardTranslations.en[key] || extraTranslations.en[key] || translations.en[key] || key;
  const navigate = (tab: TabKey) => setActiveTab(tab);
  const changeLanguage = (next: Language) => { setLanguage(next); localStorage.setItem("veya_language", next); };
  return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}><div className="app-shell"><div className="app-frame"><div className="language-floating"><LanguageSwitcher /></div><main className="app-main">{activeTab === "dashboard" && <Dashboard onStart={() => setActiveTab("analysis")} onTab={navigate} />}{activeTab === "analysis" && <Analysis onBack={() => setActiveTab("dashboard")} />}{activeTab === "history" && <HistoryScreen onSelect={setDrawerPatient} />}{activeTab === "settings" && <SettingsScreen />}</main><nav className="bottom-bar" aria-label="Primary navigation">{tabs.map(({ key, label, icon: Icon }) => <button key={key} className={activeTab === key ? "is-active" : ""} onClick={() => setActiveTab(key)}><span className="nav-icon"><Icon size={19} strokeWidth={activeTab === key ? 2.4 : 1.8} /></span><span>{t(key === "dashboard" ? "main" : key)}</span></button>)}</nav></div>{drawerPatient && <PatientDrawer patient={drawerPatient} onClose={() => setDrawerPatient(null)} />}</div></LanguageContext.Provider>;
}
