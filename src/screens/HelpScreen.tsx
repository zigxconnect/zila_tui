import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { Header, Card, Badge, Divider, ListItem } from "../ui/Components.js";

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (command: string) => void;
  clearHistory: () => void;
}

interface Command {
  name: string;
  description: string;
  aliases?: string[];
  example?: string;
  tags?: string[];
}

interface CommandCategory {
  name: string;
  icon: string;
  color: keyof typeof theme.colors;
  commands: Command[];
}

export const HelpScreen: React.FC<HelpScreenProps> = ({
  onClose,
  onSelect,
  clearHistory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const categories: CommandCategory[] = [
    {
      name: "Getting Started",
      icon: "🚀",
      color: "primary",
      commands: [
        {
          name: "auth",
          description: "Authenticate with your Zigex account",
          aliases: ["login"],
          example: "zila auth",
          tags: ["login", "authentication", "setup"],
        },
        {
          name: "cohorts",
          description: "Browse available cohorts and programs",
          aliases: ["sessions", "programs-list"],
          example: "zila cohorts --all",
          tags: ["browse", "list", "programs"],
        },
        {
          name: "join",
          description: "Join a cohort or enroll in a program",
          aliases: ["enroll", "register-cohort"],
          example: "zila join <cohort-id>",
          tags: ["enroll", "register", "join"],
        },
      ],
    },
    {
      name: "Collaboration",
      icon: "👥",
      color: "accent",
      commands: [
        {
          name: "group",
          description: "View peers and colleagues in your cohort",
          aliases: ["peers", "colleagues", "cohort-members"],
          example: "zila group",
          tags: ["peers", "students", "colleagues"],
        },
        {
          name: "leaderboard",
          description: "View rankings and standings in your cohort",
          aliases: ["rankings", "top"],
          example: "zila leaderboard",
          tags: ["rank", "competition", "standings"],
        },
      ],
    },
    {
      name: "Tasks & Work",
      icon: "📝",
      color: "success",
      commands: [
        {
          name: "tasks",
          description: "View all your assigned tasks and deadlines",
          aliases: ["assignments", "work"],
          example: "zila tasks",
          tags: ["assignments", "todo", "work"],
        },
        {
          name: "task-details",
          description: "View detailed information about a specific task",
          aliases: ["task", "view-task"],
          example: "zila task-details <task-id>",
          tags: ["details", "info", "view"],
        },
        {
          name: "submit-report",
          description: "Submit your daily or weekly progress report",
          aliases: ["report"],
          example: "zila submit-report",
          tags: ["submit", "report", "progress"],
        },
        {
          name: "submit-task",
          description: "Submit a completed task for review",
          aliases: ["submit-work"],
          example: "zila submit-task <task-id>",
          tags: ["submit", "complete", "finish"],
        },
      ],
    },
    {
      name: "Progress & Stats",
      icon: "📊",
      color: "info",
      commands: [
        {
          name: "stats",
          description: "View your points, rank, and progress summary",
          aliases: ["points", "score", "progress"],
          example: "zila stats",
          tags: ["points", "progress", "analytics"],
        },
        {
          name: "stats-screen",
          description: "Open interactive stats dashboard with charts",
          aliases: ["dashboard"],
          example: "zila stats-screen",
          tags: ["dashboard", "interactive", "detailed"],
        },
        {
          name: "achievements",
          description: "View all unlockable achievements and badges",
          aliases: ["badges", "unlocks"],
          example: "zila achievements",
          tags: ["badges", "unlock", "rewards"],
        },
      ],
    },
    {
      name: "Learning",
      icon: "📚",
      color: "warning",
      commands: [
        {
          name: "docs",
          description: "Browse learning documents and resources",
          aliases: ["documents", "resources", "materials"],
          example: "zila docs",
          tags: ["learn", "documents", "tutorials"],
        },
        {
          name: "search-docs",
          description: "Search documents by keywords or topics",
          aliases: ["find", "lookup"],
          example: "zila search-docs 'react hooks'",
          tags: ["search", "find", "query"],
        },
        {
          name: "github-repos",
          description: "View linked GitHub repositories and examples",
          aliases: ["repos", "github"],
          example: "zila github-repos",
          tags: ["github", "code", "examples"],
        },
      ],
    },
    {
      name: "System",
      icon: "⚙️",
      color: "muted",
      commands: [
        {
          name: "help",
          description: "Show this help center (you are here!)",
          example: "zila help",
          tags: ["help", "commands", "guide"],
        },
        {
          name: "info",
          description: "Display system and version information",
          example: "zila info",
          tags: ["version", "system", "about"],
        },
        {
          name: "clear",
          description: "Clear the terminal screen and history",
          example: "zila clear",
          tags: ["clean", "reset", "clear"],
        },
        {
          name: "exit",
          description: "Exit Zila and return to your shell",
          aliases: ["quit"],
          example: "zila exit",
          tags: ["quit", "close", "logout"],
        },
      ],
    },
  ];

  const currentCategory = categories[selectedCategory];
  if (!currentCategory) return null;

  const totalCommands = categories.reduce((sum, cat) => sum + cat.commands.length, 0);

  // Filter commands based on search
  const getFilteredCommands = () => {
    if (!searchQuery) return currentCategory.commands;

    const query = searchQuery.toLowerCase();
    return currentCategory.commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      cmd.aliases?.some(a => a.toLowerCase().includes(query)) ||
      cmd.tags?.some(t => t.toLowerCase().includes(query))
    );
  };

  const filteredCommands = getFilteredCommands();

  useInput((char, key) => {
    // Search mode handling
    if (showSearch) {
      if (key.escape) {
        setShowSearch(false);
        setSearchQuery("");
      } else if (key.return) {
        setShowSearch(false);
      } else if (key.backspace || key.delete) {
        setSearchQuery(searchQuery.slice(0, -1));
      } else if (!key.ctrl && !key.meta && char) {
        setSearchQuery(searchQuery + char);
      }
      return;
    }

    // Normal navigation
    if (key.escape || char === "q") {
      onClose();
    } else if (char === "/") {
      setShowSearch(true);
      setSearchQuery("");
    } else if (key.leftArrow || char === "h") {
      setSelectedCategory(Math.max(0, selectedCategory - 1));
      setSelectedCommand(0);
    } else if (key.rightArrow || char === "l") {
      setSelectedCategory(Math.min(categories.length - 1, selectedCategory + 1));
      setSelectedCommand(0);
    } else if (key.upArrow || char === "k") {
      setSelectedCommand(Math.max(0, selectedCommand - 1));
    } else if (key.downArrow || char === "j") {
      setSelectedCommand(Math.min(filteredCommands.length - 1, selectedCommand + 1));
    } else if (key.return) {
      const cmd = filteredCommands[selectedCommand];
      if (cmd) {
        onSelect(cmd.name);
      }
    } else if (char === "c") {
      clearHistory();
      onClose();
    } else if (char >= "1" && char <= "6") {
      const index = parseInt(char) - 1;
      if (index < categories.length) {
        setSelectedCategory(index);
        setSelectedCommand(0);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="column" marginBottom={2}>
        <Box>
          <Text bold color={theme.colors.primaryBright}>
            ╔══════════════════════════════════════════════════════════════════════════════════════╗
          </Text>
        </Box>
        <Box>
          <Text bold color={theme.colors.primaryBright}>
            ║  </Text>
          <Text bold color={theme.colors.primaryBright}>📖 ZILA COMMAND CENTER</Text>
          <Text bold color={theme.colors.primaryBright}>                                                           ║
          </Text>
        </Box>
        <Box>
          <Text color={theme.colors.accent}>
            ║  {totalCommands} commands • </Text>
          <Text color={theme.colors.muted}>Use </Text>
          <Text bold color={theme.colors.primary}>← → </Text>
          <Text color={theme.colors.muted}>or </Text>
          <Text bold color={theme.colors.primary}>h l </Text>
          <Text color={theme.colors.muted}>for categories • </Text>
          <Text bold color={theme.colors.primary}>↑ ↓ </Text>
          <Text color={theme.colors.muted}>or </Text>
          <Text bold color={theme.colors.primary}>j k </Text>
          <Text color={theme.colors.muted}>to select</Text>
          <Text color={theme.colors.accent}>            ║
          </Text>
        </Box>
        <Box>
          <Text bold color={theme.colors.primaryBright}>
            ╚══════════════════════════════════════════════════════════════════════════════════════╝
          </Text>
        </Box>
      </Box>

      {/* Search bar */}
      {showSearch && (
        <Box marginBottom={1} borderStyle="round" borderColor={theme.colors.primary} paddingX={1}>
          <Text color={theme.colors.primary}>🔍 Search: </Text>
          <Text color={theme.colors.text}>{searchQuery}</Text>
          <Text color={theme.colors.primaryBright}>█</Text>
          <Text color={theme.colors.dim}> (ESC to cancel)</Text>
        </Box>
      )}

      {/* Category tabs */}
      <Box marginBottom={2} flexWrap="wrap">
        {categories.map((cat, index) => (
          <Box key={cat.name} marginRight={1} marginBottom={1}>
            {selectedCategory === index ? (
              <Box
                borderStyle="round"
                borderColor={theme.colors[cat.color]}
                paddingX={1}
              >
                <Text bold color={theme.colors[cat.color]}>
                  {cat.icon} {cat.name}
                </Text>
              </Box>
            ) : (
              <Box paddingX={1}>
                <Text color={theme.colors.dim}>
                  {cat.icon} {cat.name}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Commands list */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.colors[currentCategory.color]}
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color={theme.colors[currentCategory.color]}>
            {currentCategory.icon} {currentCategory.name}
          </Text>
          <Text color={theme.colors.muted}> ({filteredCommands.length} commands)</Text>
        </Box>

        {filteredCommands.length === 0 ? (
          <Box flexDirection="column" alignItems="center" paddingY={2}>
            <Text>📭</Text>
            <Text color={theme.colors.muted}>No commands found</Text>
            <Text color={theme.colors.dim}>Try a different search or category</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {filteredCommands.map((cmd, index) => (
              <Box key={cmd.name} flexDirection="column" marginY={1}>
                <Box>
                  <Text color={selectedCommand === index ? theme.colors.primary : theme.colors.dim}>
                    {selectedCommand === index ? "▸ " : "  "}
                  </Text>
                  <Text
                    bold
                    color={selectedCommand === index ? theme.colors.primaryBright : theme.colors.text}
                  >
                    {cmd.name}
                  </Text>
                  {cmd.aliases && cmd.aliases.length > 0 && (
                    <Text color={theme.colors.dimmer}>
                      {" "}({cmd.aliases.join(", ")})
                    </Text>
                  )}
                </Box>
                <Box marginLeft={3} flexDirection="column">
                  <Text color={theme.colors.muted}>{cmd.description}</Text>
                  {cmd.example && (
                    <Box marginTop={0}>
                      <Text color={theme.colors.dim}>$ </Text>
                      <Text color={theme.colors.accent} dimColor>
                        {cmd.example}
                      </Text>
                    </Box>
                  )}
                  {cmd.tags && selectedCommand === index && (
                    <Box marginTop={0}>
                      <Text color={theme.colors.dimmer}>
                        🏷️  {cmd.tags.join(" • ")}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop={2}>
        <Text color={theme.colors.border}>
          {"─".repeat(90)}
        </Text>
      </Box>

      {/* Footer with shortcuts */}
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color={theme.colors.primary} bold>KEYBOARD SHORTCUTS</Text>
        </Box>
        <Box flexDirection="column">
          <Box>
            <Text color={theme.colors.accent} bold>ESC</Text>
            <Text color={theme.colors.muted}> or </Text>
            <Text color={theme.colors.accent} bold>Q</Text>
            <Text color={theme.colors.muted}> Close help  •  </Text>
            <Text color={theme.colors.accent} bold>ENTER</Text>
            <Text color={theme.colors.muted}> Run selected command  •  </Text>
            <Text color={theme.colors.accent} bold>C</Text>
            <Text color={theme.colors.muted}> Clear & close</Text>
          </Box>
          <Box marginTop={0}>
            <Text color={theme.colors.accent} bold>1-6</Text>
            <Text color={theme.colors.muted}> Quick category switch  •  </Text>
            <Text color={theme.colors.accent} bold>/</Text>
            <Text color={theme.colors.muted}> Search commands  •  </Text>
            <Text color={theme.colors.accent} bold>h/l</Text>
            <Text color={theme.colors.muted}> or </Text>
            <Text color={theme.colors.accent} bold>← →</Text>
            <Text color={theme.colors.muted}> Navigate categories</Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.colors.dimmer} dimColor>
            💡 Pro tip: Type commands directly in the prompt - no need to open help every time!
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
