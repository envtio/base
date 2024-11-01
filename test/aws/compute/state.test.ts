import { sfnStateMachine } from "@cdktf/provider-aws";
import { Testing } from "cdktf";
import "cdktf/lib/testing/adapters/jest";
import { FakeTask } from "./fake-task";
import { innerJson } from "./private/render-util";
import { AwsSpec } from "../../../src/aws";
import {
  DefinitionBody,
  JsonPath,
  StateMachine,
} from "../../../src/aws/compute";

const gridUUID = "123e4567-e89b-12d3";

test("JsonPath.DISCARD can be used to discard a state's output", () => {
  // GIVEN
  const app = Testing.app();
  const spec = new AwsSpec(app, `TestSpec`, {
    environmentName: "Test",
    gridUUID,
    providerConfig: {
      region: "us-east-1",
    },
    gridBackendConfig: {
      address: "http://localhost:3000",
    },
  });
  const task = new FakeTask(spec, "my-state", {
    inputPath: JsonPath.DISCARD,
    outputPath: JsonPath.DISCARD,
    resultPath: JsonPath.DISCARD,
  });
  new StateMachine(spec, "state-machine", {
    definitionBody: DefinitionBody.fromChainable(task),
  });

  // THEN
  // Do prepare run to resolve all Terraform resources
  spec.prepareStack();
  const synthesized = Testing.synth(spec);
  // expect(synthesized).toMatchSnapshot();
  expect(
    innerJson(synthesized, sfnStateMachine.SfnStateMachine, {
      id: "state-machine_3BB5DA23",
      field: "definition",
    }),
  ).toMatchObject({
    States: {
      "my-state": {
        InputPath: null,
        OutputPath: null,
        ResultPath: null,
      },
    },
  });
});