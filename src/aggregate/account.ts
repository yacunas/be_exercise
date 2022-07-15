import { AccountCreatedEvent, AccountUpdatedEvent, AggregateType, CreditedEvent, DebitEvent } from '../events';
import EventStore from '../library/eventstore';
import Aggregate from '../library/aggregate';

export type Account = {
  username: string;
  fullName: string;
  password: string;
  email: string;
  balance: number;
};

export type AccountState = Account | null;

type AccountAggregateEvents = AccountCreatedEvent | AccountUpdatedEvent | CreditedEvent | DebitEvent;

export default class AccountAggregate extends Aggregate<AccountState> {

  public static findById(id: string, eventStore: EventStore): AccountAggregate {
    const account = new AccountAggregate(id, eventStore);
    account.fold();
    return account;
  }

  public get aggregateType() {
    return AggregateType.Account;
  }

  constructor (id: string, eventStore: EventStore) {
    super(id, null, eventStore);
  }

  /**
   * This method will be called for each event that will be processed by the aggregate
   * that is from the eventstore.
   * @param event 
   * @returns 
   */
  protected apply(event: AccountAggregateEvents): AccountState {
    // TODO: Implement this method

    return null;
  }
 
  public static createAccount(id: string, info: Omit<Account, 'balance'>, eventStore: EventStore) {
    const account = this.findById(id, eventStore);
    account.createEvent('AccountCreated', info);
    return id;
  }

  public updateAccount(info: Partial<Omit<Account, 'balance'>>) {
    this.createEvent('AccountUpdated', info);
    return true;
  }

  public creditBalance(amount: number) {
    this.createEvent('BalanceCredited', { amount });
    return true;
  }

  public debitBalance(amount: number) {
    this.createEvent('BalanceDebited', { amount });
    return true;
  }
}
