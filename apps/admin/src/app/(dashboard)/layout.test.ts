import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  adminUsersFindFirstMock,
  getPlatformAdminContextMock,
  getSessionMock,
  requirePlatformAdminMock,
} = vi.hoisted(() => ({
  adminUsersFindFirstMock: vi.fn(),
  getPlatformAdminContextMock: vi.fn(),
  getSessionMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: {
    query: {
      adminUsers: {
        findFirst: adminUsersFindFirstMock,
      },
    },
  },
}));

vi.mock("@polaris/db/schema", () => ({
  adminUsers: { id: "adminUsers.id" },
}));

vi.mock("@polaris/ui/components/ui/sidebar", () => ({
  SidebarInset: () => null,
  SidebarProvider: () => null,
  SidebarTrigger: () => null,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("@/features/auth/actions", () => ({
  signOutAction: vi.fn(),
}));

vi.mock("@/lib/platform-admin-auth", () => ({
  getPlatformAdminContext: getPlatformAdminContextMock,
  requirePlatformAdmin: requirePlatformAdminMock,
}));

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("../../components/admin-sidebar", () => ({
  AdminSidebar: () => null,
}));

vi.mock("../../components/admin-theme-toggle", () => ({
  AdminThemeToggle: () => null,
}));

import DashboardLayout from "./layout";

const renderAdminAppWrapper = (children: ReactNode): Promise<ReactNode> => {
  const layout = DashboardLayout({ children });

  if (!isValidElement(layout)) {
    throw new Error("DashboardLayout must return a React element.");
  }

  const layoutElement = layout as ReactElement<{ children: ReactNode }>;
  const adminWrapperElement = layoutElement.props.children;

  if (!isValidElement(adminWrapperElement)) {
    throw new Error(
      "DashboardLayout must wrap its content in AdminAppWrapper."
    );
  }

  const adminWrapper = adminWrapperElement as ReactElement<{
    children: ReactNode;
  }>;

  if (typeof adminWrapper.type !== "function") {
    throw new Error("AdminAppWrapper must be a function component.");
  }

  const render = adminWrapper.type as (props: {
    children: ReactNode;
  }) => Promise<ReactNode>;

  return render(adminWrapper.props);
};

describe("Admin dashboard layout authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render dashboard children when admin authorization redirects", async () => {
    const redirectError = new Error("NEXT_REDIRECT: /sign-in");
    getPlatformAdminContextMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue(null);
    requirePlatformAdminMock.mockRejectedValue(redirectError);

    await expect(
      renderAdminAppWrapper(createElement("main", null, "Private admin data"))
    ).rejects.toBe(redirectError);

    expect(requirePlatformAdminMock).toHaveBeenCalledOnce();
  });
});
