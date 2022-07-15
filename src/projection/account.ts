import { AggregateType, Event } from '../events';
import EventStore from '../library/eventstore';
import Projection from '../library/projection';

export default class AccountProjection extends Projection {
  public constructor(eventStore: EventStore) {
    super(
      eventStore,
      [
        { aggregateType: AggregateType.Account },
        { aggregateType: AggregateType.Deposit },
        { aggregateType: AggregateType.Withdrawal },
      ],
    );
  }

  protected async apply(event: Event) {
    // TODO: Implement this method, to maintain a state in your database.
    // You can choose any database of your own, but suggested is MongoDB.
  }
}