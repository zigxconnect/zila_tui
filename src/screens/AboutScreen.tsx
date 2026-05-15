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
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  date_of_birth?: string | null;
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
  previous_roles?: string[];
  preferred_industries?: string[];
  preferred_roles?: string[] | null;
  work_mode?: string;
  availability?: string | null;
  expected_stipend?: string | null;
  interests?: string[];
  achievements?: string[];
  profile_status?: string;
  share_code?: string;
}

interface AboutScreenProps {
  onComplete: () => void;
  clearHistory?: () => void;
}

const isEmpty = (val: any): boolean => {
  if (val === null || val === undefined || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
};

const Field = ({ label, value, valueColor = theme.colors.white }: { label: string; value: any; valueColor?: string }) => {
  if (isEmpty(value)) return null;
  
  const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
  
  return (
    <Box flexDirection="row" gap={2} marginBottom={0}>
      <Box width={18} flexShrink={0}>
        <Text color={theme.colors.border}>{label}</Text>
      </Box>
      <Box flexShrink={1}>
        <Text color={valueColor}>{displayValue}</Text>
      </Box>
    </Box>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const hasContent = React.Children.toArray(children).some((child) => child !== null);
  if (!hasContent) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.colors.primary} bold>{title}</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        {children}
      </Box>
    </Box>
  );
};

export const AboutScreen: React.FC<AboutScreenProps> = ({ onComplete, clearHistory }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useInput((char, key) => {
    if (clearHistory && char === "c" && key.ctrl) {
      clearHistory();
      return;
    }
    if (key.escape || char === "q" || key.return) {
      onComplete();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="row" gap={2} paddingY={1}>
        <Spinner color={theme.colors.accent} />
        <Text color={theme.colors.accent}>Loading your profile…</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.error} paddingX={2} paddingY={1}>
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.error} bold>✗ Error</Text>
        </Box>
        <Text color={theme.colors.text}>{error}</Text>
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>Press any key to return…</Text>
        </Box>
      </Box>
    );
  }

  if (!profile) {
    return <Text color={theme.colors.warning}>No profile information available.</Text>;
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.primary} bold>ZILA</Text>
          <Text color={theme.colors.dim}>›</Text>
          <Text color={theme.colors.muted}>profile</Text>
        </Box>
        <Text color={theme.colors.successDim}>Status: {profile.profile_status || "unknown"}</Text>
      </Box>

      <Box 
        flexDirection="column" 
        borderStyle="round" 
        borderColor={theme.colors.primary} 
        paddingX={2} 
        paddingY={1} 
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.secondary} bold>
            {profile.full_name?.toUpperCase() || "YOUR PROFILE"}
          </Text>
          {profile.username && (
            <Text color={theme.colors.info}>@{profile.username}</Text>
          )}
        </Box>
        
        {profile.about && (
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>{profile.about}</Text>
          </Box>
        )}
      </Box>

      <Section title="  Personal Information">
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Location" value={profile.location} />
        <Field label="Role" value={profile.role} valueColor={theme.colors.success} />
      </Section>

      <Section title="  Education">
        <Field label="University" value={profile.university} />
        <Field label="Field of Study" value={profile.field_of_study} />
        <Field label="Degree" value={profile.degree} />
        <Field label="Graduation" value={profile.graduation_year} />
        <Field label="GPA" value={profile.gpa} />
      </Section>

      <Section title="  Professional">
        <Field label="Previous Roles" value={profile.previous_roles} />
        <Field label="Industries" value={profile.preferred_industries} />
        <Field label="Work Mode" value={profile.work_mode} />
        <Field label="Expected Stipend" value={profile.expected_stipend} />
      </Section>

      <Section title="  Skills & Languages">
        <Field label="Hard Skills" value={profile.hard_skills} />
        <Field label="Soft Skills" value={profile.soft_skills} />
        <Field label="Languages" value={profile.languages} />
      </Section>

      <Section title="🔗 Links">
        <Field label="GitHub" value={profile.github_url} valueColor={theme.colors.info} />
        <Field label="LinkedIn" value={profile.linkedin_url} valueColor={theme.colors.info} />
        <Field label="Portfolio" value={profile.portfolio_url} valueColor={theme.colors.info} />
      </Section>

      <Section title="🏆 Achievements">
        {!isEmpty(profile.achievements) && profile.achievements?.map((achievement, i) => (
          <Text key={i} color={theme.colors.success}>• {achievement}</Text>
        ))}
      </Section>

      <Box marginTop={1}>
        <Text color={theme.colors.border}>{"─".repeat(64)}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.colors.dim}>
          Press <Text color={theme.colors.muted}>Q</Text>, <Text color={theme.colors.muted}>ESC</Text>, or <Text color={theme.colors.muted}>Enter</Text> to return
        </Text>
      </Box>
    </Box>
  );
};