import {model, Schema} from 'mongoose';

export type DepositWithdrawalDocument = {
    aggregateType: number,
    aggregateId: string,
    type: string,
    version: number,
    body: {
        account?: string,
        balance?: number
    }
}

const depositWithdrawalSchema = new Schema<DepositWithdrawalDocument>({
    aggregateType: {type: Number, required: true},
    aggregateId: {type: String, required: true},
    type: {type: String, required: true},
    version: {type: Number, required: true},
    body: {
        account: {type: String},
        balance: {type: Number}
    }
});

const DepositWithdrawalModel = model<DepositWithdrawalDocument>('DepositWithdrawal', depositWithdrawalSchema);

export default DepositWithdrawalModel;