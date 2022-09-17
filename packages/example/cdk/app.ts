import { App } from 'aws-cdk-lib';
import { LamDBTestStack } from './lamDBTestStack';

const app = new App();

new LamDBTestStack(app, 'lamdb');
