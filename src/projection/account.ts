import { AggregateType, Event } from '../events';
import EventStore from '../library/eventstore';
import Projection from '../library/projection';
import AccountModel, { AccountDocument } from '../model/account';
import AccountEventsModel, { AccountEventsDocument } from '../model/account-events';
import DepositWithdrawalModel, { DepositWithdrawalDocument } from '../model/deposit-withdrawal';
import {mongodbUri} from '../config/mongo';
import mongoose from 'mongoose';

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
    let account: AccountDocument;
    let accountEvents: AccountEventsDocument;
    let depositWithdrawal: DepositWithdrawalDocument;
    let accountEvent: AccountEvent;

    type AccountEvent = {
      username: string,
      fullName: string,
      email: string,
      password: string,
      balance: number,
      totalApprovedWithdrawalAmount: number,
      totalApprovedDepositAmount: number
    }

    await mongoose.connect(mongodbUri);
    mongoose.connection.on('error', console.error);
    
    function newAccountEvent(account: any): AccountEvent{
      accountEvent = {
        username: account.username,
        fullName: account.fullName,
        email: account.email,
        password: account.password,
        balance: account.balance,
        totalApprovedWithdrawalAmount: account.totalApprovedWithdrawalAmount,
        totalApprovedDepositAmount: account.totalApprovedDepositAmount
      }
      return accountEvent as AccountEvent;
    }
    const accountQuery = await AccountModel.findById(event.aggregateId);
    const accountEventsQuery = await AccountEventsModel.findById(event.aggregateId);

    if(event.aggregateType === AggregateType.Account){
      if(event.type == 'AccountCreated'){
        account = {
          _id: event.aggregateId,
          username: event.body.username,
          fullName: event.body.fullName,
          email: event.body.email,
          password: event.body.password,
          balance: 0,
          totalApprovedWithdrawalAmount: 0,
          totalApprovedDepositAmount: 0
        };
        accountEvents = {
          _id: account._id,
          events: [{
            username: account.username,
            fullName: account.fullName,
            email: account.email,
            password: account.password,
            balance: 0,
            totalApprovedWithdrawalAmount: 0,
            totalApprovedDepositAmount: 0
          }]
        };
        await AccountEventsModel.create(
          accountEvents,
          AccountEventsModel.ensureIndexes((err) => {
            if (err) {
              console.log(err.message);
            }
          })
        );
        await AccountModel.create(
          account,
          AccountModel.ensureIndexes((err) => {
            if (err) {
              console.log(err.message);
            }
          }),
        );
      }
      else if(event.type === 'AccountUpdated'){
        let update: any;
        if(accountQuery && accountEventsQuery){
          if(event.body.username){
            update = {username: event.body.username};
          }
          else if(event.body.fullName){
            update = {fullName: event.body.fullName};
          }
          else if(event.body.email){
            update = {email: event.body.email};
          }
          await AccountModel.findByIdAndUpdate(accountQuery._id, {$set: update}, {new: true}).then(async function (acc){
            if(acc){
              await AccountEventsModel.updateOne({_id: accountEventsQuery._id}, {$push: {events: newAccountEvent(acc)}});
            }}).catch(function(err){
              console.log(err);
            });
        };
        
      }
      else if(event.type === 'BalanceCredited' || event.type === 'BalanceDebited'){
        let newBalance: number;
        if(accountQuery && accountEventsQuery){
          event.type === 'BalanceCredited'? newBalance = accountQuery.balance + event.body.amount : newBalance = accountQuery.balance - event.body.amount;
          await AccountModel.findByIdAndUpdate(accountQuery._id, {$set:{balance: newBalance}}, {new: true}).then(async function (acc){
            if(acc){
              await AccountEventsModel.updateOne({_id: accountEventsQuery._id}, {$push: {events: newAccountEvent(acc)}});
            }}).catch(function(err){
              console.log(err);
            });
        }
      }
      
    }
    else if(event.aggregateType === AggregateType.Deposit){
      if(event.type === 'DepositCreated'){
        depositWithdrawal = {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          type: event.type,
          version: event.version,
          body: {
            account: event.body.account,
            balance: event.body.amount
          }
        };
        await DepositWithdrawalModel.create(
          depositWithdrawal,
          DepositWithdrawalModel.ensureIndexes((err) => {
            if(err){
              console.log(err.message);
            }
          })
        );
      }
      else if(event.type === 'DepositApproved'){
        const depositCreatedQuery = await DepositWithdrawalModel.findOne({
          aggregateId: event.aggregateId,
          version: event.version-1
        });
        if(depositCreatedQuery){
          depositWithdrawal = {
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            type: event.type,
            version: event.version,
            body: {}
          };
          await DepositWithdrawalModel.create(
            depositWithdrawal,
            DepositWithdrawalModel.ensureIndexes((err) => {
              if(err){
                console.log(err.message);
              }
            })
          );
          
          const accountQuery = await AccountModel.findById(depositCreatedQuery.body.account);
          const accountEventsQuery = await AccountEventsModel.findById(depositCreatedQuery.body.account);

          if(accountQuery && depositCreatedQuery.body.balance && accountEventsQuery){
            const newTotalApprovedDepositAmount = depositCreatedQuery.body.balance + accountQuery.totalApprovedDepositAmount;
            await AccountModel.findByIdAndUpdate(accountQuery._id, {$set:{totalApprovedDepositAmount: newTotalApprovedDepositAmount}}, {new: true}).then(async function (acc){
              if(acc){
                await AccountEventsModel.updateOne({_id: accountEventsQuery._id}, {$push: {events: newAccountEvent(acc)}});
              }}).catch(function(err){
                console.log(err);
              });  

          }
        }
        
      }
    }
    else if(event.aggregateType === AggregateType.Withdrawal){
      if(event.type === 'WithdrawalCreated'){
        depositWithdrawal = {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          type: event.type,
          version: event.version,
          body: {
            account: event.body.account,
            balance: event.body.amount
          }
        };
        await DepositWithdrawalModel.create(
          depositWithdrawal,
          DepositWithdrawalModel.ensureIndexes((err) => {
            if(err){
              console.log(err.message);
            }
          })
        );
      }
      else if(event.type === 'WithdrawalApproved'){
        const withdrawalCreatedQuery = await DepositWithdrawalModel.findOne({
          aggregateId: event.aggregateId,
          version: event.version-1
        });
        if(withdrawalCreatedQuery){
          depositWithdrawal = {
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            type: event.type,
            version: event.version,
            body: {}
          };
          await DepositWithdrawalModel.create(
            depositWithdrawal,
            DepositWithdrawalModel.ensureIndexes((err) => {
              if(err){
                console.log(err.message);
              }
            })
          );

          const accountQuery = await AccountModel.findById(withdrawalCreatedQuery.body.account);
          const accountEventsQuery = await AccountEventsModel.findById(withdrawalCreatedQuery.body.account);

          if(accountQuery && withdrawalCreatedQuery.body.balance && accountEventsQuery){
            const newTotalApprovedWithdrawalAmount = withdrawalCreatedQuery.body.balance + accountQuery.totalApprovedWithdrawalAmount;

            await AccountModel.findByIdAndUpdate(accountQuery._id, {$set:{totalApprovedWithdrawalAmount: newTotalApprovedWithdrawalAmount}}, {new: true}).then(async function (acc){
              if(acc){
                await AccountEventsModel.updateOne({_id: accountEventsQuery._id}, {$push: {events: newAccountEvent(acc)}});
              }}).catch(function(err){
                console.log(err);
              });  

          }
        } 
      }
    }
  }
}