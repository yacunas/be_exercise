import { AggregateType, Event } from '../events';
import EventStore from '../library/eventstore';
import Projection from '../library/projection';
import AccountModel, { AccountDocument } from '../model/account';
import CreditDebitModel, { CreditDebitDocument } from '../model/credit-debit';
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
    let creditDebit: CreditDebitDocument;
    let depositWithdrawal: DepositWithdrawalDocument;

    await mongoose.connect(mongodbUri);
    mongoose.connection.on('error', console.error);
    
    if(event.aggregateType === AggregateType.Account){
      if(event.type == 'AccountCreated'){
        account = {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          version: event.version,
          type: event.type,
          body: {
              username: event.body.username,
              fullName: event.body.fullName,
              email: event.body.email,
              password: event.body.password,
              totalApprovedWithdrawalAmount: 0,
              totalApprovedDepositAmount: 0
          }
        };
        creditDebit = {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          type: event.type,
          version: event.version-1,
          body: {
              balance: 0
          }
        };
        await AccountModel.create(
          account,
          AccountModel.ensureIndexes((err) => {
            if(err){
              console.log(err.message);
            }
          })
        );
        await CreditDebitModel.create(
          creditDebit,
          CreditDebitModel.ensureIndexes((err) => {
            if(err){
              console.log(err.message);
            }
          })
        );
      }
      else if(event.type === 'AccountUpdated'){
        const accountQuery = await AccountModel.findOne({
          aggregateId: event.aggregateId,
          version: event.version-1
        });
        if(accountQuery){
          if(event.body.username){
            account = {
              aggregateType: accountQuery.aggregateType,
              aggregateId: accountQuery.aggregateId,
              version: event.version,
              type: event.type,
              body: {
                username: event.body.username,
                fullName: accountQuery.body.fullName,
                password: accountQuery.body.password,
                email: accountQuery.body.email,
                totalApprovedWithdrawalAmount: accountQuery.body.totalApprovedWithdrawalAmount,
                totalApprovedDepositAmount: accountQuery.body.totalApprovedDepositAmount
              }
            };
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
          }
          else if(event.body.fullName){
            account = {
              aggregateType: accountQuery.aggregateType,
              aggregateId: accountQuery.aggregateId,
              version: event.version,
              type: event.type,
              body: {
                username: accountQuery.body.username,
                fullName: event.body.body.fullName,
                password: accountQuery.body.password,
                email: accountQuery.body.email,
                totalApprovedWithdrawalAmount: accountQuery.body.totalApprovedWithdrawalAmount,
                totalApprovedDepositAmount: accountQuery.body.totalApprovedDepositAmount
              }
            };
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
          }
          else if(event.body.email){
            account = {
              aggregateType: accountQuery.aggregateType,
              aggregateId: accountQuery.aggregateId,
              version: event.version,
              type: event.type,
              body: {
                username: accountQuery.body.username,
                fullName: accountQuery.body.fullName,
                password: accountQuery.body.password,
                email: event.body.email,
                totalApprovedWithdrawalAmount: accountQuery.body.totalApprovedWithdrawalAmount,
                totalApprovedDepositAmount: accountQuery.body.totalApprovedDepositAmount
              }
            };
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
          }
        }
      }
      else if(event.type === 'BalanceCredited'){
        const creditDebitQuery = await CreditDebitModel.findOne({
          aggregateId: event.aggregateId,
          version: event.version-1
        });
        if(creditDebitQuery){
          const newBalance = creditDebitQuery.body.balance + event.body.amount;
          creditDebit = {
            aggregateType: creditDebitQuery.aggregateType,
            aggregateId: creditDebitQuery.aggregateId,
            type: event.type,
            version: event.version,
            body: {
              balance: newBalance
            }
          };
          await CreditDebitModel.create(
            creditDebit,
            CreditDebitModel.ensureIndexes((err) => {
              if(err){
                console.log(err.message);
              }
            })
          );
        }
      }
      else if(event.type === 'BalanceDebited'){
        const creditDebitQuery = await CreditDebitModel.findOne({
          aggregateId: event.aggregateId,
          version: event.version-1
        });
        if(creditDebitQuery && creditDebitQuery.body.balance){
          if(creditDebitQuery.body.balance > event.body.amount){
            const newBalance = creditDebitQuery.body.balance - event.body.amount;
            creditDebit = {
              aggregateType: creditDebitQuery.aggregateType,
              aggregateId: creditDebitQuery.aggregateId,
              version: event.version,
              type: event.type,
              body: {
                balance: newBalance
              }
            };
            await CreditDebitModel.create(
              creditDebit,
              CreditDebitModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
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
          const accountsQuery = await AccountModel.find({
            aggregateId: depositCreatedQuery.body.account,
          });
          const latestAccountVersion = Math.max.apply(Math, accountsQuery.map(function(account) { return account.version; }));
          const accountQuery = await AccountModel.findOne({
            aggregateId: depositCreatedQuery.body.account,
            version: latestAccountVersion
          });
          if(accountQuery && depositCreatedQuery.body.balance){
            account = {
              aggregateType: accountQuery.aggregateType,
              aggregateId: accountQuery.aggregateId,
              version: accountQuery.version+1,
              type: event.type,
              body: {
                username: accountQuery.body.username,
                fullName: accountQuery.body.fullName,
                password: accountQuery.body.password,
                email: accountQuery.body.email,
                totalApprovedWithdrawalAmount: accountQuery.body.totalApprovedWithdrawalAmount,
                totalApprovedDepositAmount: depositCreatedQuery.body.balance + accountQuery.body.totalApprovedDepositAmount
              }
            };
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
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
          const accountsQuery = await AccountModel.find({
            aggregateId: withdrawalCreatedQuery.body.account,
          });
          const latestAccountVersion = Math.max.apply(Math, accountsQuery.map(function(account) { return account.version; }));
          const accountQuery = await AccountModel.findOne({
            aggregateId: withdrawalCreatedQuery.body.account,
            version: latestAccountVersion
          });
          if(accountQuery && withdrawalCreatedQuery.body.balance){
            account = {
              aggregateType: accountQuery.aggregateType,
              aggregateId: accountQuery.aggregateId,
              version: accountQuery.version+1,
              type: event.type,
              body: {
                username: accountQuery.body.username,
                fullName: accountQuery.body.fullName,
                password: accountQuery.body.password,
                email: accountQuery.body.email,
                totalApprovedWithdrawalAmount: withdrawalCreatedQuery.body.balance + accountQuery.body.totalApprovedWithdrawalAmount,
                totalApprovedDepositAmount: accountQuery.body.totalApprovedDepositAmount
              }
            };
            await AccountModel.create(
              account,
              AccountModel.ensureIndexes((err) => {
                if(err){
                  console.log(err.message);
                }
              })
            );
          }
        } 
      }
    }
  }
}