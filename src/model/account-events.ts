import {model, Schema} from 'mongoose';

export type AccountEventsDocument = {
    _id: string,
    events: [{
        username: string,
        fullName: string,
        email: string,
        password: string,
        balance: number,
        totalApprovedWithdrawalAmount: number,
        totalApprovedDepositAmount: number
    }]
};

const accountsEventSchema = new Schema<AccountEventsDocument>({
    _id: {type: String},
    events: [{
        username: {type: String},
        fullName: {type: String},
        email: {type: String},
        password: {type: String},
        balance: {type: Number},
        totalApprovedWithdrawalAmount: {type: Number},
        totalApprovedDepositAmount: {type: Number}
    }]
}
);

const AccountEventsModel = model<AccountEventsDocument>('AccountEvents', accountsEventSchema);

export default AccountEventsModel;