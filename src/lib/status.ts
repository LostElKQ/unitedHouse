// =====================================================================
// Цвет (тон) статусов. СТ 5.1 задаёт цвета статусов работ:
// «Запланирована» – серый, «В работе» – синий, «Выполнена» – зелёный,
// «Перенесена» – оранжевый, «Просрочена» – красный.
// Для остальных сущностей используем тот же смысл цвета:
// серый – ждёт действия, синий – в процессе, зелёный – готово,
// оранжевый – требует внимания, красный – проблема.
// Цвет всегда дополняется текстом (ФТ-17.2) — см. StatusBadge.svelte.
// =====================================================================
import {
  OVERDUE_LABEL,
  paymentStatusLabels,
  periodStatusLabels,
  requestStatusLabels,
  userStatusLabels,
  workStatusLabels,
  type PaymentStatus,
  type PeriodStatus,
  type RequestStatus,
  type UserStatus,
  type WorkStatus,
} from "./labels.ts";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const workTones: Record<WorkStatus, Tone> = {
  planned: "neutral",
  in_progress: "info",
  done: "success",
  rescheduled: "warning",
  cancelled: "neutral",
};

const requestTones: Record<RequestStatus, Tone> = {
  new: "neutral",
  in_progress: "info",
  done: "success",
  rejected: "neutral",
  cancelled: "neutral",
};

const periodTones: Record<PeriodStatus, Tone> = {
  readings_open: "info",
  readings_closed: "neutral",
  charges_formed: "warning",
  published: "success",
};

const paymentTones: Record<PaymentStatus, Tone> = {
  unpaid: "neutral",
  partially_paid: "warning",
  paid: "success",
};

const userTones: Record<UserStatus, Tone> = {
  pending: "warning",
  active: "success",
  rejected: "danger",
  blocked: "danger",
};

export type StatusRef =
  | { kind: "work"; value: WorkStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "period"; value: PeriodStatus }
  | { kind: "payment"; value: PaymentStatus }
  | { kind: "user"; value: UserStatus }
  | { kind: "overdue" };

export function statusView(ref: StatusRef): { label: string; tone: Tone } {
  switch (ref.kind) {
    case "work":
      return { label: workStatusLabels[ref.value], tone: workTones[ref.value] };
    case "request":
      return { label: requestStatusLabels[ref.value], tone: requestTones[ref.value] };
    case "period":
      return { label: periodStatusLabels[ref.value], tone: periodTones[ref.value] };
    case "payment":
      return { label: paymentStatusLabels[ref.value], tone: paymentTones[ref.value] };
    case "user":
      return { label: userStatusLabels[ref.value], tone: userTones[ref.value] };
    case "overdue":
      return { label: OVERDUE_LABEL, tone: "danger" };
  }
}
