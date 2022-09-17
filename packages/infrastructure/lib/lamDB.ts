import { Construct } from 'constructs';

export type LamDBProps = {
  name: string;
};

export class LamDB extends Construct {
  constructor(scope: Construct, id: string, _: LamDBProps) {
    super(scope, id);
  }
}
