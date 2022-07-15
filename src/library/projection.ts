import Queue from 'p-queue';
import EventEmitter from 'events';

import { AggregateType, Event } from '../events';
import EventStore from './eventstore';

export default abstract class Projection {
  private _queue = new Queue({ concurrency: 1 });
  private _subscriber: EventEmitter | null = null;

  constructor(
    private _eventStore: EventStore,
    private _eventTypes: { type?: string; aggregateType: AggregateType }[]
  ) {}

  public async start() {
    for (const event of this._eventStore.getEvents()) {
      await this.apply(event);
    }

    this._subscriber = this._eventStore.subscribe(this._eventTypes)
      .on('event', async (event: Event) => this._queue.add(() => this.apply(event)));
  }

  public async stop() {
    if (!this._subscriber) {
      return;
    }

    this._subscriber.removeAllListeners();
    this._subscriber = null;
    await this._queue.onIdle();
  }

  protected abstract apply (event: Event): Promise<void>;
}