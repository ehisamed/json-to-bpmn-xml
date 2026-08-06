# Current task

## Goal
Довести генерацию до правильного чистого BPMN XML, чтобы можно было тестировать.

## Done
- [x] Убран `laneId` из XML (только модель → laneSet.flowNodeRef)
- [x] Восстановлен `xsi:schemaLocation` и OMG targetNamespace
- [x] Collaboration только при наличии lanes
- [x] Lane DI ссылается на moddle Lane-элементы
- [x] Dedup waypoints
- [x] Валидация модели (laneId / edge source-target)
- [x] Экспорт типов, примеры, тесты
- [x] Scripts: `test`, `local`, `example:*`
- [x] Fix: lane inset (нет наложений заголовков pool/lane)
- [x] Fix: ортогональные edges по финальным bounds

## Next (optional for testing)
- [ ] Визуально проверить XML в bpmn.io ещё раз
- [ ] Тонкая настройка обхода backward-edges при плотных графах
