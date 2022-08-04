import {model, Schema} from 'mongoose';


export type CreditDebitDocument = {
    aggregateType: number,
    aggregateId: string,
    type: string,
    version: number,
    body: {
        balance: number
    }
}

const creditDebitSchema = new Schema<CreditDebitDocument>({
    aggregateType: {type: Number, required: true},
    aggregateId: {type: String, required: true},
    type: {type: String, required: true},
    version: {type: Number, required: true},
    body: {
        balance: {type: Number}
    }
});

const CreditDebitModel = model<CreditDebitDocument>('CreditDebit', creditDebitSchema);

export default CreditDebitModel;