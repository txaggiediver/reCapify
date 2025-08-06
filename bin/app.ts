#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import AuthStack from '../lib/auth';
import ApiStack from '../lib/api';
import FrontendStack from '../lib/frontend';

const app = new cdk.App();

// Environment configuration (you can adjust this as needed)
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Create the Auth stack
const authStack = new AuthStack(app, 'ReCapify-Auth', {
  env: env,
  // Add any other props needed for AuthStack
});

// Create the API stack
const apiStack = new ApiStack(app, 'ReCapify-Api', {
  env: env,
  userPoolId: authStack.userPool.userPoolId,
  // Add any other props needed for ApiStack
});

// Create the Frontend stack
const frontendStack = new FrontendStack(app, 'ReCapify-Frontend', {
  env: env,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  graphApiUrl: apiStack.graphqlUrl, // Make sure this property exists in your ApiStack
});

// Add dependencies
apiStack.addDependency(authStack);
frontendStack.addDependency(authStack);
frontendStack.addDependency(apiStack);

// Add tags to all stacks
cdk.Tags.of(app).add('project', 'ReCapify');

app.synth();

