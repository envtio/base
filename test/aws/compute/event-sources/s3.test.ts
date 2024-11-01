import { lambdaPermission, s3BucketNotification } from "@cdktf/provider-aws";
import { Testing } from "cdktf";
import "cdktf/lib/testing/adapters/jest";
import { TestFunction } from "./test-function";
import { compute, storage, AwsSpec } from "../../../../src/aws";

/* eslint-disable quote-props */

describe("S3EventSource", () => {
  let spec: AwsSpec;
  beforeEach(() => {
    spec = new AwsSpec(Testing.app(), `TestSpec`, {
      environmentName: "Test",
      gridUUID: "123e4567-e89b-12d3",
      providerConfig: {
        region: "us-east-1",
      },
      gridBackendConfig: {
        address: "http://localhost:3000",
      },
    });
  });

  test("sufficiently complex example", () => {
    // GIVEN
    const fn = new TestFunction(spec, "Fn");
    const bucket = new storage.Bucket(spec, "B");

    // WHEN
    fn.addEventSource(
      new compute.sources.S3EventSource(bucket, {
        events: [
          storage.EventType.OBJECT_CREATED,
          storage.EventType.OBJECT_REMOVED,
        ],
        filters: [{ prefix: "prefix/" }, { suffix: ".png" }],
      }),
    );

    // THEN
    // Do prepare run to resolve all Terraform resources
    spec.prepareStack();
    const synthesized = Testing.synth(spec);
    // expect(synthesized).toMatchSnapshot();
    expect(synthesized).toHaveResourceWithProperties(
      s3BucketNotification.S3BucketNotification,
      {
        bucket: "${aws_s3_bucket.B_08E7C7AF.bucket}",
        depends_on: [
          "aws_lambda_permission.B_AllowBucketNotificationsToTestSpecFn8E22E968_196884FE",
        ],
        eventbridge: false,
        lambda_function: [
          {
            events: ["s3:ObjectCreated:*"],
            filter_prefix: "prefix/", // TODO: does terraform allow prefix and suffix on same filter?
            lambda_function_arn: "${aws_lambda_function.Fn_9270CBC0.arn}",
          },
          {
            events: ["s3:ObjectCreated:*"],
            filter_suffix: ".png",
            lambda_function_arn: "${aws_lambda_function.Fn_9270CBC0.arn}",
          },
          {
            events: ["s3:ObjectRemoved:*"],
            filter_prefix: "prefix/",
            lambda_function_arn: "${aws_lambda_function.Fn_9270CBC0.arn}",
          },
          {
            events: ["s3:ObjectRemoved:*"],
            filter_suffix: ".png",
            lambda_function_arn: "${aws_lambda_function.Fn_9270CBC0.arn}",
          },
        ],
      },
    );
    expect(synthesized).toHaveResourceWithProperties(
      lambdaPermission.LambdaPermission,
      {
        action: "lambda:InvokeFunction",
        function_name: "${aws_lambda_function.Fn_9270CBC0.arn}",
        principal: "s3.amazonaws.com",
        source_account: "${data.aws_caller_identity.CallerIdentity.account_id}",
        source_arn: "${aws_s3_bucket.B_08E7C7AF.arn}",
      },
    );
    // Template.fromStack(spec).hasResourceProperties(
    //   "Custom::S3BucketNotifications",
    //   {
    //     NotificationConfiguration: {
    //       LambdaFunctionConfigurations: [
    //         {
    //           Events: ["s3:ObjectCreated:*"],
    //           Filter: {
    //             Key: {
    //               FilterRules: [
    //                 {
    //                   Name: "prefix",
    //                   Value: "prefix/",
    //                 },
    //                 {
    //                   Name: "suffix",
    //                   Value: ".png",
    //                 },
    //               ],
    //             },
    //           },
    //           LambdaFunctionArn: {
    //             "Fn::GetAtt": ["Fn9270CBC0", "Arn"],
    //           },
    //         },
    //         {
    //           Events: ["s3:ObjectRemoved:*"],
    //           Filter: {
    //             Key: {
    //               FilterRules: [
    //                 {
    //                   Name: "prefix",
    //                   Value: "prefix/",
    //                 },
    //                 {
    //                   Name: "suffix",
    //                   Value: ".png",
    //                 },
    //               ],
    //             },
    //           },
    //           LambdaFunctionArn: {
    //             "Fn::GetAtt": ["Fn9270CBC0", "Arn"],
    //           },
    //         },
    //       ],
    //     },
    //   },
    // );
  });

  // test("test S3EventSource with IBucket", () => {
  //   // GIVEN
  //   const fn = new TestFunction(spec, "Fn");
  //   const bucket = storage.Bucket.fromBucketName(spec, "Bucket", "bucket-name");

  //   // WHEN
  //   fn.addEventSource(
  //     new compute.sources.S3EventSource(bucket, {
  //       events: [
  //         storage.EventType.OBJECT_CREATED,
  //         storage.EventType.OBJECT_REMOVED,
  //       ],
  //       filters: [{ prefix: "prefix/" }, { suffix: ".png" }],
  //     }),
  //   );

  //   // THEN
  //   Template.fromStack(spec).hasResourceProperties(
  //     "Custom::S3BucketNotifications",
  //     {
  //       NotificationConfiguration: {
  //         LambdaFunctionConfigurations: [
  //           {
  //             Events: ["s3:ObjectCreated:*"],
  //             Filter: {
  //               Key: {
  //                 FilterRules: [
  //                   {
  //                     Name: "prefix",
  //                     Value: "prefix/",
  //                   },
  //                   {
  //                     Name: "suffix",
  //                     Value: ".png",
  //                   },
  //                 ],
  //               },
  //             },
  //             LambdaFunctionArn: {
  //               "Fn::GetAtt": ["Fn9270CBC0", "Arn"],
  //             },
  //           },
  //           {
  //             Events: ["s3:ObjectRemoved:*"],
  //             Filter: {
  //               Key: {
  //                 FilterRules: [
  //                   {
  //                     Name: "prefix",
  //                     Value: "prefix/",
  //                   },
  //                   {
  //                     Name: "suffix",
  //                     Value: ".png",
  //                   },
  //                 ],
  //               },
  //             },
  //             LambdaFunctionArn: {
  //               "Fn::GetAtt": ["Fn9270CBC0", "Arn"],
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   );
  // });
});