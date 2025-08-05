import {
  Stack,
  StackProps,
  aws_ses as ses,
  aws_ec2 as ec2,
  aws_logs as logs,
  RemovalPolicy,
  aws_ecs as ecs,
  aws_iam as iam,
  aws_scheduler as scheduler,
  aws_lambda as lambda,
  Duration,
  aws_lambda_event_sources as lambda_event_sources,
  CfnOutput,
} from "aws-cdk-lib";
import { AmplifyGraphqlApi } from "@aws-amplify/graphql-api-construct";
import { Construct } from "constructs";
import AuthStack from "./auth";
import ApiStack from "./api";

interface BackendStackProps extends StackProps {
  authStack: AuthStack;
  apiStack: ApiStack;
}

export default class ReCapifyBackendStack extends Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const { authStack, apiStack } = props;

    // VPC
    const vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'cluster', {
      vpc: vpc,
    });

    // Task Role
    const taskRole = new iam.Role(this, 'taskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add necessary permissions to the task role
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:*',
        'comprehend:DetectPiiEntities',
        'transcribe:*',
        'bedrock:InvokeModel',
        'ses:SendEmail',
        'ses:SendRawEmail',
      ],
      resources: ['*'],
    }));

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'taskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 1024,
      taskRole: taskRole,
    });

    // Container
    const container = taskDefinition.addContainer('container', {
      image: ecs.ContainerImage.fromAsset('container'),
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'recapify',
        logGroup: new logs.LogGroup(this, 'containerLogGroup', {
          retention: logs.RetentionDays.FIVE,
          removalPolicy: RemovalPolicy.RETAIN,
        }),
      }),
      environment: {
        ENABLE_TEAMS: 'true',  // Enable Teams support
        TABLE_NAME: this.node.tryGetContext('tableName'),
        MEETING_INDEX: this.node.tryGetContext('meetingIndex'),
        EMAIL_SOURCE: authStack.identity.emailIdentityName,
      },
    });

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'securityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
    });
        
    // EventBridge Scheduler Role
    const eventbridgeSchedulerRole = new iam.Role(this, 'eventbridgeSchedulerRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('events.amazonaws.com'),
        new iam.ServicePrincipal('scheduler.amazonaws.com'),
      ),
    });
    
    eventbridgeSchedulerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ecs:RunTask'],
      resources: [taskDefinition.taskDefinitionArn],
    }));
      
    eventbridgeSchedulerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [taskRole.roleArn, taskDefinition.executionRole!.roleArn],
      conditions: {
        StringLike: {
          'iam:PassedToService': 'ecs-tasks.amazonaws.com',
        },
      },
    }));
          
    // Schedule Group
    const scheduleGroup = new scheduler.CfnScheduleGroup(this, 'meetingScheduleGroup', {});
         
    // Lambda Function for Scheduling
    const schedulerFunction = new lambda.Function(this, 'schedulerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'scheduler.handler',
      code: lambda.Code.fromAsset('src/backend'),
      timeout: Duration.seconds(120),
      environment: {
        TASK_DEFINITION_ARN: taskDefinition.taskDefinitionArn,
        ECS_CLUSTER_ARN: cluster.clusterArn,
        SECURITY_GROUPS: JSON.stringify([securityGroup.securityGroupId]),
        SUBNETS: JSON.stringify(vpc.privateSubnets.map(subnet => subnet.subnetId)),
        CONTAINER_ID: container.containerName,
        TABLE_NAME: this.node.tryGetContext('tableName'),
        MEETING_INDEX: this.node.tryGetContext('meetingIndex'),
        EMAIL_SOURCE: authStack.identity.emailIdentityName,
        SCHEDULE_GROUP: scheduleGroup.ref,
        SCHEDULER_ROLE_ARN: eventbridgeSchedulerRole.roleArn,
      },
    });
        
    // Add necessary permissions to the scheduler function
    schedulerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'scheduler:CreateSchedule',
        'scheduler:DeleteSchedule',
        'scheduler:GetSchedule',
        'scheduler:ListSchedules',
        'scheduler:UpdateSchedule',
      ],
      resources: [`arn:aws:scheduler:*:*:schedule/${scheduleGroup.ref}/*`],
    }));
        
    schedulerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [eventbridgeSchedulerRole.roleArn],
      conditions: {
        StringLike: {
          'iam:PassedToService': 'scheduler.amazonaws.com',
        },
      }, 
    }));
    
    // Add DynamoDB Stream as event source
    const table = apiStack.graphApi.resources.tables.Invite;
    schedulerFunction.addEventSource(new lambda_event_sources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      maxBatchingWindow: Duration.seconds(30),
      retryAttempts: 3,
    }));
        
    // Outputs
    new CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });
        
    new CfnOutput(this, 'TaskDefinitionArn', {
      value: taskDefinition.taskDefinitionArn,
      description: 'Task Definition ARN',
    });
    
    new CfnOutput(this, 'LogGroupName', {
      value: container.logGroup?.logGroupName || 'No log group',
      description: 'Container Log Group Name',
    });
        
    new CfnOutput(this, 'VpcId', { 
      value: vpc.vpcId,
      description: 'VPC ID',
    }); 
        
    new CfnOutput(this, 'SecurityGroupId', {
      value: securityGroup.securityGroupId,
      description: 'Security Group ID',
    });
        
    new CfnOutput(this, 'SchedulerFunctionName', {
      value: schedulerFunction.functionName,
      description: 'Scheduler Lambda Function Name',
    }); 
  } 
}

