/** ФТ-7.4: для одной услуги в один день действует только один тариф */
export const TARIFF_CONSTRAINTS: Record<string, [string, string]> = {
  tariffs_no_overlap: [
    "validFrom",
    "На эти даты для услуги уже действует другой тариф. Закройте его датой окончания",
  ],
  tariffs_dates: ["validTo", "Дата окончания не может быть раньше даты начала"],
};
