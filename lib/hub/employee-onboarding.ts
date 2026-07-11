import type { GovConContext } from "@/lib/authz";
import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";
import { OperationalError } from "@/lib/errors";
import type { EmployeeOnboardingInput } from "@/lib/validation/employee-onboarding";

export interface SuiteEmployeeOnboardingPacket {
  ok: boolean;
  hubUser: {
    id: string;
    clerkUserId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
  organization: {
    id: string;
    name: string;
    clerkOrgId: string | null;
  };
  membership: {
    id: string;
    role: string;
    status: string;
  };
  suiteObjectReference: {
    id: string;
    objectType: string;
    owningAppKey: string;
  };
  onboarding: {
    status: string;
    requestedApps: string[];
    trainingRequirementKeys: string[];
    signingAuthorityKinds: string[];
    followUps: Array<{ appKey: string; owner: string; action: string }>;
  };
}

export async function requestSuiteEmployeeOnboarding(
  ctx: GovConContext,
  input: EmployeeOnboardingInput,
): Promise<SuiteEmployeeOnboardingPacket> {
  if (getHubAuthorityMode() !== "live") {
    return mockPacket(ctx, input);
  }

  const serviceToken = process.env.MACTECH_HUB_SERVICE_TOKEN;
  if (!serviceToken) {
    throw new OperationalError("Hub service token is not configured", {
      userMessage: "Hub onboarding is not configured for this environment.",
    });
  }

  const hubBaseUrl =
    process.env.MACTECH_HUB_URL ?? "https://www.suite.mactechsolutionsllc.com";
  const res = await fetch(new URL("/api/v1/onboarding/employees", hubBaseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mactech-service-token": serviceToken,
      "x-mactech-source-app": APP_KEY,
    },
    body: JSON.stringify({
      customerOrganizationId: ctx.tenantOrgId,
      ...input,
      source: {
        sourceAppKey: APP_KEY,
        requestedByHubUserId: ctx.actorHubUserId,
      },
    }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    throw new OperationalError("Hub employee onboarding request failed", {
      userMessage: body?.detail ?? "Hub could not create the employee profile.",
      context: { status: res.status, body },
    });
  }

  return body as SuiteEmployeeOnboardingPacket;
}

function mockPacket(
  ctx: GovConContext,
  input: EmployeeOnboardingInput,
): SuiteEmployeeOnboardingPacket {
  const id = `mock_hub_user_${input.email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
  return {
    ok: true,
    hubUser: {
      id,
      clerkUserId: `pending_${id}`,
      email: input.email,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      status: "invited",
    },
    organization: {
      id: ctx.tenantOrgId,
      name: "Mock Hub organization",
      clerkOrgId: ctx.clerkOrgId ?? null,
    },
    membership: {
      id: `mock_membership_${id}`,
      role: input.role,
      status: "invited",
    },
    suiteObjectReference: {
      id: `mock_reference_${id}`,
      objectType: "hub.user_profile",
      owningAppKey: "identity-command-center",
    },
    onboarding: {
      status: "profile_created",
      requestedApps: input.appEntitlements,
      trainingRequirementKeys: input.trainingRequirementKeys,
      signingAuthorityKinds: input.signingAuthorityKinds,
      followUps: [
        {
          appKey: "hub",
          owner: "Hub",
          action: "Confirm Clerk invitation delivery and org membership activation.",
        },
      ],
    },
  };
}
