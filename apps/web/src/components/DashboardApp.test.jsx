import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import DashboardApp from "./DashboardApp";

vi.mock("../hooks/useCredentialDetails", () => ({
  useCredentialDetails: () => ({
    status: "idle",
    payload: null,
    error: "",
  }),
}));

function buildProps(overrides = {}) {
  return {
    organization: {
      id: "ORG-1001",
      name: "Acme Credential Lab",
      slug: "acme-credential-lab",
      sector: "Corporate learning",
      website: "https://acme.example",
      verificationDomain: "http://localhost:5173",
      status: "Active",
      description: "Credential operations workspace",
    },
    templates: [],
    issuers: [],
    credentials: [],
    activity: [],
    members: [],
    invitations: [
      {
        id: "INV-1001",
        name: "Jamie Teammate",
        email: "jamie@acme.example",
        membershipRole: "Member",
        issuerRole: "Issuer",
        issuerStatus: "Pending",
        status: "Pending",
        createdAt: "2026-03-15T12:00:00.000Z",
        acceptedAt: "",
        revokedAt: "",
        lastSentAt: "2026-03-15T12:00:00.000Z",
        joinPath: "/join/JOIN-1001",
        joinUrl: "http://localhost:5173/join/JOIN-1001",
        invitedBy: "Jane Founder",
      },
    ],
    stats: {
      credentialCount: 0,
      templateCount: 0,
      issuerCount: 0,
      validCount: 0,
      revokedCount: 0,
    },
    apiMode: "ready",
    apiError: "",
    issuerSession: {
      fullName: "Sam Viewer",
      workEmail: "sam@acme.example",
      role: "Member",
      membershipRole: "Member",
      organizationId: "ORG-1001",
      organizationName: "Acme Credential Lab",
      issuerId: "",
      signedInAt: "2026-03-15T12:00:00.000Z",
      workspaces: [],
    },
    currentIssuerId: "",
    onIssueCredential: vi.fn(),
    onRevokeCredential: vi.fn(),
    onAddTemplate: vi.fn(),
    onUpdateTemplate: vi.fn(),
    onAddIssuer: vi.fn(),
    onUpdateIssuer: vi.fn(),
    onInviteTeamMember: vi.fn(),
    onResendInvitation: vi.fn(),
    onRevokeInvitation: vi.fn(),
    onUpdateOrganization: vi.fn(),
    onSwitchWorkspace: vi.fn(),
    onBackToSite: vi.fn(),
    onOpenVerifier: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
}

describe("DashboardApp permissions", () => {
  test("keeps invite management read-only for non-managers", () => {
    render(<DashboardApp {...buildProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByText("Workspace members can view access details here, but only owners and admins can create new invitations.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });
});
