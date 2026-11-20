// =====================================================================
// Контракт REST API: типы ответов. Используются и фронтендом, и
// эндпоинтами (`satisfies`), чтобы формат не разъезжался.
// numeric-поля БД (деньги, площадь, показания) передаются строками.
// Даты без времени — "ГГГГ-ММ-ДД", моменты времени — ISO-строки.
// =====================================================================
import type {
  CalcMethod,
  Category,
  PaymentStatus,
  PeriodStatus,
  Priority,
  RequestLocation,
  RequestStatus,
  UserRole,
  UserStatus,
  WorkLocation,
  WorkStatus,
  WorkType,
} from "../labels.ts";

export type PublicSettings = {
  name: string;
  address: string;
  boardPhone: string | null;
  emergencyPhone: string | null;
  timezone: string;
  readingsStartDay: number;
  readingsEndDay: number;
};

// --- 3.4 Пользователи ----------------------------------------------------

export type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  apartmentId: number | null;
  apartmentNumber: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  pdConsentAt: string | null;
};

// --- 3.6 Квартиры --------------------------------------------------------

export type ApartmentRow = {
  id: number;
  number: string;
  entrance: number;
  floor: number;
  area: string;
  accountNumber: string;
  initialCold: string;
  initialHot: string;
  residents: Array<{ id: number; name: string; status: UserStatus }>;
  /** Есть показания или начисления — удалять нельзя (ФТ-6.5) */
  hasData: boolean;
};

// --- 3.7 Тарифы ----------------------------------------------------------

export type TariffRow = {
  id: number;
  service: string;
  calcMethod: CalcMethod;
  rate: string;
  validFrom: string;
  validTo: string | null;
  /** Использован в начислениях — нельзя удалить и менять ставку (ФТ-7.5) */
  used: boolean;
};

// --- 3.8 Расчётный период ------------------------------------------------

export type Period = {
  id: number;
  year: number;
  month: number;
  readingsStart: string;
  readingsEnd: string;
  status: PeriodStatus;
  openedAt: string;
  closedAt: string | null;
  chargesFormedAt: string | null;
  publishedAt: string | null;
};

// --- 3.10 Показания (администратор) --------------------------------------

export type ReadingRow = {
  apartmentId: number;
  apartmentNumber: string;
  accountNumber: string;
  prevCold: string;
  prevHot: string;
  cold: string | null;
  hot: string | null;
  coldUsage: string | null;
  hotUsage: string | null;
  enteredByName: string | null;
  enteredByAdmin: boolean;
  enteredAt: string | null;
};

export type PeriodReadings = {
  period: Period;
  rows: ReadingRow[];
  totals: { cold: string; hot: string };
};

// --- 3.9 Показания (житель) ----------------------------------------------

export type MyReadings = {
  /** Текущий период (открытый или последний неопубликованный), если есть */
  period: Period | null;
  /** Можно ли сейчас передавать показания (ФТ-9.2) */
  canSubmit: boolean;
  prev: { cold: string; hot: string };
  current: { cold: string; hot: string; enteredAt: string; enteredByAdmin: boolean } | null;
  /** Средний расход за последние 3 месяца — для предупреждения ФТ-9.4 */
  avgUsage: { cold: string; hot: string } | null;
  /** Даты следующего приёма по настройкам ТСЖ (ФТ-9.2) */
  nextWindow: { start: string; end: string };
  history: Array<{
    year: number;
    month: number;
    cold: string;
    hot: string;
    coldUsage: string;
    hotUsage: string;
  }>;
};

// --- 3.11 Начисления -----------------------------------------------------

export type ChargeSummaryRow = {
  chargeId: number;
  apartmentId: number;
  apartmentNumber: string;
  accountNumber: string;
  total: string;
  paidAmount: string;
  paymentStatus: PaymentStatus;
};

export type PeriodCharges = {
  period: Period;
  rows: ChargeSummaryRow[];
  total: string;
  byService: Array<{ service: string; amount: string }>;
};

// --- 3.12 Квитанции -------------------------------------------------------

export type ReceiptListItem = {
  id: number;
  year: number;
  month: number;
  total: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  paidAmount: string;
};

export type ReceiptLine = {
  service: string;
  calcMethod: CalcMethod;
  volume: string;
  unit: string;
  rate: string;
  amount: string;
};

export type Receipt = ReceiptListItem & {
  apartment: { number: string; accountNumber: string; area: string };
  payerNames: string[];
  lines: ReceiptLine[];
  hoa: {
    name: string;
    inn: string | null;
    kpp: string | null;
    address: string;
    bankAccount: string | null;
    bankName: string | null;
    bik: string | null;
    corrAccount: string | null;
  };
  published: boolean;
};

// --- 3.14 Заявки ----------------------------------------------------------

export type Attachment = { id: number; url: string; mimeType: string };

export type RequestItem = {
  id: number;
  number: number;
  category: Category;
  location: RequestLocation;
  locationDetail: string | null;
  description: string;
  markedUrgent: boolean;
  priority: Priority;
  status: RequestStatus;
  createdAt: string;
  photos: Attachment[];
  /** Плановая дата связанной работы (ФТ-15.6) */
  plannedDate: string | null;
};

// --- 3.16 / 3.17 Работы ---------------------------------------------------

export type WorkItem = {
  id: number;
  title: string;
  type: WorkType;
  category: Category;
  location: WorkLocation;
  locationDetail: string | null;
  workDate: string;
  timeStart: string | null;
  timeEnd: string | null;
  executorId: number | null;
  executorName: string | null;
  contractor: string | null;
  description: string | null;
  priority: Priority | null;
  status: WorkStatus;
  /** ФТ-16.7: «Запланирована» или «В работе», а дата прошла */
  overdue: boolean;
  requestId: number | null;
  requestNumber: number | null;
};

export type WorkDetail = WorkItem & {
  report: string | null;
  completedOn: string | null;
  reschedules: Array<{ oldDate: string; newDate: string; reason: string; createdAt: string }>;
  photos: Attachment[];
};
