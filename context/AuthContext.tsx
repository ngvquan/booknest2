import { supabase } from "@/lib/supabase";
import { fetchMockPaymentProfile, type PaymentProfile } from "@/lib/paymentApi";
import { AsyncStorage, readJson, writeJson } from "@/lib/storage";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isVip: boolean;
  vipExpiredAt: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string, redirectTo?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (payload: {
    name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateLocalAvatar: (avatarUri: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

type ProfileRow = {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  is_vip: boolean | null;
  vip_expired_at: string | null;
};

type LocalAuthSession = {
  user: User | null;
};

const LOCAL_AUTH_SESSION_KEY = "booknest:local-auth-session";
const USE_LOCAL_AUTH = __DEV__ && process.env.EXPO_PUBLIC_AUTH_MODE?.trim() === "local";

const AuthContext = createContext<AuthContextType | null>(null);

function isNetworkRequestError(error: unknown) {
  if (error instanceof Error) {
    return /network request failed|failed to fetch|network_error/i.test(error.message);
  }

  if (error && typeof error === "object" && "message" in error) {
    return /network request failed|failed to fetch|network_error/i.test(
      String((error as { message?: unknown }).message || ""),
    );
  }

  return false;
}

function makeLocalUser(email: string, name?: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const fallbackName = normalizedEmail.split("@")[0] || "Local User";

  return {
    id: `local-${normalizedEmail.replace(/[^a-z0-9]+/gi, "-")}`,
    name: name?.trim() || fallbackName,
    email: normalizedEmail,
    avatar: undefined,
    isVip: false,
    vipExpiredAt: null,
  };
}

async function readLocalAuthUser() {
  const session = await readJson<LocalAuthSession>(LOCAL_AUTH_SESSION_KEY, { user: null });
  return session.user;
}

async function writeLocalAuthUser(user: User) {
  await writeJson(LOCAL_AUTH_SESSION_KEY, { user });
}

async function clearLocalAuthUser() {
  await AsyncStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
}

async function activateLocalUser(email: string, name?: string) {
  const localUser = makeLocalUser(email, name);
  await writeLocalAuthUser(localUser);
  return localUser;
}

async function mergeLocalAuthUser(patch: Partial<User>) {
  const currentUser = await readLocalAuthUser();
  if (!currentUser) return null;

  const nextUser = {
    ...currentUser,
    ...patch,
  };
  await writeLocalAuthUser(nextUser);
  return nextUser;
}

function mapAuthUser(authUser: SupabaseUser, profile?: ProfileRow | null): User {
  const name =
    profile?.username?.trim() ||
    authUser.user_metadata?.name?.trim() ||
    authUser.email?.split("@")[0] ||
    "Người dùng";

  return {
    id: authUser.id,
    name,
    email: profile?.email || authUser.email || "",
    avatar: profile?.avatar_url || undefined,
    isVip: !!profile?.is_vip,
    vipExpiredAt: profile?.vip_expired_at || null,
  };
}

function mergeVipState(user: User, paymentProfile?: PaymentProfile | null): User {
  if (!paymentProfile?.is_vip) {
    return user;
  }

  const currentExpiry = user.vipExpiredAt ? new Date(user.vipExpiredAt).getTime() : 0;
  const paymentExpiry = paymentProfile.vip_expired_at
    ? new Date(paymentProfile.vip_expired_at).getTime()
    : 0;

  return {
    ...user,
    isVip: true,
    vipExpiredAt:
      paymentExpiry > currentExpiry
        ? paymentProfile.vip_expired_at
        : user.vipExpiredAt,
  };
}
async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,username,avatar_url,is_vip,vip_expired_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data as ProfileRow | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  async function buildUser(authUser: SupabaseUser) {
    const [profile, paymentProfile] = await Promise.all([
      fetchProfile(authUser.id),
      fetchMockPaymentProfile(authUser.id).catch(() => null),
    ]);

    return mergeVipState(mapAuthUser(authUser, profile), paymentProfile);
  }

  async function refreshUser(authUser: SupabaseUser) {
    const nextUser = await buildUser(authUser);
    setUser(nextUser);
  }

  async function refreshCurrentUser() {
    if (USE_LOCAL_AUTH) {
      setUser(await readLocalAuthUser());
      return;
    }

    let authUser: SupabaseUser | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data.user;
    } catch {
      setUser(await readLocalAuthUser());
      return;
    }

    if (!authUser) {
      setUser(null);
      return;
    }

    await refreshUser(authUser);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (USE_LOCAL_AUTH) {
        setUser(await readLocalAuthUser());
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) {
          return;
        }

        const authUser = data.session?.user;
        if (error || !authUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const nextUser = await buildUser(authUser);
        if (!active) {
          return;
        }

        setUser(nextUser);
        setIsLoading(false);
      } catch {
        if (!active) {
          return;
        }
        setUser(await readLocalAuthUser());
        setIsLoading(false);
      }
    }

    initialize();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void (async () => {
          try {
            const authUser = session?.user;
            if (!authUser) {
              setUser(null);
              setIsLoading(false);
              return;
            }

            const nextUser = await buildUser(authUser);
            setUser(nextUser);
            setIsLoading(false);
          } catch {
            setUser(null);
            setIsLoading(false);
          }
        })();
      }, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (USE_LOCAL_AUTH || user.id.startsWith("local-")) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async () => {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (!authUser || authUser.id !== user.id) {
            return;
          }

          const nextUser = await buildUser(authUser);
          setUser(nextUser);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (USE_LOCAL_AUTH) {
      const localUser = await activateLocalUser(email);
      setUser(localUser);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (__DEV__ && isNetworkRequestError(error)) {
        const localUser = await activateLocalUser(email);
        setUser(localUser);
        return { success: true };
      }
      if (error || !data.user) {
        return { success: false, error: error?.message || "Email hoặc mật khẩu không đúng" };
      }

      await refreshUser(data.user);
      return { success: true };
    } catch (error) {
      if (__DEV__ && isNetworkRequestError(error)) {
        const localUser = makeLocalUser(email);
        await writeLocalAuthUser(localUser);
        setUser(localUser);
        return { success: true };
      }

      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (USE_LOCAL_AUTH) {
      const localUser = await activateLocalUser(email, name);
      setUser(localUser);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      if (__DEV__ && isNetworkRequestError(error)) {
        const localUser = await activateLocalUser(email, name);
        setUser(localUser);
        return { success: true };
      }

      if (error || !data.user) {
        return { success: false, error: error?.message || "Đăng ký thất bại" };
      }

      await refreshUser(data.user);
      return { success: true };
    } catch (error) {
      if (__DEV__ && isNetworkRequestError(error)) {
        const localUser = makeLocalUser(email, name);
        await writeLocalAuthUser(localUser);
        setUser(localUser);
        return { success: true };
      }

      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function requestPasswordReset(
    email: string,
    redirectTo?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function resetPassword(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const nextPassword = password.trim();
      if (nextPassword.length < 6) {
        return { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự" };
      }

      const { data, error } = await supabase.auth.updateUser({
        password: nextPassword,
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || "Không thể cập nhật mật khẩu" };
      }

      await refreshUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function updateProfile(payload: {
    name: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (USE_LOCAL_AUTH || user?.id.startsWith("local-")) {
      const nextUser = await mergeLocalAuthUser({ name: payload.name.trim() });
      if (nextUser) {
        setUser(nextUser);
        return { success: true };
      }
      return { success: false, error: "Phiên đăng nhập đã hết hạn" };
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "Phiên đăng nhập đã hết hạn" };
    }

    try {
      const nextName = payload.name.trim();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: nextName,
        })
        .eq("id", currentUser.id);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...currentUser.user_metadata,
          name: nextName,
        },
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || "Không thể cập nhật thông tin" };
      }

      await refreshUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (USE_LOCAL_AUTH || user?.id.startsWith("local-")) {
      return { success: false, error: "Tài khoản local không hỗ trợ đổi mật khẩu." };
    }

    try {
      const nextCurrentPassword = currentPassword.trim();
      const nextPassword = newPassword.trim();
      if (nextPassword.length < 6) {
        return { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự" };
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser?.email) {
        return { success: false, error: "Phiên đăng nhập đã hết hạn" };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: nextCurrentPassword,
      });

      if (signInError) {
        return { success: false, error: "Mật khẩu hiện tại không đúng" };
      }

      const { data, error } = await supabase.auth.updateUser({
        password: nextPassword,
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || "Không thể cập nhật mật khẩu" };
      }

      await refreshUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
  }

  async function logout() {
    if (USE_LOCAL_AUTH) {
      await clearLocalAuthUser();
      setUser(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch {
    }
    await clearLocalAuthUser();
    setUser(null);
  }

  async function updateLocalAvatar(avatarUri: string) {
    const nextUser = await mergeLocalAuthUser({ avatar: avatarUri });
    if (nextUser) {
      setUser(nextUser);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        updateProfile,
        updateLocalAvatar,
        changePassword,
        refreshCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
