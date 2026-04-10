"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  participantGetMe,
  participantLogin,
  participantLogout,
  participantSignup,
  type LoginPayload,
  type ParticipantUser,
  type SignupPayload,
} from "@/lib/participant-auth";

type ParticipantAuthContextValue = {
  participantUser: ParticipantUser | null;
  isParticipantLoading: boolean;
  participantSignIn: (payload: LoginPayload) => Promise<void>;
  participantSignUp: (payload: SignupPayload) => Promise<void>;
  participantSignOut: () => Promise<void>;
};

const ParticipantAuthContext = createContext<
  ParticipantAuthContextValue | undefined
>(undefined);

export function ParticipantAuthProvider({ children }: PropsWithChildren) {
  const [participantUser, setParticipantUser] =
    useState<ParticipantUser | null>(null);
  const [isParticipantLoading, setIsParticipantLoading] = useState(true);

  useEffect(() => {
    participantGetMe()
      .then((user) => {
        setParticipantUser(user);
      })
      .catch(() => {
        setParticipantUser(null);
      })
      .finally(() => {
        setIsParticipantLoading(false);
      });
  }, []);

  const participantSignIn = useCallback(async (payload: LoginPayload) => {
    const response = await participantLogin(payload);
    setParticipantUser(response.data);
  }, []);

  const participantSignUp = useCallback(async (payload: SignupPayload) => {
    const response = await participantSignup(payload);
    setParticipantUser(response.data);
  }, []);

  const participantSignOut = useCallback(async () => {
    try {
      await participantLogout();
    } catch {
      // Session may already be invalid
    }
    setParticipantUser(null);
  }, []);

  const value = useMemo<ParticipantAuthContextValue>(
    () => ({
      participantUser,
      isParticipantLoading,
      participantSignIn,
      participantSignUp,
      participantSignOut,
    }),
    [
      participantUser,
      isParticipantLoading,
      participantSignIn,
      participantSignUp,
      participantSignOut,
    ],
  );

  return (
    <ParticipantAuthContext.Provider value={value}>
      {children}
    </ParticipantAuthContext.Provider>
  );
}

export function useParticipantAuth() {
  const context = useContext(ParticipantAuthContext);
  if (!context) {
    throw new Error(
      "useParticipantAuth must be used within ParticipantAuthProvider",
    );
  }
  return context;
}
