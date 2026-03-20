import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import IssuerAccessFlow from "./IssuerAccessFlow";

function buildProps(overrides = {}) {
  return {
    authError: "",
    invitationCode: "",
    invitationStatus: "idle",
    invitationPayload: null,
    resetToken: "",
    onRegister: vi.fn(),
    onSignIn: vi.fn(),
    onRequestPasswordReset: vi.fn().mockResolvedValue({
      message: "If an account exists for that email, a password reset link has been sent.",
      previewResetUrl: "http://localhost:5173/reset-password/dev-token",
    }),
    onResetPassword: vi.fn().mockResolvedValue({
      message: "Your password has been reset.",
    }),
    onGoogleRegister: vi.fn(),
    onGoogleSignIn: vi.fn(),
    onAcceptInvitation: vi.fn(),
    onAcceptInvitationWithGoogle: vi.fn(),
    ...overrides,
  };
}

describe("IssuerAccessFlow", () => {
  test("requests a password reset from the auth screen", async () => {
    const props = buildProps();

    render(<IssuerAccessFlow {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "jane@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(props.onRequestPasswordReset).toHaveBeenCalledWith({
        workEmail: "jane@company.com",
      });
    });

    expect(screen.getByRole("link", { name: "Open reset link" })).toHaveAttribute(
      "href",
      "http://localhost:5173/reset-password/dev-token"
    );
  });

  test("renders the reset-password form when a token is present", () => {
    render(<IssuerAccessFlow {...buildProps({ resetToken: "dev-token" })} />);

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reset password" })).toHaveLength(1);
  });
});
