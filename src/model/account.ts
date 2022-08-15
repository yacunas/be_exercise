import {model, Schema} from 'mongoose';

export type AccountDocument = {
    _id: string,
    username: string,
    fullName: string,
    email: string,
    password: string,
    balance: number,
    totalApprovedWithdrawalAmount: number,
    totalApprovedDepositAmount: number
};

const accountSchema = new Schema<AccountDocument>({
    _id: {type: String},
    username: {type: String},
    fullName: {type: String},
    email: {type: String},
    password: {type: String},
    balance: {type: Number},
    totalApprovedWithdrawalAmount: {type: Number},
    totalApprovedDepositAmount: {type: Number}
}
);

const AccountModel = model<AccountDocument>('Account', accountSchema);

export default AccountModel;