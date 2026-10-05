# ProcessModel JSON — справочник структуры (русский)

Документ описывает **входной JSON** для `convert(model)` / `BpmnConverter.convert(model)`.

Конвертер превращает эту структуру в **валидный BPMN 2.0 XML** (семантика + диаграмма DI). Координаты и waypoints считаются автоматически — **геометрию layout в JSON класть не нужно**.

- English version: [json-schema.en.md](./json-schema.en.md)
- Исходник типов: `src/types/`

---

## 1. Два режима одного корневого объекта

`ProcessModel` допускает две формы. Внутри они нормализуются к одному виду (`processes[]` + опционально message flows, data references и artifacts).

| Режим | Когда использовать | Что заполнять |
| ----- | ------------------ | ------------- |
| **Простой (simple)** | Один процесс, опционально lanes | Корневые `nodes`, `edges`, опционально `lanes` |
| **Коллаборация** | Несколько пулов и/или message flows | Корневые `processes[]`, опционально `messageFlows`, `dataStores` |

**Правило:** если есть непустой `processes`, побеждает **режим коллаборации**. Корневые `nodes` / `edges` / `lanes` в этом случае **игнорируются**.

**Правило:** если `processes` нет или он пустой, обязателен корневой `nodes` (хотя бы один узел). Иначе конвертация падает с ошибкой.

```text
ProcessModel
├── id (обязателен)
├── name?
│
├── [Простой]
│   ├── lanes?
│   ├── nodes?
│   └── edges?
│
└── [Коллаборация]
    ├── processes?
    ├── messageFlows?
    ├── dataStores?
    ├── dataObjects?
    ├── textAnnotations? / groups?
    └── associations?
```

---

## 2. Корень: `ProcessModel`

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | **да** | Корневой id. Идёт в id definitions (`${id}_definitions`) и в простом режиме — в id процесса. В пределах вашей системы должен быть уникален; удобно: буквы, цифры, `_`. |
| `name` | `string` | нет | Человекочитаемое имя. В простом режиме также имя процесса/participant. |
| `lanes` | `ILane[]` | нет | Только простой режим. Дорожки одного процесса. |
| `nodes` | `INode[]` | simple: **да*** | Узлы простого режима. *Обязательны, если нет `processes`. |
| `edges` | `IEdge[]` | нет | Sequence flow простого режима. По умолчанию `[]`. |
| `processes` | `IProcessDef[]` | collab: **да*** | Один элемент = один пул/процесс. *Нужен для multi-pool. |
| `messageFlows` | `IMessageFlow[]` | нет | Пунктирные сообщения **между процессами**. |
| `dataStores` | `IDataStore[]` | нет | Общие data store (цилиндры). |
| `dataObjects` | `IDataObject[]` | нет | Ссылки на документы/data objects. |
| `textAnnotations` | `ITextAnnotation[]` | нет | Текстовые аннотации. |
| `groups` | `IGroup[]` | нет | BPMN group artifacts. |
| `associations` | `IAssociation[]` | нет | Ассоциации между узлами/artifacts. |

### Зачем два режима?

- **Простой** — короткие примеры без лишней вложенности.
- **Коллаборация** — как в BPMN: каждый пул — свой process; message flow нельзя выразить через `edges` одного процесса.

### Чего в JSON **нет**

- Нет `x` / `y` / waypoints — layout автоматический.
- Нет кусков сырого BPMN XML.
- Атрибут `laneId` **не** попадает на flow-узлы в XML (только `laneSet` / `flowNodeRef`).
- Содержимое subprocess задаётся через `subProcess.nodes` / `subProcess.edges`; для раскрытой DI-картинки укажите `expanded: true`.
- `subProcessType: "event"` создаёт event subprocess, `subProcessType: "transaction"` — transaction subprocess.

---

## 3. Процесс: `IProcessDef` (коллаборация)

Один объект в `processes[]` = один BPMN process + один participant (пул).

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | **да** | Id процесса (`bpmn:process/@id`). Уникален среди процессов. |
| `name` | `string` | нет | Имя процесса. |
| `participantId` | `string` | нет | Id элемента пула. По умолчанию: `Participant_${process.id}`. |
| `participantName` | `string` | нет | Заголовок пула на диаграмме. По умолчанию: `name` процесса. |
| `lanes` | `ILane[]` | нет | Горизонтальные дорожки внутри пула. |
| `nodes` | `INode[]` | **да** | Хотя бы один узел. Id уникальны **по всей модели**. |
| `edges` | `IEdge[]` | **да** (массив) | Sequence flow; может быть `[]`, но поле должно быть массивом. |

### Правила вложенности

```text
processes[]
  └── process
        ├── lanes[]          ← опционально; только id, на которые ссылается node.laneId
        ├── nodes[]          ← принадлежат ТОЛЬКО этому процессу
        └── edges[]          ← source/target ТОЛЬКО из nodes этого процесса
```

- `edge` **не может** соединять узлы разных процессов → для этого `messageFlows`.
- `laneId` узла должен ссылаться на lane **того же** процесса.
- Если у процесса есть `lanes`, узлы без `laneId` формально допустимы, но не попадут в `flowNodeRef` ни одной дорожки (лучше всегда указывать `laneId`).

### Когда появляется collaboration / DI пула

Collaboration создаётся, если верно хотя бы одно:

1. Больше одного процесса, или  
2. Есть хотя бы один `messageFlow`, или  
3. Хотя бы у одного процесса есть `lanes`.

Иначе (простой процесс без lanes) плоскость диаграммы привязана к **process**, не к collaboration.

---

## 4. Дорожка: `ILane`

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | **да** | Ссылка из `node.laneId`. Уникален внутри процесса. |
| `name` | `string` | **да** | Подпись в заголовке дорожки. |

**Почему lanes отдельно от узлов:** в BPMN дорожки — разбиение процесса, а не атрибут элемента. Конвертер строит `laneSet` и заполняет `flowNodeRef` для узлов с подходящим `laneId`.

---

## 5. Узел: `INode`

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | **да** | Уникален среди **всех** процессов модели. |
| `type` | `NodeType` | **да** | См. таблицу ниже. |
| `name` | `string` | нет | Подпись на диаграмме. |
| `laneId` | `string` | нет | Если задан — должен существовать в `lanes` родительского процесса. |
| `eventDefinition` | `EventDefinition` | условно | Одно определение события. |
| `eventDefinitions` | `EventDefinition[]` | нет | Несколько определений на одном событии. |
| `eventDefinitionOptions` | object | нет | Настройки compensation и link. |
| `multiInstance` | `boolean \| object` | нет | Маркер и параметры loop. |
| `dataInputs` | `string[]` | нет | Id из корневых `dataStores` (чтение). |
| `dataOutputs` | `string[]` | нет | Id из корневых `dataStores` (запись). |
| `dataObjectInputs` | `string[]` | нет | Id из корневых `dataObjects` (чтение). |
| `dataObjectOutputs` | `string[]` | нет | Id из корневых `dataObjects` (запись). |
| `color` | `DiColor` | нет | Заливка/обводка DI (bioc + color bpmn.io). |

### `NodeType` → элемент BPMN

| `type` | BPMN | Типичное назначение |
| ------ | ---- | ------------------- |
| `start` | StartEvent | Вход в процесс |
| `end` | EndEvent | Выход из процесса |
| `task` | Task | Обычная активность |
| `userTask` | UserTask | Пользовательская задача |
| `serviceTask` | ServiceTask | Сервис / автоматизация |
| `subProcess` | SubProcess / Transaction | Вложенный, event или transaction subprocess |
| `exclusiveGateway` | ExclusiveGateway | XOR-развилка / слияние |
| `parallelGateway` | ParallelGateway | AND-разветвление / соединение |
| `eventBasedGateway` | EventBasedGateway | Ждать первое из catch-событий |
| `intermediateCatch` | IntermediateCatchEvent | Промежуточный catch (timer/message) |
| `complexGateway` | ComplexGateway | Сложная логика активации/слияния |
| `intermediateThrow` | IntermediateThrowEvent | Link throw event |
| `boundaryEvent` | BoundaryEvent | Событие на activity |

Другие значения `type` недопустимы (TypeScript + runtime-карта).

### `eventDefinition`

| Где применимо | Значения | Смысл |
| ------------- | -------- | ----- |
| event nodes | `timer`, `message`, `signal`, `conditional`, `error`, `escalation`, `terminate`, `cancel`, `compensation`, `link` | Event definition |
| Остальные типы | — | Если указано — игнорируется |

**Почему так:** в BPMN «none» и timer/message отличаются event definition, а не отдельным JSON-типом на каждый вариант.

### `multiInstance`

| Значение | Результат |
| -------- | --------- |
| нет / `false` | Без MI |
| `true` | Параллельный multi-instance |
| `{ sequential: true }` | Последовательный MI (`isSequential="true"`) |
| `{ sequential: false }` | Как параллельный |
| `{ loopCardinality: 3 }` | Выражение cardinality |
| `{ completionCondition: "approved >= 2" }` | Остановить MI при истинном выражении |
| `{ behavior: "All" \| "One" \| "Complex" }` | Поведение завершения MI |

Имеет смысл на активностях (`task`, `userTask`, `serviceTask`, `subProcess`). На событиях/шлюзах обычно не ставят.

### `dataInputs` / `dataOutputs`

- Каждая строка **должна** совпадать с id в корневом `dataStores`.
- `dataOutputs` → `dataOutputAssociation` (узел пишет в store).
- `dataInputs` → `dataInputAssociation` (узел читает; для валидности BPMN создаётся placeholder-`property`).

**Владение store:** каждый data store вешается на **первый** процесс, который на него ссылается (или на первый процесс, если ссылок нет). На диаграмме store часто рисуется в зазоре между пулами.

### `dataObjects`

`dataObjects[]` использует `{ id, name?, isCollection?, color? }`. Поля `dataObjectInputs` и `dataObjectOutputs` создают ассоциации с `bpmn:dataObjectReference`.

### `eventDefinitionOptions`

- Compensation: `{ activityRef: "UndoCharge", waitForCompletion: false }`.
- Link: `{ linkName: "ReviewHandoff", linkDirection: "source" | "target" }`. Source и target с одинаковым `linkName` связываются.

### Artifacts

- `textAnnotations[]`: `{ id, text, color? }`.
- `groups[]`: `{ id, name?, categoryValue?, color? }`.
- `associations[]`: `{ id, source, target, associationDirection? }`.

### `color` (`DiColor`)

```ts
{ stroke?: string; fill?: string }  // например "#0d4372", "#bbdefb"
```

Пишется на `bpmndi:BPMNShape` узла как:

- `bioc:stroke` / `bioc:fill`
- `color:border-color` / `color:background-color`

Namespaces на `definitions` добавляются только если в модели есть хотя бы один цвет.

---

## 6. Sequence flow: `IEdge`

Живёт **внутри** процесса (`process.edges` или корневой `edges` в простом режиме).

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | нет | Id потока. По умолчанию: `Flow_${index+1}`. Для тестов лучше стабильные id. |
| `source` | `string` | **да** | Id узла **того же** процесса. |
| `target` | `string` | **да** | Id узла **того же** процесса. |
| `name` | `string` | нет | Подпись (`Yes`, `No`, `Timeout`, …). |

### Правила

- `source` и `target` обязаны существовать среди nodes этого процесса.
- Петли и циклы разрешены (роутер обходит препятствия).
- Несколько рёбер из одного source (развилка) или в один target (слияние) — норма.
- Это **не** message flow: сплошная линия внутри одного пула.

### Ожидания по графу (мягкие)

Конвертер не требует ровно один start/end, но для читаемой BPMN:

- Лучше один `start` (или явный вход) на процесс.
- Терминальные ветки завершать `end`.
- После `eventBasedGateway` исходящие обычно ведут на `intermediateCatch` (timer/message) — layout специально раскладывает такой «компас».

---

## 7. Message flow: `IMessageFlow`

Только на корне (`messageFlows[]`).

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | нет | По умолчанию: `MessageFlow_${index+1}`. |
| `source` | `string` | **да** | Id узла в каком-то процессе. |
| `target` | `string` | **да** | Id узла (обычно в другом процессе). |
| `name` | `string` | нет | Подпись (например `Approved`). |

### Правила

- Оба конца должны существовать среди nodes модели.
- Назначение — связь **между пулами** (пунктир).
- Связывать два узла **одного** процесса через message flow нетипично; внутри пула используйте `edges`.
- Частые цели: `intermediateCatch` с `eventDefinition: "message"` или `start` с message.

### Почему отдельно от `edges`?

В BPMN sequence flow и message flow — разные сущности и живут в разных местах (process vs collaboration). Один общий массив сломал бы семантику.

---

## 8. Data store: `IDataStore`

Корневой `dataStores[]`.

| Поле | Тип | Обязательно | Описание |
| ---- | --- | ----------- | -------- |
| `id` | `string` | **да** | Уникален среди data stores. Ссылки из `dataInputs` / `dataOutputs`. |
| `name` | `string` | нет | Подпись. |
| `color` | `DiColor` | нет | Та же DI-раскраска, что у узлов. |

В XML — `bpmn:dataStoreReference` (не полный каталог `dataStore`). Этого достаточно для диаграммы и ассоциаций.

---

## 9. Матрица уникальности id

| Область | Должны быть уникальны |
| ------- | --------------------- |
| Корневой `id` | На уровне модели (ваша ответственность) |
| `processes[].id` | Среди процессов |
| Все `nodes[].id` | **Глобально** по всем процессам |
| `lanes[].id` | Внутри одного процесса |
| `dataStores[].id` | Среди data stores |
| `dataObjects[].id` | Среди data objects и data stores |
| Artifact ids | Среди annotations, groups, nodes и data references |
| `edges[].id` / `messageFlows[].id` | Желательно уникальны (дефолты по индексу) |

**Почему node id глобальные?** Message flow и карты диаграммы ищут элементы по id во всей коллаборации.

---

## 10. Ошибки валидации (throw)

| Условие | Суть ошибки |
| ------- | ----------- |
| Нет `id` | `ProcessModel.id is required` |
| Нет `processes` и нет `nodes` | нужен `processes[]` или корневой `nodes[]` |
| Процесс без nodes | process must contain nodes |
| `edges` не массив | edges must be an array |
| Дубликат node id в процессе | duplicate node ids |
| Один node id в двух процессах | Duplicate node id across processes |
| Дубликат lane / dataStore id | duplicate ids |
| Неизвестный `laneId` | references unknown laneId |
| Неизвестный store в dataIn/Out | unknown data store |
| Неизвестный source/target у edge | unknown source/target |
| Неизвестный конец message flow | MessageFlow has unknown source/target |

---

## 11. Минимальные примеры

### Простой процесс (без lanes)

```json
{
  "id": "process_1",
  "name": "Simple Process",
  "nodes": [
    { "id": "start", "type": "start" },
    { "id": "task1", "type": "userTask", "name": "Do something" },
    { "id": "end", "type": "end" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "task1" },
    { "id": "e2", "source": "task1", "target": "end" }
  ]
}
```

### Простой с lanes

```json
{
  "id": "Process_Lanes",
  "name": "Lane Test",
  "lanes": [
    { "id": "Lane_User", "name": "User" },
    { "id": "Lane_System", "name": "System" }
  ],
  "nodes": [
    { "id": "start", "type": "start", "laneId": "Lane_User" },
    { "id": "t1", "type": "userTask", "name": "Fill form", "laneId": "Lane_User" },
    { "id": "t2", "type": "serviceTask", "name": "Validate", "laneId": "Lane_System" },
    { "id": "end", "type": "end", "laneId": "Lane_User" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "t1" },
    { "id": "e2", "source": "t1", "target": "t2" },
    { "id": "e3", "source": "t2", "target": "end" }
  ]
}
```

### Набросок коллаборации

```json
{
  "id": "CollabDemo",
  "name": "Two Pools",
  "dataStores": [{ "id": "DS_1", "name": "Shared DB" }],
  "processes": [
    {
      "id": "Process_A",
      "name": "Pool A",
      "lanes": [{ "id": "L1", "name": "Lane 1" }],
      "nodes": [
        { "id": "a_start", "type": "start", "laneId": "L1" },
        {
          "id": "a_wait",
          "type": "eventBasedGateway",
          "laneId": "L1"
        },
        {
          "id": "a_msg",
          "type": "intermediateCatch",
          "eventDefinition": "message",
          "laneId": "L1"
        },
        { "id": "a_end", "type": "end", "laneId": "L1" }
      ],
      "edges": [
        { "source": "a_start", "target": "a_wait" },
        { "source": "a_wait", "target": "a_msg" },
        { "source": "a_msg", "target": "a_end" }
      ]
    },
    {
      "id": "Process_B",
      "name": "Pool B",
      "nodes": [
        { "id": "b_start", "type": "start", "eventDefinition": "timer" },
        {
          "id": "b_notify",
          "type": "task",
          "name": "Notify",
          "dataOutputs": ["DS_1"]
        },
        { "id": "b_end", "type": "end" }
      ],
      "edges": [
        { "source": "b_start", "target": "b_notify" },
        { "source": "b_notify", "target": "b_end" }
      ]
    }
  ],
  "messageFlows": [
    {
      "id": "mf1",
      "name": "Done",
      "source": "b_notify",
      "target": "a_msg"
    }
  ]
}
```

---

## 12. Полная TypeScript-форма (концептуально)

```ts
type ProcessModel = {
  id: string;
  name?: string;

  // Простой режим
  lanes?: { id: string; name: string }[];
  nodes?: INode[];
  edges?: IEdge[];

  // Коллаборация
  processes?: IProcessDef[];
  messageFlows?: IMessageFlow[];
  dataStores?: IDataStore[];
  dataObjects?: IDataObject[];
  textAnnotations?: ITextAnnotation[];
  groups?: IGroup[];
  associations?: IAssociation[];
};

type IProcessDef = {
  id: string;
  name?: string;
  participantId?: string;
  participantName?: string;
  lanes?: { id: string; name: string }[];
  nodes: INode[];
  edges: IEdge[];
};

type INode = {
  id: string;
  type:
    | "start" | "end" | "task" | "userTask" | "serviceTask" | "subProcess"
    | "exclusiveGateway" | "parallelGateway" | "inclusiveGateway" | "complexGateway"
    | "eventBasedGateway" | "intermediateCatch" | "intermediateThrow" | "boundaryEvent";
  name?: string;
  laneId?: string;
  eventDefinition?: EventDefinition;
  eventDefinitions?: EventDefinition[];
  eventDefinitionOptions?: { activityRef?: string; waitForCompletion?: boolean; linkName?: string; linkDirection?: "source" | "target" };
  subProcess?: { nodes: INode[]; edges: IEdge[]; expanded?: boolean; subProcessType?: "event" | "transaction" };
  multiInstance?: boolean | { sequential?: boolean; loopCardinality?: string | number; completionCondition?: string; behavior?: "All" | "One" | "Complex" };
  dataInputs?: string[];
  dataOutputs?: string[];
  dataObjectInputs?: string[];
  dataObjectOutputs?: string[];
  color?: { stroke?: string; fill?: string };
};

type IEdge = { id?: string; source: string; target: string; name?: string };
type IMessageFlow = { id?: string; source: string; target: string; name?: string };
type IDataStore = { id: string; name?: string; color?: { stroke?: string; fill?: string } };
type IDataObject = { id: string; name?: string; isCollection?: boolean; color?: { stroke?: string; fill?: string } };
type ITextAnnotation = { id: string; text: string; color?: { stroke?: string; fill?: string } };
type IGroup = { id: string; name?: string; categoryValue?: string; color?: { stroke?: string; fill?: string } };
type IAssociation = { id: string; source: string; target: string; associationDirection?: "None" | "One" | "Both" };
```

Экспорт пакета: `ProcessModel`, `IProcessDef`, `INode`, `IEdge`, `ILane`, `IMessageFlow`, `IDataStore`, `DiColor`, `NodeType`, `EventDefinition`.

---

## 13. Порядок сборки модели (рекомендация)

1. Выбрать **простой** режим или **коллаборацию**.
2. Задать все **id** (узлы — глобально уникальные).
3. Описать **lanes**, проставить `laneId` на узлах.
4. Провести **edges** внутри каждого процесса (развилки, подписи).
5. Добавить **dataStores** и `dataInputs` / `dataOutputs` на активностях.
6. Добавить **messageFlows** между пулами (обычно в message catch).
7. При необходимости — **color** на start/end/store.
8. Вызвать `convert(model)` и открыть XML в [bpmn.io](https://demo.bpmn.io).

Готовые сложные примеры: `fixtures/models/accounts-payable.ts`, `incident-response.ts`, `advanced-order.ts`.
