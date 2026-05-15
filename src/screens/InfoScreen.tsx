import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Spinner } from "../ui/Spinner.js";
import { zilaApi, AuthRequiredError, AuthExpiredError } from "../utils/auth.js";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface InfoScreenProps {
  onComplete: () => void;
  clearHistory?: () => void;
}

export const InfoScreen: React.FC<InfoScreenProps> = ({ onComplete }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        // Fetch roles
        const rolesResponse = await zilaApi<{ roles: string[] }>(
          "/profile/roles"
        );
        setRoles(rolesResponse.roles || []);

        // Fetch supervised students if supervisor
        if ((rolesResponse.roles || []).includes("supervisor")) {
          const studentsResponse = await zilaApi<{ students: Student[] }>(
            "/profile/supervised-students"
          );
          setStudents(studentsResponse.students || []);
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
    fetchInfo();
  }, []);

  useInput((char, key) => {
    if (key.escape || char === "q" || key.return) {
      onComplete();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box flexDirection="row" gap={2}>
          <Spinner color={theme.colors.accent} />
          <Text color={theme.colors.accent}>Loading your information…</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.colors.error}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={theme.colors.error} bold>✗ Error</Text>
        </Box>
        <Text color={theme.colors.text} wrap="wrap">{error}</Text>
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>Press any key to return…</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={theme.colors.primary} bold>ZILA</Text>
            <Text color={theme.colors.dim}>›</Text>
            <Text color={theme.colors.muted}>info</Text>
          </Box>
          <Text color={theme.colors.successDim}>
            {roles.length} {roles.length === 1 ? "role" : "roles"}
          </Text>
        </Box>
        <Box>
          <Text color={theme.colors.border}>{"─".repeat(64)}</Text>
        </Box>
      </Box>

      {/* Roles Section */}
      <Box flexDirection="column" marginBottom={2}>
        <Text color={theme.colors.primary} bold>👤 Your Roles</Text>
        <Box marginTop={1} flexDirection="column" paddingLeft={2}>
          {roles.length === 0 ? (
            <Text color={theme.colors.muted}>No roles assigned</Text>
          ) : (
            roles.map((role, i) => (
              <Box key={i} flexDirection="row" gap={2} marginBottom={1}>
                <Text color={theme.colors.success}>✓</Text>
                <Text color={theme.colors.white} bold>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Supervised Students Section */}
      {roles.includes("supervisor") && (
        <Box flexDirection="column" marginBottom={2}>
          <Text color={theme.colors.primary} bold>👥 Supervised Students</Text>
          <Box marginTop={1} flexDirection="column">
            {students.length === 0 ? (
              <Box paddingLeft={2}>
                <Text color={theme.colors.muted}>No students assigned to you yet.</Text>
              </Box>
            ) : (
              <Box flexDirection="column">
                {students.map((student, i) => (
                  <Box
                    key={i}
                    flexDirection="column"
                    borderStyle="round"
                    borderColor={theme.colors.border}
                    paddingX={2}
                    paddingY={1}
                    marginBottom={1}
                  >
                    <Box flexDirection="row" gap={1} marginBottom={1}>
                      <Text color={theme.colors.secondary} bold>{student.name}</Text>
                    </Box>
                    <Box flexDirection="row" gap={2}>
                      <Text color={theme.colors.dim}>Email:</Text>
                      <Text color={theme.colors.info}>{student.email}</Text>
                    </Box>
                  </Box>
                ))}
                <Box paddingLeft={2} marginTop={1}>
                  <Text color={theme.colors.dim}>
                    Total: {students.length} {students.length === 1 ? "student" : "students"}
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Summary */}
      <Box marginTop={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color={theme.colors.border}>{"─".repeat(64)}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.success}>✓</Text>
          <Text color={theme.colors.dim}>
            You have access to {roles.length} role{roles.length !== 1 ? "s" : ""}
            {roles.includes("supervisor") ? ` and supervise ${students.length} student${students.length !== 1 ? "s" : ""}` : ""}
          </Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={2}>
        <Text color={theme.colors.dim}>Press <Text color={theme.colors.muted}>Q</Text>, <Text color={theme.colors.muted}>ESC</Text>, or <Text color={theme.colors.muted}>Enter</Text> to return</Text>
      </Box>
    </Box>
  );
};
