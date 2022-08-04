import {model, Schema} from 'mongoose';

export type AccountDocument = {
    aggregateType: number,
    aggregateId: string,
    version: number,
    type: string,
    body: {
        username: string,
        fullName: string,
        email: string,
        password: string,
        totalApprovedWithdrawalAmount: number,
        totalApprovedDepositAmount: number
    }
};

const accountSchema = new Schema<AccountDocument>({
    aggregateType: {type: Number, required: true},
    aggregateId: {type: String, required: true},
    version: {type: Number, required: true},
    type: {type: String, required: true},
    body: {
        username: {type: String},
        fullName: {type: String},
        email: {type: String},
        password: {type: String},
        balance: {type: Number},
        totalApprovedWithdrawalAmount: {type: Number},
        totalApprovedDepositAmount: {type: Number}
    }
});


const AccountModel = model<AccountDocument>('Account', accountSchema);

export default AccountModel;