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

  return (
    <Box flexDirection="row" gap={2}>
      <Box width={18}>
        <Text color={theme.colors.retroSlateDark}>{label}</Text>
      </Box>
      <Text color={valueColor} bold={valueColor === theme.colors.white}>
        {displayValue}
      </Text>
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
      <Box flexDirection="row" paddingY={1} alignItems="center" gap={1}>
        <Spinner style="classic" color={theme.colors.retroBlueBright} />
        <Text color={theme.colors.retroSlateDark}>{"Retrieving profile from Zigex..."}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.error}>{"Error:"}</Text>
          <Text color={theme.colors.white}>{error}</Text>
        </Box>
        <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
        <Text color={theme.colors.retroSlateDark}>{"esc / enter to return"}</Text>
      </Box>
    );
  }

  if (!profile) {
    return <Text color={theme.colors.warning}>{"No profile record available."}</Text>;
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{profile.full_name ?? "User Dossier"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{profile.profile_status ?? "active"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {profile.about && (
        <Box marginBottom={1}>
          <Text color={theme.colors.retroSlateDark}>"{profile.about}"</Text>
        </Box>
      )}

      {/* Details */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"DETAILS"}</Text>
        <Field label="Full Name" value={profile.full_name} />
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Location" value={profile.location} />
        <Field label="Role" value={profile.role} valueColor={theme.colors.retroGreenBright} />
      </Box>

      {/* Academics */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Text color={theme.colors.retroBlueBright} bold>{"ACADEMICS"}</Text>
        <Field label="University" value={profile.university} />
        <Field label="Study" value={profile.field_of_study} />
        <Field label="Degree" value={profile.degree} />
        <Field label="Graduation" value={profile.graduation_year} />
        <Field label="GPA" value={profile.gpa} />
      </Box>

      {/* Skills & Repos */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.colors.retroBlueBright} bold>{"SKILLS & LINKS"}</Text>
        <Field label="Skills" value={profile.hard_skills} />
        <Field label="Languages" value={profile.languages} />
        <Field label="GitHub" value={profile.github_url} valueColor={theme.colors.retroBlueBright} />
        <Field label="Portfolio" value={profile.portfolio_url} valueColor={theme.colors.retroBlueBright} />
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / enter to return"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"Zigex Core Verified"}</Text>
      </Box>
    </Box>
  );
};