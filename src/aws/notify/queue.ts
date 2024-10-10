import { sqsQueue } from "@cdktf/provider-aws";
// import { IResolveContext, Lazy, IResolvable } from "cdktf";
import { Construct } from "constructs";
// import { Statement } from "iam-floyd";
import { AwsBeaconBase, IAwsBeacon, AwsBeaconProps } from "..";
import { SqsQueueConfig } from "./queue-config.generated";
// import { ServiceRole, IServiceRole } from "../iam";

export interface QueueProps extends AwsBeaconProps, SqsQueueConfig {
  /**
   * Queue Name suffix to append to Grid UUID
   *
   * Queue names must be made up of only uppercase and lowercase ASCII letters,
   * numbers, underscores, and hyphens, and must be between 1 and 80 characters
   * long.
   *
   * For a FIFO (first-in-first-out) queue, the name must end with the .fifo
   * @default - No suffix
   */
  readonly nameSuffix?: string;
}

export interface QueueOutputs {
  /**
   * Queue name
   */
  readonly name: string;

  /**
   * Queue arn
   */
  readonly arn: string;

  /**
   * Queue url
   */
  readonly url: string;
}

export interface IQueue extends IAwsBeacon {
  /** Strongly typed outputs */
  readonly queueOutputs: QueueOutputs;
  readonly queueName: string;
}

export class Queue extends AwsBeaconBase implements IQueue {
  // TODO: Add static fromLookup?
  resource: sqsQueue.SqsQueue;

  private readonly _outputs: QueueOutputs;
  public get queueOutputs(): QueueOutputs {
    return this._outputs;
  }
  public get outputs(): Record<string, any> {
    return this.queueOutputs;
  }

  private readonly _queueName: string;
  public get queueName(): string {
    return this._queueName;
  }

  constructor(scope: Construct, name: string, props: QueueProps) {
    super(scope, name, props);

    this._queueName = this.gridUUID;
    if (props.nameSuffix) {
      this._queueName = `${this._queueName}-${props.nameSuffix}`;
      // 54 = 80 - 26 (tf generated suffix)
      if (this._queueName.length < 1 || this._queueName.length > 54) {
        throw new Error(
          `Queue name must be between 1 and 54 characters long. Received: ${this._queueName}`,
        );
      }
      if (!/^[\.\-_A-Za-z0-9]+$/.test(this._queueName)) {
        throw new Error(
          `Queue name ${this._queueName} can contain only letters, numbers, periods, hyphens, or underscores with no spaces.`,
        );
      }
    }

    this.resource = new sqsQueue.SqsQueue(scope, "Resource", {
      ...props,
      namePrefix: this._queueName,
    });
    this._outputs = {
      name: this.resource.name,
      arn: this.resource.arn,
      url: this.resource.url,
    };
  }
}
