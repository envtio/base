// ref: https://github.com/cdktf-plus/cdktf-plus/blob/586aabad3ab2fb2a2e93e05ed33f94474ebe9397/packages/%40cdktf-plus/aws/lib/aws-iam/index.ts#L7
import {
  dataAwsIamRole,
  iamPolicy,
  iamRole,
  iamRolePolicyAttachment,
} from "@cdktf/provider-aws";
import { Lazy, IResolveContext } from "cdktf";
import { Construct } from "constructs";
import { Statement } from "iam-floyd";
import { AwsBeaconBase, AwsBeaconProps } from "..";
import { IManagedPolicy } from "./managed-policy";
import { Policy } from "./policy";

export interface IServiceRole {
  readonly name: string;
  readonly arn: string;
  addPolicyStatements(...statements: Statement.All[]): void;
  addManagedPolicies(...policy: IManagedPolicy[]): void;
}

export interface ServiceRoleProps extends AwsBeaconProps {
  readonly service: string | string[];
  readonly policyStatements?: Statement.All[];
  /**
   * A list of managed policies associated with this role.
   *
   * You can add managed policies later using
   * `addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(policyName))`.
   *
   * @default - No managed policies.
   */
  readonly managedPolicies?: IManagedPolicy[];

  /**
   * The path associated with this role. For information about IAM paths, see
   * Friendly Names and Paths in IAM User Guide.
   *
   * @default /
   */
  readonly path?: string;
  readonly tags?: { [key: string]: string };
}

/**
 * A service role that can be assumed by an AWS service
 */
export class ServiceRole extends AwsBeaconBase implements IServiceRole {
  public static fromLookup(scope: Construct, name: string): IServiceRole {
    class ServiceRoleLookup extends AwsBeaconBase implements IServiceRole {
      private readonly _resource: dataAwsIamRole.DataAwsIamRole;
      constructor() {
        super(scope, name, {});
        this._resource = new dataAwsIamRole.DataAwsIamRole(this, "Resource", {
          name,
        });
      }
      public get name() {
        return this._resource.name;
      }
      public get arn() {
        return this._resource.arn;
      }
      public get outputs() {
        return {
          name: this.name,
          arn: this.arn,
        };
      }
      public addPolicyStatements(..._statements: Statement.All[]) {
        throw new Error("Imported ServiceRoles are immutable.");
      }
      public addManagedPolicies(..._policy: IManagedPolicy[]) {
        throw new Error("Imported ServiceRoles are immutable."); // TODO: Should allow attaching more policies?
      }
    }
    return new ServiceRoleLookup();
  }
  private readonly _resource: iamRole.IamRole;
  public get name() {
    return this._resource.name;
  }
  public get arn() {
    return this._resource.arn;
  }
  public get outputs(): Record<string, any> {
    return {
      name: this.name,
      arn: this.arn,
    };
  }
  private readonly tags?: { [key: string]: string };
  private readonly policyStatements: Statement.All[];
  private readonly managedPolicies: IManagedPolicy[];

  public constructor(scope: Construct, id: string, props: ServiceRoleProps) {
    super(scope, id, props);
    const { service } = props;
    const statement = new Statement.Sts()
      .allow()
      .toAssumeRole()
      .toSetSourceIdentity();

    if (Array.isArray(service)) {
      statement.forService(...service);
    } else {
      statement.forService(service);
    }
    this._resource = new iamRole.IamRole(this, "Resource", {
      namePrefix: this.gridUUID,
      path: props.path,
      assumeRolePolicy: Policy.document(statement),
      tags: props.tags,
      lifecycle: {
        createBeforeDestroy: true,
      },
    });

    this.tags = props.tags;
    this.policyStatements = props.policyStatements ?? [];
    this.managedPolicies = props.managedPolicies ?? [];
  }

  public addPolicyStatements(...statements: Statement.All[]) {
    this.policyStatements.push(...statements);
  }

  public addManagedPolicies(...policy: IManagedPolicy[]) {
    this.managedPolicies.push(...policy);
  }

  /**
   * Adds resource to the terraform JSON output at Synth time.
   *
   * called by TerraformStack.prepareStack()
   */
  public toTerraform(): any {
    /**
     * A preparing resolve run might add new resources to the stack
     *
     * should not add resources if no policyStatements or managedPolicies defined on role
     */
    if (
      this.policyStatements.length === 0 &&
      this.managedPolicies.length === 0
    ) {
      return {};
    }

    if (
      this.policyStatements.length > 0 &&
      !this.node.tryFindChild("RolePolicy")
    ) {
      const rolePolicy = new iamPolicy.IamPolicy(this, "RolePolicy", {
        namePrefix: this.gridUUID,
        path: "/",
        policy: Lazy.stringValue({
          produce: (_context: IResolveContext) => {
            return Policy.document(...this.policyStatements);
          },
        }),
        tags: this.tags,
        lifecycle: {
          createBeforeDestroy: true,
        },
      });

      new iamRolePolicyAttachment.IamRolePolicyAttachment(
        this,
        "PolicyAttachment",
        {
          policyArn: rolePolicy.arn,
          role: this._resource.name,
        },
      );
    }

    if (this.managedPolicies.length > 0) {
      for (const policy of this.managedPolicies) {
        const id = `MgmtPolicyAttachment-${policy.id}`;
        if (this.node.tryFindChild(id)) continue; // ignore if already attached
        new iamRolePolicyAttachment.IamRolePolicyAttachment(this, id, {
          policyArn: policy.managedPolicyArn,
          role: this._resource.name,
        });
      }
    }
    return {};
  }
}
