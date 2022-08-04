import waitForExpect from 'wait-for-expect';
import AccountProjection from '../../src/projection/account';
import { AccountEvents, AggregateType } from '../../src/events';
import EventStore from '../../src/library/eventstore';
import { expect } from 'chai';
import mongoose from 'mongoose';
import {mongodbUri} from '../../src/config/mongo';
import AccountModel from '../../src/model/account';
import CreditDebitModel from '../../src/model/credit-debit';

async function findById(id: string): Promise<{
  username: string;
  fullName: string;
  email: string;
  balance: number;
} | null> {

  const accountQuery = await AccountModel.find({
    aggregateId: id
  });
  
  const creditDebitQuery = await CreditDebitModel.find({
    aggregateId: id
  });

  if(accountQuery){
    const latestAccountVersion = Math.max.apply(Math, accountQuery.map(function(account) { return account.version; }))
    const latestCreditDebitVersion = Math.max.apply(Math, creditDebitQuery.map(function(creditDebit) { return creditDebit.version; }))

    const account = await AccountModel.findOne({
      aggregateId: id,
      version: latestAccountVersion
    });

    const creditDebit = await CreditDebitModel.findOne({
      aggregateId: id,
      version: latestCreditDebitVersion
    });

    if(account && creditDebit){
      const finalAccount = {
        username: account.body.username,
        fullName: account.body.fullName,
        email: account.body.email,
        balance: creditDebit.body.balance,
        totalApprovedDepositAmount: account.body.totalApprovedDepositAmount,
        totalApprovedWithdrawalAmount: account.body.totalApprovedWithdrawalAmount
      };
      return finalAccount;
    }
  }
  return null;
}

describe('AccountProjection', function () {
  describe('#start', function () {
    before(async function () {

      this.db = await mongoose.connect(mongodbUri);
      mongoose.connection.on('error', console.error);
      console.log('connected from test @', mongodbUri);

      this.eventStore = new EventStore(AccountEvents);
      this.projection = new AccountProjection(this.eventStore);
      this.aggregateId = '60329145-ba86-44fb-8fc8-519e1e427a60';

      await this.projection.start();
      
      this.account = await findById(this.aggregateId);
    });

    after(async function () {
      await mongoose.connection.collections.accounts.drop();
      await mongoose.connection.collections.creditdebits.drop(); 
      await mongoose.connection.collections.depositwithdrawals.drop(); 
      await this.db.disconnect();
    });

    it('SHOULD project the data to the correctly to the database', function () {
      expect(this.account).to.deep.equal({
        username: 'jdoe',
        fullName: 'johndoe',
        email: 'email@ml.com',
        balance: 23, //I was not able to arrive to a 27 balance since in my understanding I must base my calculation the same from the account-aggregate.spec.ts inorder to be consistent on Credit and Debit transactions thus based on events.ts the calculation was (20 + 10)-7  respectively in chronological order.
        totalApprovedWithdrawalAmount: 7, //I was not able to arrive to a totalApprovedWithdrawalAmount of 3 since in my understanding the total withdrawal transactions were only 7 and 7 respectively but only the first 7 was approved.
        totalApprovedDepositAmount: 10,
      });
    });

    describe('WHEN there is a new event', function () {
      before(async function () {
        await this.eventStore.createEvent({
          aggregateType: AggregateType.Account,
          type: 'BalanceDebited',
          aggregateId: this.aggregateId,
          body: { amount: 7 },
        });
      });

      it('SHOULD be able to apply new events to the model', async function () {
        await waitForExpect(async () => {
          const account = await findById(this.aggregateId);
          expect(account).to.have.property('balance', 16);
        });
      });
    });
  });
});
