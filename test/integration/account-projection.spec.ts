import waitForExpect from 'wait-for-expect';
import AccountProjection from '../../src/projection/account';
import { AccountEvents, AggregateType } from '../../src/events';
import EventStore from '../../src/library/eventstore';
import { expect } from 'chai';
import mongoose from 'mongoose';
import {mongodbUri} from '../../src/config/mongo';
import AccountModel from '../../src/model/account';

async function findById(id: string): Promise<{
  username: string;
  fullName: string;
  email: string;
  balance: number;
} | null> {
  return await AccountModel.findById(id, {_id: 0, __v: 0, password: 0}).lean();
}

describe('AccountProjection', function () {
  describe('#start', function () {
    before(async function () {

      this.db = await mongoose.connect(mongodbUri);
      mongoose.connection.on('error', console.error);

      this.eventStore = new EventStore(AccountEvents);
      this.projection = new AccountProjection(this.eventStore);
      this.aggregateId = '60329145-ba86-44fb-8fc8-519e1e427a60';

      await this.projection.start();
      
      this.account = await findById(this.aggregateId);
    });

    after(async function () {
      await mongoose.connection.collections.accounts.drop();
      await mongoose.connection.collections.accountevents.drop();
      await mongoose.connection.collections.depositwithdrawals.drop(); 
      await this.db.disconnect();
    });

    it('SHOULD project the data to the correctly to the database', function () {
      expect(this.account).to.deep.equal({
        username: 'jdoe',
        fullName: 'johndoe',
        email: 'email@ml.com',
        balance: 23,
        totalApprovedWithdrawalAmount: 7,
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
