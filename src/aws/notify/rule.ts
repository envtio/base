import {
  cloudwatchEventRule,
  cloudwatchEventTarget,
  //schedulerScheduleGroup //TODO: support scheduler groups?
} from "@cdktf/provider-aws";
import { Lazy } from "cdktf";
import { Construct } from "constructs";
// import { Statement } from "iam-floyd";
import { AwsBeaconBase, IAwsBeacon, AwsBeaconProps } from "..";
import { RuleConfig, TargetConfig, Schedule, EventPattern } from "./";
import { mergeEventPattern, renderEventPattern } from "./util";
// import { ServiceRole, IServiceRole } from "../iam";

export interface RuleProps extends AwsBeaconProps, RuleConfig {
  /**
   * Rule Name suffix to append to Grid UUID
   *
   * Rule names must be made up of only uppercase and lowercase ASCII letters,
   * numbers, underscores, and hyphens, and Due to the length of the tf generated
   * suffix, must be 38 characters or less long.
   *
   *
   * @default - No suffix
   */
  readonly nameSuffix?: string;

  /**
   * The schedule or rate (frequency) that determines when EventBridge
   * runs the rule.
   *
   * You must specify this property, the `eventPattern` property, or both.
   *
   * For more information, see Schedule Expression Syntax for
   * Rules in the Amazon EventBridge User Guide.
   *
   * @see https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduled-events.html
   *
   * @default - None.
   */
  readonly schedule?: Schedule;

  /**
   * Targets to invoke when this rule matches an event.
   *
   * Input will be the full matched event unless modified using `inputPath`, `inputTransformer` properties.
   *
   * @default - No targets.
   */
  readonly targets?: Record<string, TargetConfig>;

  /**
   * Additional restrictions for the event to route to the specified target
   *
   * The method that generates the rule probably imposes some type of event
   * filtering. The filtering implied by what you pass here is added
   * on top of that filtering.
   *
   * @default - No additional filtering based on an event pattern.
   *
   * @see
   * https://docs.aws.amazon.com/eventbridge/latest/userguide/eventbridge-and-event-patterns.html
   */
  readonly eventPattern?: EventPattern;

  readonly enabled?: boolean;
}

export interface RuleOutputs {
  /**
   * Rule name
   */
  readonly name: string;

  /**
   * Rule arn
   */
  readonly arn: string;
}

export interface IRule extends IAwsBeacon {
  /** Strongly typed outputs */
  readonly ruleOutputs: RuleOutputs;
}

export class Rule extends AwsBeaconBase implements IRule {
  // TODO: Add static fromLookup?
  resource: cloudwatchEventRule.CloudwatchEventRule;

  private readonly _outputs: RuleOutputs;
  public get ruleOutputs(): RuleOutputs {
    return this._outputs;
  }
  public get outputs(): Record<string, any> {
    return this.ruleOutputs;
  }

  private readonly _ruleName: string;
  public get ruleName(): string {
    return this._ruleName;
  }
  private readonly scheduleExpression?: string;

  private readonly targets: Record<string, TargetConfig> = {};
  private readonly eventPattern: EventPattern = {};

  constructor(scope: Construct, name: string, props: RuleProps) {
    super(scope, name, props);

    const ruleName = this.gridUUID;
    if (props.nameSuffix) {
      if (name.length < 1 || name.length > 38) {
        // TODO: substract gridUUID length from 38? (64 - 26 tf suffix)
        throw new Error(
          `Event rule name must be between 1 and 38 characters. Received: ${name}`,
        );
      }
      if (!/^[\.\-_A-Za-z0-9]+$/.test(name)) {
        throw new Error(
          `Event rule name ${name} can contain only letters, numbers, periods, hyphens, or underscores with no spaces.`,
        );
      }
      this._ruleName = `${ruleName}-${props.nameSuffix}`;
    } else {
      this._ruleName = ruleName;
    }

    if (props.eventBusName && props.schedule) {
      throw new Error(
        "Cannot associate rule with 'eventBus' when using 'schedule'",
      );
    }

    this.scheduleExpression = props.schedule?.expressionString;
    props.schedule?._bind(this);

    this.resource = new cloudwatchEventRule.CloudwatchEventRule(
      this,
      "Resource",
      {
        namePrefix: this._ruleName,
        description: props.description,
        state:
          props.enabled == null
            ? "ENABLED"
            : props.enabled
              ? "ENABLED"
              : "DISABLED", //TODO: support ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS?
        scheduleExpression: this.scheduleExpression,
        eventPattern: Lazy.stringValue({
          produce: () => this._renderEventPattern(),
        }),
        eventBusName: props.eventBusName,
        dependsOn: props.dependsOn,
      },
    );

    this.addEventPattern(props.eventPattern);

    for (const [id, target] of Object.entries(props.targets || {})) {
      this.addTarget(id, target);
    }
    this._outputs = {
      name: this.resource.name,
      arn: this.resource.arn,
    };
  }

  /**
   * Adds an event pattern filter to this rule. If a pattern was already specified,
   * these values are merged into the existing pattern.
   *
   * For example, if the rule already contains the pattern:
   *
   *    {
   *      "resources": [ "r1" ],
   *      "detail": {
   *        "hello": [ 1 ]
   *      }
   *    }
   *
   * And `addEventPattern` is called with the pattern:
   *
   *    {
   *      "resources": [ "r2" ],
   *      "detail": {
   *        "foo": [ "bar" ]
   *      }
   *    }
   *
   * The resulting event pattern will be:
   *
   *    {
   *      "resources": [ "r1", "r2" ],
   *      "detail": {
   *        "hello": [ 1 ],
   *        "foo": [ "bar" ]
   *      }
   *    }
   *
   */
  public addEventPattern(eventPattern?: EventPattern) {
    if (!eventPattern) {
      return;
    }
    mergeEventPattern(this.eventPattern, eventPattern);
  }

  /**
   * Not private only to be overrideen in CopyRule.
   *
   * @internal
   */
  public _renderEventPattern(): any {
    return renderEventPattern(this.eventPattern);
  }
  /**
   * Gives an external source (like an EventBridge Rule, SNS, or S3) permission
   * to access the Lambda function.
   */
  public addTarget(id: string, target: TargetConfig) {
    this.targets[id] = target;
  }

  /**
   * Adds resource to the Terraform JSON output at Synth time.
   *
   * called by TerraformStack.prepareStack()
   */
  public toTerraform(): any {
    /**
     * A preparing resolve might add new resources to the stack
     *
     * should not add resources if no targets are defined
     */
    if (Object.keys(this.targets).length === 0) {
      return {};
    }

    for (const [id, target] of Object.entries(this.targets)) {
      if (this.node.tryFindChild(id)) continue; // ignore if already generated
      new cloudwatchEventTarget.CloudwatchEventTarget(this, id, {
        ...target,
        rule: this.resource.name,
      });
    }
    return {};
  }
}
