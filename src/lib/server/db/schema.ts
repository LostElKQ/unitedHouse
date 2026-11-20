export * from "./auth.schema";
export * from "./main.schema";
// Перечисления тоже экспортируем: иначе drizzle-kit generate считает их
// удалёнными и добавляет в миграцию DROP TYPE.
export * from "./enums";
