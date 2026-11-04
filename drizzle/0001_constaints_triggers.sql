-- Ручная миграция: то, что Drizzle не описывает в schema.ts.
-- Создана командой `drizzle-kit generate --custom`. При `drizzle-kit push` НЕ применяется —
-- используйте `drizzle-kit migrate`.

-- ФТ-7.4: для одной услуги в один день действует только один тариф
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_no_overlap"
    EXCLUDE USING gist ("service" WITH =, daterange("valid_from", "valid_to", '[]') WITH &&);
--> statement-breakpoint

-- ФТ-8.4, п. 4.4: данные опубликованного периода не меняются
CREATE FUNCTION forbid_change_in_published_period() RETURNS trigger AS $$
DECLARE
    pid integer;
BEGIN
    pid := CASE WHEN TG_OP = 'INSERT' THEN NEW.period_id ELSE OLD.period_id END;
    IF EXISTS (SELECT 1 FROM billing_periods WHERE id = pid AND status = 'published') THEN
        RAISE EXCEPTION 'Период % опубликован: изменение данных запрещено', pid;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER meter_readings_lock
    BEFORE INSERT OR UPDATE OR DELETE ON meter_readings
    FOR EACH ROW EXECUTE FUNCTION forbid_change_in_published_period();
--> statement-breakpoint

-- Квитанции опубликованного периода: менять можно только поля оплаты
CREATE FUNCTION forbid_charge_change_after_publish() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM billing_periods
               WHERE id = COALESCE(OLD.period_id, NEW.period_id) AND status = 'published') THEN
        IF TG_OP = 'DELETE' OR TG_OP = 'INSERT'
           OR NEW.total <> OLD.total OR NEW.due_date <> OLD.due_date
           OR NEW.apartment_id <> OLD.apartment_id OR NEW.period_id <> OLD.period_id THEN
            RAISE EXCEPTION 'Квитанции опубликованного периода изменять нельзя (кроме отметки оплаты)';
        END IF;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER charges_lock
    BEFORE INSERT OR UPDATE OR DELETE ON charges
    FOR EACH ROW EXECUTE FUNCTION forbid_charge_change_after_publish();
--> statement-breakpoint

CREATE FUNCTION forbid_line_change_after_publish() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM charges c JOIN billing_periods p ON p.id = c.period_id
               WHERE c.id = COALESCE(OLD.charge_id, NEW.charge_id) AND p.status = 'published') THEN
        RAISE EXCEPTION 'Строки начислений опубликованного периода изменять нельзя';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER charge_lines_lock
    BEFORE INSERT OR UPDATE OR DELETE ON charge_lines
    FOR EACH ROW EXECUTE FUNCTION forbid_line_change_after_publish();
--> statement-breakpoint

-- ФТ-13.3, 13.4: задолженность по квартирам
CREATE VIEW apartment_debts AS
SELECT a.id                         AS apartment_id,
       a.number                     AS apartment_number,
       COALESCE(SUM(c.total - c.paid_amount), 0)::numeric(12,2) AS debt,
       COUNT(c.id)                  AS unpaid_months
FROM apartments a
JOIN charges c         ON c.apartment_id = a.id
JOIN billing_periods p ON p.id = c.period_id AND p.status = 'published'
WHERE c.payment_status <> 'paid'
  AND c.due_date < CURRENT_DATE
GROUP BY a.id, a.number;
