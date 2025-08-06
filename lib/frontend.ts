import {
    StackProps,
    aws_s3 as s3,
    Stack,
    RemovalPolicy,
    aws_wafv2 as waf,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as cloudfront_origins,
    aws_lambda as lambda,
    aws_s3_deployment as s3_deployment,
    CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { execSync } from "child_process";
import { createManagedRules } from "./utils/rules";

interface FrontendStackProps extends StackProps {
    userPoolId: string;
    userPoolClientId: string;
    graphApiUrl: string;
}

export default class FrontendStack extends Stack {
    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        const loggingBucket = new s3.Bucket(this, "loggingBucket", {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
        });

        const websiteBucket = new s3.Bucket(this, "websiteBucket", {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            serverAccessLogsBucket: loggingBucket,
            serverAccessLogsPrefix: "website/",
        });

        const distributionWebAcl = new waf.CfnWebACL(
            this,
            "distributionWebAcl",
            {
                defaultAction: { allow: {} },
                scope: "CLOUDFRONT",
                visibilityConfig: {
                    metricName: "distributionWebAcl",
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                },
                rules: createManagedRules("Distribution", [
                    "AWSManagedRulesAmazonIpReputationList",
                    "AWSManagedRulesCommonRuleSet",
                    "AWSManagedRulesKnownBadInputsRuleSet",
                ]),
            }
        );

        const distribution = new cloudfront.Distribution(this, "distribution", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new cloudfront_origins.S3Origin(websiteBucket),
                viewerProtocolPolicy:
                    cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
                {
                    httpStatus: 403,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
            ],
            webAclId: distributionWebAcl.attrArn,
            logBucket: loggingBucket,
            logIncludesCookies: true,
            logFilePrefix: "distribution",
        });

        const websitePath = "./src/frontend";
        const websiteBundle = s3_deployment.Source.asset(websitePath, {
            bundling: {
                image: lambda.Runtime.NODEJS_20_X.bundlingImage,
                local: {
                    tryBundle(outputDirectory: string) {
                        try {
                            execSync(
                                [
                                    `cd ${websitePath}`,
                                    "npm install",
                                    "npm run build",
                                    `cp -r dist/* ${outputDirectory}/`,
                                ].join(" && ")
                            );
                            return true;
                        } catch (error) {
                            console.error('Local bundling failed:', error);
                            return false;
                        }
                    },
                },
                command: [
                    'bash', '-c',
                    `cd ${websitePath} && npm install && npm run build && cp -r dist/* /asset-output/`
                ],
            },
        });

        const config = {
            userPoolId: props.userPoolId,
            userPoolClientId: props.userPoolClientId,
            graphApiUrl: props.graphApiUrl,
        };

        new s3_deployment.BucketDeployment(this, "websiteDeployment", {
            sources: [
                websiteBundle,
                s3_deployment.Source.jsonData("config.json", config),
            ],
            destinationBucket: websiteBucket,
            distribution: distribution,
            distributionPaths: ["/*"],
        });

        new CfnOutput(this, "WebsiteURL", {
            value: `https://${distribution.distributionDomainName}`,
            description: "Website URL",
        });

        new CfnOutput(this, "BucketName", {
            value: websiteBucket.bucketName,
            description: "Website Bucket Name",
        });
    }
}

