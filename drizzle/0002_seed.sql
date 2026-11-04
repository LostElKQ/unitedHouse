-- =====================================================================
-- «Единый дом» — тестовые данные для разработки и приёмки
-- Пароль у всех тестовых пользователей: Password1 (хеш scrypt в формате Better Auth)
-- Запускать после schema.sql на пустой базе.
-- =====================================================================

-- Настройки ТСЖ
INSERT INTO hoa_settings (id, name, inn, kpp, address, chairman_name,
                          bank_account, bank_name, bik, corr_account, board_phone, emergency_phone,
                          timezone, maintenance_protocol_no, maintenance_protocol_date)
VALUES (1, 'ТСЖ «Единый дом»', '5260123456', '526001001',
        'г. Нижний Новгород, ул. Белинского, д. 10',
        'Смирнова Ольга Петровна',
        '40703810442000012345', 'Волго-Вятский банк ПАО Сбербанк', '042202603', '30101810900000000603',
        '+7 (831) 200-10-10', '+7 (831) 200-99-99',
        'Europe/Moscow', '3', '2026-04-15');

-- Квартиры: 12 штук, 2 подъезда
INSERT INTO apartments (id, number, entrance, floor, area, account_number, initial_cold, initial_hot)
VALUES (1, '1', 1, 1, 34.50, '1000000001', 120.000, 80.000),
       (2, '2', 1, 1, 52.10, '1000000002', 210.500, 140.200),
       (3, '3', 1, 2, 34.50, '1000000003', 95.300, 60.100),
       (4, '4', 1, 2, 52.10, '1000000004', 180.000, 110.000),
       (5, '5', 1, 3, 34.50, '1000000005', 70.250, 45.000),
       (6, '6', 1, 3, 68.40, '1000000006', 305.000, 190.700),
       (7, '7', 2, 1, 41.20, '1000000007', 150.000, 99.000),
       (8, '8', 2, 1, 41.20, '1000000008', 132.400, 88.800),
       (9, '9', 2, 2, 63.00, '1000000009', 260.000, 170.000),
       (10, '10', 2, 2, 63.00, '1000000010', 240.100, 155.500),
       (11, '11', 2, 3, 41.20, '1000000011', 110.000, 72.000),
       (12, '12а', 2, 3, 28.70, '1000000012', 55.000, 30.000);

-- Пользователи
INSERT INTO users (id, apartment_id, full_name, email, phone, role, status,
                   rejection_reason, must_change_password, pd_consent_at)
VALUES (1, NULL, 'Смирнова Ольга Петровна', 'admin@edinyidom.ru', '+7 (910) 100-00-01', 'admin', 'active', NULL, FALSE,
        '2026-09-01 10:00+03'),
       (2, NULL, 'Козлов Пётр Иванович', 'dvornik@edinyidom.ru', '+7 (910) 100-00-02', 'executor', 'active', NULL,
        FALSE, '2026-09-01 10:05+03'),
       (3, NULL, 'Волков Сергей Андреевич', 'santehnik@edinyidom.ru', '+7 (910) 100-00-03', 'executor', 'active', NULL,
        TRUE, '2026-09-01 10:06+03'),
       (4, 1, 'Иванова Мария Сергеевна', 'ivanova@mail.ru', '+7 (920) 111-22-33', 'resident', 'active', NULL, FALSE,
        '2026-09-02 18:20+03'),
       (5, 2, 'Петров Алексей Викторович', 'petrov@yandex.ru', '+7 (920) 222-33-44', 'resident', 'active', NULL, FALSE,
        '2026-09-03 09:10+03'),
       (6, 2, 'Петрова Анна Игоревна', 'petrova@yandex.ru', NULL, 'resident', 'active', NULL, FALSE,
        '2026-09-03 09:30+03'),
       (7, 3, 'Сидоров Николай Петрович', 'sidorov@gmail.com', '+7 (920) 333-44-55', 'resident', 'active', NULL, FALSE,
        '2026-09-04 20:00+03'),
       (8, 4, 'Кузнецова Елена Олеговна', 'kuznetsova@mail.ru', '+7 (920) 444-55-66', 'resident', 'active', NULL, FALSE,
        '2026-09-05 12:00+03'),
       (9, 6, 'Морозов Дмитрий Юрьевич', 'morozov@mail.ru', '+7 (920) 555-66-77', 'resident', 'active', NULL, FALSE,
        '2026-09-06 08:45+03'),
       (10, 7, 'Новикова Татьяна Ивановна', 'novikova@yandex.ru', '+7 (920) 666-77-88', 'resident', 'active', NULL,
        FALSE, '2026-09-07 19:15+03'),
       (11, 9, 'Фёдоров Игорь Михайлович', 'fedorov@gmail.com', '+7 (920) 777-88-99', 'resident', 'active', NULL, FALSE,
        '2026-09-08 21:00+03'),
       (12, 10, 'Орлова Светлана Павловна', 'orlova@mail.ru', NULL, 'resident', 'pending', NULL, FALSE,
        '2026-10-30 14:00+03'),
       (13, 11, 'Лебедев Артём Сергеевич', 'lebedev@yandex.ru', '+7 (920) 888-99-00', 'resident', 'pending', NULL,
        FALSE, '2026-11-01 11:30+03'),
       (14, 5, 'Егоров Василий Николаевич', 'egorov@mail.ru', NULL, 'resident', 'rejected',
        'Собственник квартиры 5 — другое лицо. Обратитесь в правление с документами.', FALSE, '2026-10-10 10:00+03'),
       (15, 8, 'Белова Ирина Алексеевна', 'belova@gmail.com', NULL, 'resident', 'blocked', NULL, FALSE,
        '2026-09-10 10:00+03');

-- Пароли (Better Auth хранит хеш в accounts, provider_id = 'credential'). Пароль: Password1
INSERT INTO accounts (account_id, provider_id, user_id, password)
SELECT id::text,
       'credential',
       id,
       'b9ab85a29b5ce7de50b1b756e7a4c151:beccfc9d38e5ee7da63d46a4f462254542d32424da8e742a9e6f5b67e66d00bf175f69d34a3499a2b4fb82efd084075e33790b1af65603e5e6564ba0b2262dc6'
FROM users;

-- Тарифы (с 01.01.2026)
INSERT INTO tariffs (id, service, calc_method, rate, valid_from, valid_to)
VALUES (1, 'Содержание и ремонт', 'area', 32.50, '2026-01-01', NULL),
       (2, 'Холодная вода', 'cold_water', 52.30, '2026-01-01', NULL),
       (3, 'Горячая вода', 'hot_water', 245.80, '2026-01-01', NULL),
       (4, 'Домофон', 'fixed', 60.00, '2026-01-01', NULL);

-- ---------------------------------------------------------------------
-- Сентябрь 2026: показания сданы, начисления сформированы и опубликованы
-- ---------------------------------------------------------------------
INSERT INTO billing_periods (id, year, month, readings_start, readings_end, status,
                             opened_at, closed_at, charges_formed_at)
VALUES (1, 2026, 9, '2026-09-20', '2026-09-25', 'charges_formed',
        '2026-09-19 09:00+03', '2026-09-26 09:00+03', '2026-09-28 10:00+03');

INSERT INTO meter_readings (apartment_id, period_id, cold_value, hot_value, entered_by, entered_by_admin, entered_at)
SELECT a.id,
       1,
       a.initial_cold + 3.5 + (a.id % 4) * 1.25,
       a.initial_hot + 2.0 + (a.id % 3) * 0.75,
       COALESCE((SELECT u.id FROM users u WHERE u.apartment_id = a.id AND u.status = 'active' LIMIT 1), 1),
       NOT EXISTS (SELECT 1 FROM users u WHERE u.apartment_id = a.id AND u.status = 'active'),
       '2026-09-22 19:00+03'
FROM apartments a;

-- Квитанции и строки — по правилам ФТ-11.2
INSERT INTO charges (id, apartment_id, period_id, total, due_date)
SELECT a.id, a.id, 1, 0, '2026-10-15'
FROM apartments a;

INSERT INTO charge_lines (charge_id, tariff_id, service, calc_method, volume, unit, rate, amount, sort_order)
SELECT c.id,
       t.id,
       t.service,
       t.calc_method,
       v.volume,
       v.unit,
       t.rate,
       ROUND(v.volume * t.rate, 2),
       t.id
FROM charges c
         JOIN apartments a ON a.id = c.apartment_id
         JOIN meter_readings r ON r.apartment_id = a.id AND r.period_id = c.period_id
         JOIN tariffs t ON '2026-09-30' BETWEEN t.valid_from AND COALESCE(t.valid_to, 'infinity')
         CROSS JOIN LATERAL (
    SELECT CASE t.calc_method
               WHEN 'area' THEN a.area
               WHEN 'cold_water' THEN r.cold_value - a.initial_cold
               WHEN 'hot_water' THEN r.hot_value - a.initial_hot
               ELSE 1 END    AS volume,
           CASE t.calc_method
               WHEN 'area' THEN 'м²'
               WHEN 'fixed' THEN 'шт.'
               ELSE 'м³' END AS unit
    ) v
WHERE c.period_id = 1;

UPDATE charges c
SET total = s.sum
FROM (SELECT charge_id, SUM(amount) AS sum FROM charge_lines GROUP BY charge_id) s
WHERE s.charge_id = c.id;

UPDATE billing_periods
SET status       = 'published',
    published_at = '2026-10-01 10:00+03'
WHERE id = 1;

-- Оплаты по сентябрю: часть оплачена, часть частично, остальные — долг
UPDATE charges
SET payment_status    = 'paid',
    paid_amount       = total,
    paid_at           = '2026-10-10',
    payment_marked_by = 1
WHERE id IN (1, 2, 3, 6, 7, 9);
UPDATE charges
SET payment_status    = 'partially_paid',
    paid_amount       = 1000.00,
    paid_at           = '2026-10-14',
    payment_marked_by = 1
WHERE id = 4;

-- ---------------------------------------------------------------------
-- Октябрь 2026: приём закрыт, у квартир 5 и 12а «Нет показаний»
-- ---------------------------------------------------------------------
INSERT INTO billing_periods (id, year, month, readings_start, readings_end, status, opened_at, closed_at)
VALUES (2, 2026, 10, '2026-10-20', '2026-10-25', 'readings_closed',
        '2026-10-19 09:00+03', '2026-10-26 09:00+03');

INSERT INTO meter_readings (apartment_id, period_id, cold_value, hot_value, entered_by, entered_by_admin, entered_at)
SELECT r.apartment_id,
       2,
       r.cold_value + 4.100,
       r.hot_value + 2.600,
       r.entered_by,
       r.entered_by_admin,
       '2026-10-23 20:00+03'
FROM meter_readings r
         JOIN apartments a ON a.id = r.apartment_id
WHERE r.period_id = 1
  AND a.number NOT IN ('5', '12а');

-- ---------------------------------------------------------------------
-- Заявки, комментарии, история
-- ---------------------------------------------------------------------
INSERT INTO requests (id, apartment_id, author_id, category, location, location_detail, description,
                      marked_urgent, priority, status, created_at, taken_at, closed_at)
VALUES (1, 1, 4, 'plumbing', 'basement', NULL, 'В подвале под первым подъездом течёт труба, на полу вода.', TRUE,
        'urgent', 'done', '2026-10-05 08:30+03', '2026-10-05 10:00+03', '2026-10-06 16:00+03'),
       (2, 3, 7, 'electrical', 'floor', '1-й подъезд, 2-й этаж', 'Не горит лампа на лестничной площадке уже неделю.',
        FALSE, 'normal', 'in_progress', '2026-10-25 19:40+03', '2026-10-27 09:00+03', NULL),
       (3, 7, 10, 'intercom_doors', 'entrance', '2-й подъезд',
        'Домофон не открывает дверь с ключа, приходится ждать соседей.', FALSE, 'normal', 'new', '2026-10-20 18:00+03',
        NULL, NULL),
       (4, 2, 5, 'cleaning', 'yard', 'у детской площадки', 'Переполнены мусорные контейнеры, вывоза не было три дня.',
        FALSE, 'low', 'new', '2026-11-01 12:15+03', NULL, NULL),
       (5, 6, 9, 'other', 'other', NULL, 'Прошу проверить, почему в квитанции изменилась сумма.', FALSE, 'normal',
        'rejected', '2026-10-03 11:00+03', NULL, '2026-10-03 15:00+03');

INSERT INTO request_history (request_id, changed_by, old_status, new_status, old_priority, new_priority, changed_at)
VALUES (1, 1, NULL, 'new', NULL, 'urgent', '2026-10-05 08:30+03'),
       (1, 1, 'new', 'in_progress', NULL, NULL, '2026-10-05 10:00+03'),
       (1, 3, 'in_progress', 'done', NULL, NULL, '2026-10-06 16:00+03'),
       (2, 1, 'new', 'in_progress', NULL, NULL, '2026-10-27 09:00+03'),
       (4, 1, NULL, NULL, 'normal', 'low', '2026-11-01 13:00+03'),
       (5, 1, 'new', 'rejected', NULL, NULL, '2026-10-03 15:00+03');

INSERT INTO comments (request_id, author_id, text, created_at)
VALUES (1, 1, 'Сантехник выйдет сегодня до 12:00.', '2026-10-05 10:01+03'),
       (1, 4, 'Спасибо!', '2026-10-05 10:20+03'),
       (2, 1, 'Лампы закуплены, замена в среду.', '2026-10-27 09:05+03'),
       (5, 1,
        'Это не неисправность. Изменился расход горячей воды — подробности в квитанции, вопросы — по телефону правления.',
        '2026-10-03 15:00+03');

-- ---------------------------------------------------------------------
-- Работы по дому
-- ---------------------------------------------------------------------
INSERT INTO works (id, request_id, title, type, category, location, location_detail, work_date,
                   time_start, time_end, executor_id, contractor, description, priority, status,
                   report, completed_on, completed_by, created_by)
VALUES (1, 1, 'Устранение течи трубы в подвале', 'unplanned', 'plumbing', 'basement', 'под 1-м подъездом', '2026-10-05',
        '11:00', '14:00', 3, NULL, 'По заявке № 1', 'urgent', 'done',
        'Заменён участок трубы ХВС 1 м, вода откачана.', '2026-10-06', 3, 1),
       (2, 2, 'Замена ламп на лестнице', 'unplanned', 'electrical', 'entrance', '1-й подъезд, 2-й этаж', '2026-11-04',
        '10:00', NULL, 2, NULL, 'По заявке № 2', 'normal', 'planned', NULL, NULL, NULL, 1),
       (3, NULL, 'Влажная уборка подъезда № 1', 'planned', 'cleaning', 'entrance', '1-й подъезд', '2026-11-02',
        '09:00', '11:00', 2, NULL, 'Еженедельная уборка', NULL, 'in_progress', NULL, NULL, NULL, 1),
       (4, NULL, 'Влажная уборка подъезда № 2', 'planned', 'cleaning', 'entrance', '2-й подъезд', '2026-11-03',
        '09:00', '11:00', 2, NULL, 'Еженедельная уборка', NULL, 'planned', NULL, NULL, NULL, 1),
       (5, NULL, 'Техобслуживание лифта', 'planned', 'elevator', 'whole_house', NULL, '2026-11-10',
        NULL, NULL, NULL, 'ООО «ЛифтСервис»', 'Ежемесячное ТО', NULL, 'rescheduled', NULL, NULL, NULL, 1),
       (6, NULL, 'Осмотр кровли перед зимой', 'planned', 'other', 'roof', NULL, '2026-10-28',
        NULL, NULL, 3, NULL, 'Сезонный осмотр', NULL, 'planned', NULL, NULL, NULL, 1); -- просрочена (дата прошла)

INSERT INTO work_reschedules (work_id, old_date, new_date, reason, created_by, created_at)
VALUES (5, '2026-11-05', '2026-11-10', 'Подрядчик перенёс выезд из-за поломки техники.', 1, '2026-11-01 15:00+03');

INSERT INTO attachments (request_id, work_id, file_path, mime_type, size_bytes, uploaded_by)
VALUES (1, NULL, 'uploads/requests/1/leak.jpg', 'image/jpeg', 845213, 4),
       (NULL, 1, 'uploads/works/1/after_repair.jpg', 'image/jpeg', 1203344, 3);

-- ---------------------------------------------------------------------
-- Перечень работ по содержанию
-- ---------------------------------------------------------------------
INSERT INTO maintenance_items (name, periodicity, annual_cost, note, sort_order)
VALUES ('Влажная уборка лестничных площадок и маршей', '1 раз в неделю', 96000.00, NULL, 1),
       ('Уборка придомовой территории', 'ежедневно', 144000.00, 'Зимой — очистка от снега и наледи', 2),
       ('Техническое обслуживание лифта', '1 раз в месяц', 72000.00, 'Выполняет подрядная организация', 3),
       ('Осмотр кровли', '2 раза в год', NULL, NULL, 4),
       ('Дератизация и дезинсекция подвала', '1 раз в квартал', 12000.00, NULL, 5);

-- ---------------------------------------------------------------------
-- Объявления
-- ---------------------------------------------------------------------
INSERT INTO announcements (author_id, title, body, importance, pinned, actual_until, created_at)
VALUES (1, 'Отключение горячей воды 5 ноября',
        'В связи с ремонтом теплосети 5 ноября с 9:00 до 18:00 не будет горячей воды.', 'important', TRUE, '2026-11-05',
        '2026-11-01 10:00+03'),
       (1, 'Общее собрание собственников',
        'Приглашаем на общее собрание 15 ноября в 19:00 во дворе дома. Повестка: смета на 2027 год.', 'normal', FALSE,
        '2026-11-15', '2026-10-30 12:00+03'),
       (1, 'Приём показаний в октябре', 'Показания счётчиков принимаются с 20 по 25 октября.', 'normal', FALSE,
        '2026-10-25', '2026-10-18 09:00+03');

-- Журнал действий (пример)
INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
VALUES (1, 'charges.form', 'billing_period', 1, '{
  "apartments": 12
}', '2026-09-28 10:00+03'),
       (1, 'charges.publish', 'billing_period', 1, NULL, '2026-10-01 10:00+03'),
       (1, 'user.reject', 'user', 14, '{
         "reason": "Собственник — другое лицо"
       }', '2026-10-11 09:00+03');

-- Сдвигаем счётчики serial после вставки с явными id
SELECT SETVAL('apartments_id_seq', (SELECT MAX(id) FROM apartments));
SELECT SETVAL('users_id_seq', (SELECT MAX(id) FROM users));
SELECT SETVAL('accounts_id_seq', (SELECT MAX(id) FROM accounts));
SELECT SETVAL('tariffs_id_seq', (SELECT MAX(id) FROM tariffs));
SELECT SETVAL('billing_periods_id_seq', (SELECT MAX(id) FROM billing_periods));
SELECT SETVAL('charges_id_seq', (SELECT MAX(id) FROM charges));
SELECT SETVAL('requests_id_seq', (SELECT MAX(id) FROM requests));
SELECT SETVAL('works_id_seq', (SELECT MAX(id) FROM works));
