import { App } from 'aws-cdk-lib';
import { LamDBTestStack } from './lamdbTestStack';

const app = new App();

new LamDBTestStack(app, 'lamdb');
