import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { zilaApi, AuthRequiredError, AuthExpiredError } from "../utils/auth.js";

interface Profile {
  id: string;
  user_id: string;
  username?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  about?: string;
  university?: string;
  field_of_study?: string;
  degree?: string;
  graduation_year?: number;
  gpa?: string | null;
  hard_skills?: string[];
  soft_skills?: string[];
  languages?: string[];
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  role?: string;
  preferred_industries?: string[];
  work_mode?: string;
  profile_status?: string;
}

interface AboutScreenProps {
  onComplete: () => void;
  clearHistory?: () => void;
}

type FieldValue = string | number | string[] | null | undefined;

function isEmpty(val: FieldValue): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

const Field: React.FC<{
  label: string;
  value: FieldValue;
  valueColor?: string;
}> = ({ label, value, valueColor = theme.colors.white }) => {
  if (isEmpty(value)) return null;
  const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
  const dotCount = Math.max(2, 40 - label.length - displayValue.length);

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={theme.colors.muted}>{label}</Text>
      <Text color={theme.colors.retroSlateDark}> {"·".repeat(dotCount)} </Text>
      <Text color={valueColor} bold>{displayValue}</Text>
    </Box>
  );
};

export const AboutScreen: React.FC<AboutScreenProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await zilaApi<{ profile: Profile; type: string }>("/profile/me");
        if (response.profile) {
          setProfile(response.profile);
        } else {
          setError("No profile data found. Complete your profile on the Zigex platform.");
        }
      } catch (e) {
        if (e instanceof AuthRequiredError || e instanceof AuthExpiredError) {
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  useInput((_char, key) => {
    if (key.escape || key.return) onComplete();
  });

  if (loading) {
    return (
      <Box flexDirection="row" paddingY={1} alignItems="center">
        <Spinner style="radar" color={theme.colors.accent} label="Retrieving profile dossier from Zigex host..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
        <Box flexDirection="row">
          <Text color={theme.colors.error} bold>[ PROFILE LOOKUP ERROR ]</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.text}>{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>[ Press ESC or ENTER to return ]</Text>
        </Box>
      </Box>
    );
  }

  if (!profile) {
    return <Text color={theme.colors.warning}>[ No profile record available ]</Text>;
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 90s Identity Frame */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ USER IDENTITY DOSSIER: {profile.full_name?.toUpperCase() ?? "INTERN"} ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[{profile.profile_status ?? "ACTIVE"}]</Text>
          </Box>
        </Box>

        {profile.about && (
          <Box marginBottom={1} flexDirection="row">
            <Text color={theme.colors.dim}>"{profile.about}"</Text>
          </Box>
        )}

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>PRIMARY DETAILS:</Text>
          <Field label="Full Name" value={profile.full_name} />
          <Field label="Email Address" value={profile.email} />
          <Field label="Phone" value={profile.phone} />
          <Field label="Location" value={profile.location} />
          <Field label="Role" value={profile.role} valueColor={theme.colors.retroGreenBright} />
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>ACADEMIC RECORD:</Text>
          <Field label="University" value={profile.university} />
          <Field label="Field of Study" value={profile.field_of_study} />
          <Field label="Degree" value={profile.degree} />
          <Field label="Graduation Year" value={profile.graduation_year} />
          <Field label="GPA" value={profile.gpa} />
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>SKILLS & REPOSITORIES:</Text>
          <Field label="Technical Skills" value={profile.hard_skills} />
          <Field label="Spoken Languages" value={profile.languages} />
          <Field label="GitHub Handle" value={profile.github_url} valueColor={theme.colors.retroCyanBright} />
          <Field label="Portfolio Site" value={profile.portfolio_url} valueColor={theme.colors.retroCyanBright} />
        </Box>

        {/* Hotkey footer */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.dim}>[ESC / ENTER: RETURN]</Text>
          <Text color={theme.colors.retroSlateDark}>VERIFIED BY ZIGEX CORE</Text>
        </Box>
      </Box>
    </Box>
  );
};