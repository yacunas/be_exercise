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

    await mongoose.connect(mongodbUri);
    mongoose.connection.on('error', console.error);
    
    function pushAccountEvent(account: AccountDocument, accountEvents: AccountEventsDocument): AccountEventsDocument{
      accountEvents.events.push({
        username: account.username,
        fullName: account.fullName,
        email: account.email,
        password: account.password,
        balance: account.balance,
        totalApprovedWithdrawalAmount: account.totalApprovedWithdrawalAmount,
        totalApprovedDepositAmount: account.totalApprovedDepositAmount
      });
      return accountEvents as AccountEventsDocument;
    }

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
        const accountQuery = await AccountModel.findById(event.aggregateId);
        const accountEventsQuery = await AccountEventsModel.findById(event.aggregateId);

        if(accountQuery && accountEventsQuery){
          if(event.body.username){
            account = {
              _id: accountQuery._id,
              username: event.body.username,
              fullName: accountQuery.fullName,
              password: accountQuery.password,
              balance: accountQuery.balance,
              email: accountQuery.email,
              totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount,
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
          }
          else if(event.body.fullName){
            account = {
              _id: accountQuery._id,
              username: accountQuery.username,
              fullName: event.body.fullName,
              password: accountQuery.password,
              balance: accountQuery.balance,
              email: accountQuery.email,
              totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
          }
          else if(event.body.email){
            account = {
              _id: accountQuery._id,
              username: accountQuery.username,
              fullName: accountQuery.fullName,
              password: accountQuery.password,
              balance: accountQuery.balance,
              email: event.body.email,
              totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
          }
          
          await AccountModel.deleteOne({ _id: accountQuery._id }).then(async function(){
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if (err) {
                  console.log(err.message);
                }
              }),
            );
            AccountEventsModel.updateOne({_id: accountEventsQuery._id}, accountEvents, 
              (err) => {
                if (err) {
                console.log(err.message);
              }
            });
          }).catch(function(err){
            console.log(err);
          });
        };
        
      }
      else if(event.type === 'BalanceCredited'){
        const accountQuery = await AccountModel.findById(event.aggregateId);
        const accountEventsQuery = await AccountEventsModel.findById(event.aggregateId);

        if(accountQuery && accountEventsQuery){
          const newBalance = accountQuery.balance + event.body.amount;
          account = {
            _id: accountQuery._id,
            username: accountQuery.username,
            fullName: accountQuery.fullName,
            email: accountQuery.email,
            password: accountQuery.password,
            balance: newBalance,
            totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
            totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount
          };
          accountEvents = pushAccountEvent(account, accountEventsQuery);

          await AccountModel.deleteOne({ _id: accountQuery._id }).then(async function(){
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if (err) {
                  console.log(err.message);
                }
              }),
            );
            AccountEventsModel.updateOne({_id: accountEventsQuery._id}, accountEvents, 
              (err) => {
                if (err) {
                console.log(err.message);
              }
            });
          }).catch(function(err){
            console.log(err);
          });
        }
      }
      else if(event.type === 'BalanceDebited'){
        const accountQuery = await AccountModel.findById(event.aggregateId);
        const accountEventsQuery = await AccountEventsModel.findById(event.aggregateId);
        
        if(accountQuery && accountQuery.balance && accountEventsQuery){
          if(accountQuery.balance > event.body.amount){
            const newBalance = accountQuery.balance - event.body.amount;            
            account = {
              _id: accountQuery._id,
              username: accountQuery.username,
              fullName: accountQuery.fullName,
              email: accountQuery.email,
              password: accountQuery.password,
              balance: newBalance,
              totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
            await AccountModel.deleteOne({ _id: accountQuery._id }).then(async function(){
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if (err) {
                  console.log(err.message);
                }
              }),
            );
            AccountEventsModel.updateOne({_id: accountEventsQuery._id}, accountEvents, 
              (err) => {
                if (err) {
                console.log(err.message);
              }
            });
          }).catch(function(err){
            console.log(err);
          });
          }
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
            account = {
              _id: accountQuery._id,
              username: accountQuery.username,
              fullName: accountQuery.fullName,
              password: accountQuery.password,
              balance: accountQuery.balance,
              email: accountQuery.email,
              totalApprovedWithdrawalAmount: accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: depositCreatedQuery.body.balance + accountQuery.totalApprovedDepositAmount
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
            await AccountModel.deleteOne({ _id: accountQuery._id }).then(async function(){
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if (err) {
                  console.log(err.message);
                }
              }),
            );
            AccountEventsModel.updateOne({_id: accountEventsQuery._id}, accountEvents, 
              (err) => {
                if (err) {
                console.log(err.message);
              }
            });
              }).catch(function(err){
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
            account = {
              _id: accountQuery._id,
              username: accountQuery.username,
              fullName: accountQuery.fullName,
              password: accountQuery.password,
              balance: accountQuery.balance,
              email: accountQuery.email,
              totalApprovedWithdrawalAmount: withdrawalCreatedQuery.body.balance + accountQuery.totalApprovedWithdrawalAmount,
              totalApprovedDepositAmount: accountQuery.totalApprovedDepositAmount
            };
            accountEvents = pushAccountEvent(account, accountEventsQuery);
            await AccountModel.deleteOne({ _id: accountQuery._id }).then(async function(){
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if (err) {
                  console.log(err.message);
                }
              }),
            );
            AccountEventsModel.updateOne({_id: accountEventsQuery._id}, accountEvents, 
              (err) => {
                if (err) {
                console.log(err.message);
              }
            });
              }).catch(function(err){
              console.log(err);
            });
          }
        } 
      }
    }
  }
}