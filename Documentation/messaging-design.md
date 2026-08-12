# Messaging Design (RabbitMQ / Azure Service Bus)

Phase 4 (Days 16-18). Covers what's actually built plus the design notes
required at the Phase 4 gate — retry/DLQ, idempotency, and the Azure
Service Bus boundary — per `ActionPlan.txt` Day 18. Retry/DLQ are design
notes only here; nothing below is implemented beyond what Days 16-17 built.

## Current implementation (Days 16-17)

- `IntegrationEvent` (`Shared.Events/Base/`) — base convention every event
  inherits: `EventId`, `OccurredAtUtc`.
- `UserRegisteredEvent` (`Shared.Events/User/`) — `UserId`, `Email`,
  `FullName`.
- `IEventPublisher` (`Shared.Events/Publishing/`) —
  `PublishAsync<TEvent>(TEvent, CancellationToken)` where
  `TEvent : IntegrationEvent`. The only messaging type Application-layer
  code (`RegisterUserHandler`) depends on.
- `RabbitMqEventPublisher` (`User.Infrastructure/Messaging/`) — one
  long-lived `IConnection` (singleton), a short-lived `IChannel` per
  publish, durable fanout exchange `examvault.events`, JSON body, message
  `Type` property set to the event's class name.
- `OnlineExamSystem.NotificationService.Worker` — a `BackgroundService`
  that declares/binds a durable queue (`notification-service.events`) to
  the fanout exchange and logs any `UserRegisteredEvent` it receives.
  `autoAck: true` — the queue is acked the instant a message is delivered,
  before the handler runs. This is the Day 17 foundation, not the full
  Phase 9 Notification Service.

## Retry / DLQ design (not implemented — design notes only)

**Publish side.** `RabbitMqEventPublisher.PublishAsync` currently lets a
failure (e.g. RabbitMQ unreachable) bubble up out of `RegisterUserHandler`,
failing the whole registration request — the known Day 17 tradeoff. Two
options for later, neither built yet:

1. **Outbox pattern** — write the event to a `UserOutbox` table in the
   same DB transaction as the user row, and have a separate dispatcher
   publish from the outbox with retry. Decouples "user saved" from "event
   published" and survives RabbitMQ downtime entirely. This is the correct
   fix once another service actually depends on this event arriving
   reliably (Phase 9 Notification Service is the first real candidate).
2. **Retry-with-backoff** around `PublishAsync` (e.g. Polly). Cheaper,
   reduces the "RabbitMQ blip fails registration" case day-to-day, but
   doesn't solve the atomicity gap — a crash between the DB commit and the
   publish can still lose the event.

**Consume side.** `UserRegisteredConsumer` uses `autoAck: true` — simplest
for a foundation, but a Worker crash mid-handler loses the message with no
redelivery. Production hardening: manual ack (`autoAck: false`), ack only
after the handler completes, `nack`/`requeue: false` on unrecoverable
errors.

**Dead-lettering.** RabbitMQ's `x-dead-letter-exchange` queue argument
routes nacked/rejected/expired messages to a `examvault.events.dlq` queue
instead of dropping them. Not wired up — it needs manual ack first (an
auto-acked message can't be dead-lettered, it's already gone).

## Idempotency considerations

RabbitMQ's delivery guarantee here is **at-least-once**, not
exactly-once — a redelivered message (after a requeue, a consumer
restart, or a publisher retry per the options above) is an expected case,
not a bug. `IntegrationEvent.EventId` exists specifically so a consumer
can dedupe: track "have I already processed this `EventId`" (a small
processed-events table, or a distributed cache set) before acting, and
treat a repeat as a no-op.

`UserRegisteredConsumer` today only logs, so duplicate delivery is
harmless by construction. This becomes load-bearing the moment a real
consumer has a side effect — sending a welcome email, writing a
`Notification` row — which is exactly what Phase 9's Notification Service
will do.

## Azure Service Bus implementation boundary

`IEventPublisher` is the swap point. `RabbitMqEventPublisher` is the local
implementation; an `AzureServiceBusEventPublisher` implementing the same
interface would be the cloud one. Application-layer code only ever depends
on `IEventPublisher`, never on `RabbitMQ.Client` directly — so the swap is
a DI registration change in `Program.cs` (`AddSingleton<IEventPublisher,
...>`), not an Application-layer change.

The consumer side isn't behind an interface yet — `UserRegisteredConsumer`
talks to `RabbitMQ.Client` directly, because it's a throwaway Day 17
foundation, not Application-layer code. A real Azure Service Bus consumer
would be a separate `BackgroundService` implementation. No `IEventConsumer`
abstraction exists, and one isn't worth introducing until Phase 9 has more
than one consumer to generalize from.

Concrete mapping for when the swap happens:

| RabbitMQ (local)                    | Azure Service Bus (cloud)          |
|--------------------------------------|--------------------------------------|
| Fanout exchange (`examvault.events`) | Topic                                |
| Queue bound to the exchange          | Subscription on the topic            |
| `BasicProperties.Type`               | Message `ApplicationProperties`/label |
| `x-dead-letter-exchange` argument    | Built-in per-subscription DLQ (simpler — no manual wiring) |

Not switching now — "RabbitMQ locally, Azure Service Bus in the cloud" is
a locked-in project principle (`ActionPlan.txt` / `README.md`). This
section defines the boundary for Phase 10, it isn't a decision to build
the Azure client yet.

## Verified end-to-end (2026-08-12)

Re-ran the Day 17 verification at the Phase 4 gate: started RabbitMQ
(Docker), started the Worker, registered a user via `curl` through
`User.API`, confirmed the Worker logged the `UserRegisteredEvent` with a
matching `UserId`/`Email`/`FullName`. No regressions. `dotnet build` /
`dotnet test` (24/24) green.
