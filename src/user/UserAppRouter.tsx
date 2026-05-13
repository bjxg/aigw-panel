import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { UserAuthProvider } from "@/modules/user/UserAuthProvider";

const UserLoginPage = lazy(() =>
  import("@/modules/user/UserLoginPage").then((m) => ({
    default: m.UserLoginPage,
  })),
);
const UserProfilePage = lazy(() =>
  import("@/modules/user/UserProfilePage").then((m) => ({
    default: m.UserProfilePage,
  })),
);
const OIDCCallbackPage = lazy(() =>
  import("@/modules/user/OIDCCallbackPage").then((m) => ({
    default: m.OIDCCallbackPage,
  })),
);

export function UserAppRouter() {
  return (
    <Suspense>
      <Routes>
        <Route path="/login" element={<UserLoginPage />} />
        <Route path="/oauth/oidc/callback" element={<OIDCCallbackPage />} />
        <Route
          path="/profile"
          element={
            <UserAuthProvider>
              <UserProfilePage />
            </UserAuthProvider>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
