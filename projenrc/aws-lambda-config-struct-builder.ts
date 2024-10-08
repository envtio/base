import * as path from "path";
import { CollectionKind, PrimitiveType } from "@jsii/spec";
import { ProjenStruct, Struct } from "@mrgrain/jsii-struct-builder";
import { Component, typescript } from "projen";

/**
 * LambdaPermissionConfig without functionName
 */
export class LambdaPermissionConfigStructBuilder extends Component {
  constructor(project: typescript.TypeScriptProject) {
    super(project);
    const struct = new ProjenStruct(project, {
      name: "PermissionConfig",
      description:
        "Config for external source (like an EventBridge Rule, SNS, or S3) permission to access the Lambda function",
      filePath: path.join(
        project.srcdir,
        "aws",
        "compute",
        "permission-config.generated.ts",
      ),
    });

    struct
      .mixin(
        Struct.fromFqn(
          "@cdktf/provider-aws.lambdaPermission.LambdaPermissionConfig",
        ),
      )
      .omit("functionName")
      .add({
        name: "dependees",
        type: {
          collection: {
            kind: CollectionKind.Array,
            elementtype: {
              fqn: "cdktf.ITerraformResource",
            },
          },
        },
        optional: true,
        docs: {
          summary: "A list of resources that depend on this permission.",
        },
      });
  }
}

/**
 * LambdaFunctionUrlConfig without functionName
 */
export class LambdaFunctionUrlConfigStructBuilder extends Component {
  constructor(project: typescript.TypeScriptProject) {
    super(project);
    const struct = new ProjenStruct(project, {
      name: "UrlConfig",
      description:
        "Config for Lambda function URL resource. A function URL is a dedicated HTTP(S) endpoint for a Lambda function.",
      filePath: path.join(
        project.srcdir,
        "aws",
        "compute",
        "url-config.generated.ts",
      ),
    });

    struct
      .mixin(
        Struct.fromFqn(
          "@cdktf/provider-aws.lambdaFunctionUrl.LambdaFunctionUrlConfig",
        ),
      )
      .omit("functionName");
  }
}

/**
 * LambdaFunctionEventInvokeConfig without functionName
 */
export class LambdaEventSourceMappingConfigStructBuilder extends Component {
  constructor(project: typescript.TypeScriptProject) {
    super(project);
    const struct = new ProjenStruct(project, {
      name: "EventSourceMappingConfig",
      description: [
        "Provides a Lambda event source mapping..",
        " * This allows Lambda functions to get events from Kinesis, DynamoDB, SQS, Amazon MQ and Managed Streaming for Apache Kafka (MSK)",
        " * For information about event source mappings, see",
        " * [CreateEventSourceMapping](http://docs.aws.amazon.com/lambda/latest/dg/API_CreateEventSourceMapping.html) in the API docs.",
      ].join("\n"),
      filePath: path.join(
        project.srcdir,
        "aws",
        "compute",
        "event-source-mapping-config.generated.ts",
      ),
    });

    struct
      .mixin(
        Struct.fromFqn(
          "@cdktf/provider-aws.lambdaEventSourceMapping.LambdaEventSourceMappingConfig",
        ),
      )
      .omit("id", "functionName");
  }
}

/**
 * LambdaFunctionEventInvokeConfig without functionName
 */
export class lambdaFunctionEventInvokeConfigStructBuilder extends Component {
  constructor(project: typescript.TypeScriptProject) {
    super(project);
    const struct = new ProjenStruct(project, {
      name: "EventInvokeConfig",
      description: [
        "Manages an asynchronous invocation configuration for a Lambda Function.",
        " * More information about asynchronous invocations",
        " * and the configurable values can be found in the",
        " * [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html).",
      ].join("\n"),
      filePath: path.join(
        project.srcdir,
        "aws",
        "compute",
        "event-invoke-config.generated.ts",
      ),
    });

    struct
      .mixin(
        Struct.fromFqn(
          "@cdktf/provider-aws.lambdaFunctionEventInvokeConfig.LambdaFunctionEventInvokeConfigConfig",
        ),
      )
      .omit("id", "functionName");
  }
}

/**
 * LambdaFunctionVpcConfig without functionName
 */
export class LambdaFunctionVpcConfigStructBuilder extends Component {
  constructor(project: typescript.TypeScriptProject) {
    super(project);
    const struct = new ProjenStruct(project, {
      name: "VpcConfig",
      description: [
        "Config for network connectivity to AWS resources in a VPC, specify a list",
        " * of security groups and subnets in the VPC.",
        " * When you connect a function to a VPC, it can only access resources and the internet through that VPC.",
        " *",
        " * See [VPC Settings](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html).",
      ].join("\n"),
      filePath: path.join(
        project.srcdir,
        "aws",
        "compute",
        "function-vpc-config.generated.ts",
      ),
    });

    struct
      .mixin(
        Struct.fromFqn(
          "@cdktf/provider-aws.lambdaFunction.LambdaFunctionVpcConfig",
        ),
      )
      .add(
        {
          name: "vpcId",
          type: {
            primitive: PrimitiveType.String,
          },
          optional: true,
          docs: {
            summary:
              "The VPC ID, required if `securityGroupIds` are not provided",
          },
        },
        {
          name: "egress",
          optional: true,
          type: {
            collection: {
              kind: CollectionKind.Array,
              elementtype: {
                fqn: "@cdktf/provider-aws.securityGroup.SecurityGroupEgress",
              },
            },
          },
          docs: {
            summary:
              "Egress rules, used for created securityGroup if `securityGroupIds` are not provided",
            default: "egress world",
          },
        },
      )
      .update("securityGroupIds", {
        optional: true,
        docs: {
          default: "created",
        },
      });
  }
}
