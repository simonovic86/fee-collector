import { prop, getModelForClass, index } from '@typegoose/typegoose';

@index({ chainId: 1, blockNumber: 1, transactionHash: 1 }, { unique: true })
@index({ integrator: 1 })
export class FeeCollectedEvent {
  @prop({ required: true })
  public chainId!: number;

  @prop({ required: true })
  public blockNumber!: number;

  @prop({ required: true })
  public transactionHash!: string;

  @prop({ required: true })
  public token!: string;

  @prop({ required: true })
  public integrator!: string;

  @prop({ required: true })
  public integratorFee!: string;

  @prop({ required: true })
  public lifiFee!: string;

  @prop({ required: true })
  public timestamp!: Date;
}

export const FeeCollectedEventModel = getModelForClass(FeeCollectedEvent); 