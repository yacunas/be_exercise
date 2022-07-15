import { AggregateType, Event } from '../events';
import EventStore from './eventstore';

export default abstract class Aggregate<T> {
  protected version: number = 0;
  protected id: string;
  protected _state: T;
  private eventStore: EventStore;

  public constructor(id: string, initialState: T, eventStore: EventStore) {
    this.id = id;
    this._state = initialState;
    this.eventStore = eventStore;
  }

  /**
   * Fold processes all the events on the eventstore 
   */
  protected fold() {
    for (const event of this.eventStore.getEvents({ aggregateId: this.id, afterVersion: this.version })) {
      this._state = this.apply(event);
      this.version = event.version;
    }
  }

  public get state() {
    return this._state;
  }

  abstract get aggregateType(): AggregateType;

  protected abstract apply(event: Event): T;

  protected createEvent(
    type: string,
    body: any,
  ) {
    this.fold();
    const event = {
      aggregateId: this.id,
      aggregateType: this.aggregateType,
      type,
      body,
      version: this.version + 1,
    };

    this._state = this.apply(event);
    this.eventStore.createEvent(event);
  }
}
