import { AccountCreatedEvent, AccountUpdatedEvent, AggregateType, CreditedEvent, DebitEvent } from '../events';
import EventStore from '../library/eventstore';
import Aggregate from '../library/aggregate';
import {AccountNotFoundError, AccountAlreadyExistsError, InsufficientFundError} from '../library/errors';

export type Account = {
  username: string;
  fullName: string;
  password: string;
  email: string;
  balance: number;
};

export type AccountState = Account | null;

type AccountAggregateEvents = AccountCreatedEvent | AccountUpdatedEvent | CreditedEvent | DebitEvent;

export type CurrentAccountState = {
  id:string,
  state:Account
};

export default class AccountAggregate extends Aggregate<AccountState> {
  public currentAccountState:CurrentAccountState[] = [];

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
    let account;
    
    if(event.type == 'AccountCreated'){
      if(this.currentAccountState.length){
        throw new AccountAlreadyExistsError(event.aggregateId);
      }
      account = {
        username: event.body.username,
        fullName: event.body.fullName,
        password: event.body.password,
        email: event.body.email,
        balance: 0
      };
      this.currentAccountState.push({id: event.aggregateId, state:account});
    }
    else if(event.type == 'AccountUpdated'){
      if(this.currentAccountState.length==0){
        throw new AccountNotFoundError(event.aggregateId);
      }
      for(const en of this.currentAccountState){
        if(en.id == event.aggregateId){
          if(event.body.username){
            account = en.state;
            account.username = event.body.username; 
          }
          else if(event.body.fullName){
            account = en.state;
            account.fullName = event.body.fullName;
          }
          else if(event.body.email){
            account = en.state;
            account.email = event.body.email;
          }
          break;
        }
      }
      
    }
    else if(event.type == 'BalanceCredited'){
      if(this.currentAccountState.length==0){
        throw new AccountNotFoundError(event.aggregateId);
      }
      for(const en of this.currentAccountState){
        if(en.id == event.aggregateId){
          account = en.state;
          account.balance += event.body.amount
          break;
        }
      }
    }
    else if(event.type == 'BalanceDebited'){
      if(this.currentAccountState.length==0){
        throw new AccountNotFoundError(event.aggregateId);
      }
      for(const en of this.currentAccountState){
        if(en.id == event.aggregateId){
          account = en.state;
          if(account.balance<event.body.amount){
            throw new InsufficientFundError(event.aggregateId);
          }
          else{
            account.balance -= event.body.amount
            break;
          }
        }
      }
    }
    return account as Account;
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
