import { prop, getModelForClass } from '@typegoose/typegoose';

export class LastScannedBlock {
  @prop({ required: true })
  public chainId!: number;

  @prop({ required: true })
  public blockNumber!: number;
}

export const LastScannedBlockModel = getModelForClass(LastScannedBlock); 