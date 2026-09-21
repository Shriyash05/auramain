import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../services/auth/authService';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { colors, spacing, radii } from '../../constants/theme';
import { ShieldCheck, AlertCircle, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react-native';

const DIAGNOSTIC_URL =
  process.env.EXPO_PUBLIC_VTO_API_URL
    ? `${process.env.EXPO_PUBLIC_VTO_API_URL.replace(/\/+$/, '')}/v1/vto/diagnostics/auth`
    : 'https://unbraided-sandpaper-collie.ngrok-free.dev/v1/vto/diagnostics/auth';

interface SessionDiagState {
  isAuthenticated: boolean;
  hasAccessToken: boolean;
  jwtSegmentCount: number;
  userId: string;
}

interface ApiDiagResult {
  httpStatus: number;
  code: string;
  message: string;
  algorithm?: string;
  status: 'ok' | 'fail' | 'error';
}

export const VtoAuthDiagnostic: React.FC = () => {
  const [sessionDiag, setSessionDiag] = useState<SessionDiagState>({
    isAuthenticated: false,
    hasAccessToken: false,
    jwtSegmentCount: 0,
    userId: 'None',
  });
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [apiResult, setApiResult] = useState<ApiDiagResult | null>(null);
  const [userNotification, setUserNotification] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      setIsLoadingSession(true);
      if (!supabase) {
        setSessionDiag({
          isAuthenticated: false,
          hasAccessToken: false,
          jwtSegmentCount: 0,
          userId: 'Supabase client unconfigured',
        });
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        setSessionDiag({
          isAuthenticated: false,
          hasAccessToken: false,
          jwtSegmentCount: 0,
          userId: session?.user?.id || 'None',
        });
        return;
      }

      // Safe segment count: never expose or log the token string
      const segments = session.access_token.split('.').length;
      setSessionDiag({
        isAuthenticated: true,
        hasAccessToken: true,
        jwtSegmentCount: segments,
        userId: session.user.id,
      });
    } catch (e: any) {
      setUserNotification(e?.message || 'Error checking session');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleTestVtoAuth = async () => {
    setUserNotification(null);
    setApiResult(null);

    if (!supabase) {
      setUserNotification('Supabase client is not configured in this app.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      setUserNotification('Please sign in first.');
      return;
    }

    try {
      setIsTestingAuth(true);
      // Connect to the diagnostic endpoint with current token
      const resp = await fetch(DIAGNOSTIC_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await resp.json().catch(() => ({}));
      setApiResult({
        httpStatus: resp.status,
        code: data?.code || (resp.ok ? 'SUCCESS' : 'HTTP_ERROR'),
        message: data?.message || 'Response received.',
        algorithm: data?.algorithm,
        status: data?.status || (resp.ok ? 'ok' : 'fail'),
      });
    } catch (err: any) {
      setApiResult({
        httpStatus: 0,
        code: 'NETWORK_ERROR',
        message: err?.message || 'Unable to reach the VTO ngrok tunnel. Verify tunnel is online.',
        status: 'error',
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleSignInTestAccount = async () => {
    if (!supabase) return;
    try {
      setIsSigningIn(true);
      setUserNotification(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'aura_tester@aura.local',
        password: 'AuraVtoPass123!',
      });
      if (error) {
        setUserNotification(`Sign in failed: ${error.message}`);
      } else if (data.session) {
        setUserNotification('Successfully signed in to verified test user session!');
        await checkSession();
      }
    } catch (err: any) {
      setUserNotification(err?.message || 'Sign in encountered an error');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ShieldCheck size={18} color={colors.accent} />
        <Typography variant="label" style={styles.cardTitle}>
          VTO AUTHENTICATION DIAGNOSTICS (DEV)
        </Typography>
      </View>

      {/* State Indicators */}
      <View style={styles.statusGrid}>
        <View style={styles.statusRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            Is authenticated:
          </Typography>
          <Typography
            variant="caption"
            color={sessionDiag.isAuthenticated ? colors.success || '#10B981' : colors.textSecondary}
            style={styles.boldText}
          >
            {sessionDiag.isAuthenticated ? 'true' : 'false'}
          </Typography>
        </View>

        <View style={styles.statusRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            Has access token:
          </Typography>
          <Typography
            variant="caption"
            color={sessionDiag.hasAccessToken ? colors.success || '#10B981' : colors.textSecondary}
            style={styles.boldText}
          >
            {sessionDiag.hasAccessToken ? 'true' : 'false'}
          </Typography>
        </View>

        <View style={styles.statusRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            JWT segment count:
          </Typography>
          <Typography variant="caption" color={colors.text} style={styles.boldText}>
            {sessionDiag.jwtSegmentCount}
          </Typography>
        </View>

        <View style={styles.statusRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            User ID:
          </Typography>
          <Typography
            variant="caption"
            color={colors.text}
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[styles.boldText, styles.userIdText]}
          >
            {sessionDiag.userId}
          </Typography>
        </View>
      </View>

      {/* User Notifications */}
      {userNotification ? (
        <View style={styles.notificationBox}>
          <AlertCircle size={14} color={colors.accent} />
          <Typography variant="caption" color={colors.text} style={styles.notificationText}>
            {userNotification}
          </Typography>
        </View>
      ) : null}

      {/* Diagnostic API Result Box */}
      {apiResult ? (
        <View
          style={[
            styles.resultBox,
            apiResult.code === 'AUTH_SUCCESS'
              ? styles.resultSuccess
              : styles.resultFail,
          ]}
        >
          <View style={styles.resultHeader}>
            {apiResult.code === 'AUTH_SUCCESS' ? (
              <CheckCircle2 size={16} color="#10B981" />
            ) : (
              <AlertCircle size={16} color="#EF4444" />
            )}
            <Typography variant="caption" style={styles.resultCode}>
              HTTP {apiResult.httpStatus} — {apiResult.code}
            </Typography>
          </View>
          <Typography variant="caption" color={colors.textSecondary} style={styles.resultMessage}>
            {apiResult.message}
          </Typography>

          {apiResult.code === 'AUTH_SUCCESS' ? (
            <Typography variant="caption" color="#10B981" style={styles.explanationText}>
              Authentication confirmed! Tokens are valid and accepted by Kaggle backend. Note: Genuine VTO inference remains blocked until a full visual run is verified.
            </Typography>
          ) : apiResult.code === 'ALGORITHM_MISMATCH' ? (
            <Typography variant="caption" color="#F59E0B" style={styles.explanationText}>
              Algorithm mismatch detected (ES256 vs HS256). In Kaggle Notebook, rerun Step 6 to restart the Uvicorn server with dual ES256/HS256 support.
            </Typography>
          ) : apiResult.code === 'SIGNATURE_VERIFICATION_FAILED' ? (
            <Typography variant="caption" color="#EF4444" style={styles.explanationText}>
              VTO_JWT_SECRET in Kaggle environment does not match the secret that signed this token. Update Kaggle Secret VTO_JWT_SECRET to match Supabase Project Settings &gt; API &gt; JWT Secret.
            </Typography>
          ) : apiResult.code === 'TOKEN_STRUCTURE_INVALID' ? (
            <Typography variant="caption" color="#EF4444" style={styles.explanationText}>
              The token passed does not have 3 base64 segments. Ensure the active Supabase session.access_token is passed rather than an arbitrary string.
            </Typography>
          ) : null}
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.actionRow}>
        <Button
          label={isTestingAuth ? 'Testing...' : 'Test VTO Authentication'}
          onPress={handleTestVtoAuth}
          disabled={isTestingAuth || isLoadingSession}
          style={styles.primaryButton}
        />
      </View>

      {!sessionDiag.isAuthenticated ? (
        <TouchableOpacity
          onPress={handleSignInTestAccount}
          disabled={isSigningIn}
          style={styles.devSignInButton}
        >
          <KeyRound size={13} color={colors.textSecondary} />
          <Typography variant="caption" color={colors.textSecondary} style={styles.devSignInText}>
            {isSigningIn ? 'Signing in...' : 'Sign In with Verified Dev Account'}
          </Typography>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={checkSession} style={styles.refreshButton}>
        <RefreshCw size={12} color={colors.textSecondary} />
        <Typography variant="caption" color={colors.textSecondary} style={styles.refreshText}>
          Refresh Session State
        </Typography>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardTitle: {
    letterSpacing: 1,
    fontSize: 11,
    color: colors.text,
  },
  statusGrid: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  boldText: {
    fontWeight: '600',
  },
  userIdText: {
    maxWidth: '55%',
  },
  notificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  notificationText: {
    flex: 1,
  },
  resultBox: {
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  resultCode: {
    fontWeight: '700',
    color: colors.text,
  },
  resultMessage: {
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  actionRow: {
    marginTop: spacing.xs,
  },
  primaryButton: {
    width: '100%',
  },
  devSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    gap: 6,
  },
  devSignInText: {
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
    gap: 4,
  },
  refreshText: {
    fontSize: 11,
  },
});
