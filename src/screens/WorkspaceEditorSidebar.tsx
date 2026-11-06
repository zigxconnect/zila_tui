import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import path from "node:path";
import { theme } from "../ui/theme.js";
import {
  resolveSupervisorRepo,
  ensureSupervisorRepoCloned,
  listWorkspaceFiles,
  readWorkspaceFile,
  saveWorkspaceFile,
  openInExternalEditor,
  type WorkspaceRepoInfo,
  type WorkspaceFileEntry,
} from "../utils/workspaceManager.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarLine,
  SidebarLoadingRow,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";

interface WorkspaceEditorSidebarProps {
  width?: number;
  height?: number;
  isFocused?: boolean;
  onOpenSubmitTask?: () => void;
  onClose?: () => void;
}

export const WorkspaceEditorSidebar: React.FC<WorkspaceEditorSidebarProps> = ({
  width,
  height,
  isFocused = false,
  onOpenSubmitTask,
  onClose,
}) => {
  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;

  const effectiveWidth = width ?? Math.max(40, Math.floor(termCols * 0.48));
  const effectiveHeight = height ?? Math.max(18, termRows - 6);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  const [repoInfo, setRepoInfo] = useState<WorkspaceRepoInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSubDir, setCurrentSubDir] = useState<string>("");
  const [files, setFiles] = useState<WorkspaceFileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"explorer" | "viewer" | "edit">("explorer");
  const [activeFile, setActiveFile] = useState<{
    path: string;
    relativePath: string;
    content: string;
    lines: number;
  } | null>(null);
  const [viewerScrollOffset, setViewerScrollOffset] = useState<number>(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>("");

  // Initialize repo
  useEffect(() => {
    let active = true;
    setLoading(true);

    resolveSupervisorRepo()
      .then(async (info) => {
        if (!active) return;
        setRepoInfo(info);

        if (!info.isCloned) {
          setStatusNotice(`Cloning ${info.repoName}...`);
          const cloneRes = await ensureSupervisorRepoCloned(info.repoUrl, info.localPath);
          if (cloneRes.success) {
            info.isCloned = true;
            setStatusNotice(`Cloned into ${path.basename(info.localPath)}`);
          } else {
            setStatusNotice(`Clone failed: ${cloneRes.error || "network error"}`);
          }
        }

        const entries = listWorkspaceFiles(info.localPath, "");
        setFiles(entries);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setStatusNotice(`Error: ${err.message || String(err)}`);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Refresh files whenever directory changes
  const refreshDirectory = (subDir: string) => {
    if (!repoInfo) return;
    const entries = listWorkspaceFiles(repoInfo.localPath, subDir);
    setFiles(entries);
    setSelectedIndex(0);
  };

  useInput((input, key) => {
    if (!isFocused) return;

    // Clear notice on keypress
    if (statusNotice && !input.includes("\x1b")) {
      setStatusNotice(null);
    }

    // ─────────────────────────────────────────────
    // EXPLORER MODE
    // ─────────────────────────────────────────────
    if (viewMode === "explorer") {
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(Math.max(0, files.length - 1), prev + 1));
        return;
      }

      if (key.return) {
        const item = files[selectedIndex];
        if (!item || !repoInfo) return;

        if (item.isDir) {
          setCurrentSubDir(item.relativePath);
          refreshDirectory(item.relativePath);
        } else {
          const fullPath = path.join(repoInfo.localPath, item.relativePath);
          const readRes = readWorkspaceFile(fullPath);
          if (readRes.success) {
            setActiveFile({
              path: fullPath,
              relativePath: item.relativePath,
              content: readRes.content,
              lines: readRes.lines,
            });
            setEditBuffer(readRes.content);
            setViewerScrollOffset(0);
            setViewMode("viewer");
          } else {
            setStatusNotice(readRes.error || "Cannot read file.");
          }
        }
        return;
      }

      // Backspace goes up directory level
      if (key.backspace || input === "\x7f" || input === "\b") {
        if (currentSubDir) {
          const parentDir = path.dirname(currentSubDir);
          const nextDir = parentDir === "." ? "" : parentDir;
          setCurrentSubDir(nextDir);
          refreshDirectory(nextDir);
        }
        return;
      }

      // 'o' opens in external editor (VS Code, Cursor, $EDITOR)
      if (input === "o" || input === "O") {
        if (!repoInfo) return;
        const item = files[selectedIndex];
        const targetPath = item
          ? path.join(repoInfo.localPath, item.relativePath)
          : repoInfo.localPath;
        const res = openInExternalEditor(targetPath);
        setStatusNotice(res.message);
        return;
      }

      // 's' opens task submission pipeline
      if ((input === "s" || input === "S") && !key.ctrl) {
        if (onOpenSubmitTask) {
          onOpenSubmitTask();
        }
        return;
      }

      if (key.escape || (input === "q" && !key.ctrl)) {
        if (currentSubDir) {
          const parentDir = path.dirname(currentSubDir);
          const nextDir = parentDir === "." ? "" : parentDir;
          setCurrentSubDir(nextDir);
          refreshDirectory(nextDir);
          return;
        }
        if (onClose) onClose();
        return;
      }
    }

    // ─────────────────────────────────────────────
    // VIEWER MODE
    // ─────────────────────────────────────────────
    if (viewMode === "viewer") {
      if (key.upArrow) {
        setViewerScrollOffset((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setViewerScrollOffset((prev) => prev + 1);
        return;
      }
      if (key.pageUp) {
        setViewerScrollOffset((prev) => Math.max(0, prev - 10));
        return;
      }
      if (key.pageDown) {
        setViewerScrollOffset((prev) => prev + 10);
        return;
      }

      // 'o' open active file in external editor
      if (input === "o" || input === "O") {
        if (activeFile) {
          const res = openInExternalEditor(activeFile.path);
          setStatusNotice(res.message);
        }
        return;
      }

      // 'e' edit file
      if (input === "e" || input === "E") {
        setViewMode("edit");
        return;
      }

      // 's' submit task
      if ((input === "s" || input === "S") && !key.ctrl) {
        if (onOpenSubmitTask) {
          onOpenSubmitTask();
        }
        return;
      }

      if (key.escape || input === "b" || input === "B" || key.backspace) {
        setViewMode("explorer");
        return;
      }
    }

    // ─────────────────────────────────────────────
    // EDIT MODE (Quick Inline Append / Edit)
    // ─────────────────────────────────────────────
    if (viewMode === "edit") {
      if (key.ctrl && input === "s") {
        if (activeFile) {
          const saveRes = saveWorkspaceFile(activeFile.path, editBuffer);
          if (saveRes.success) {
            setStatusNotice("✔ File saved successfully.");
            setActiveFile((prev) => (prev ? { ...prev, content: editBuffer } : null));
            setViewMode("viewer");
          } else {
            setStatusNotice(`✖ Save failed: ${saveRes.error}`);
          }
        }
        return;
      }

      if (key.escape) {
        setViewMode("viewer");
        return;
      }

      if (key.return) {
        setEditBuffer((prev) => prev + "\n");
        return;
      }

      if (key.backspace || input === "\x7f" || input === "\b") {
        setEditBuffer((prev) => prev.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta && input !== "\r" && input !== "\n") {
        setEditBuffer((prev) => prev + input);
        return;
      }
    }
  });

  const viewportHeight = Math.max(5, effectiveHeight - 7);

  // Explorer view slice
  const visibleFiles = files.slice(
    Math.max(0, Math.min(selectedIndex - 3, files.length - viewportHeight)),
    Math.max(0, Math.min(selectedIndex - 3, files.length - viewportHeight)) + viewportHeight,
  );

  // Viewer file lines
  const fileLines = activeFile ? activeFile.content.split("\n") : [];
  const maxViewerScroll = Math.max(0, fileLines.length - viewportHeight);
  const clampedViewerOffset = Math.min(viewerScrollOffset, maxViewerScroll);
  const visibleFileLines = fileLines.slice(
    clampedViewerOffset,
    clampedViewerOffset + viewportHeight,
  );

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* Header */}
      <SidebarTwoColumnRow
        left={{
          text: `◈ WORKSPACE: ${repoInfo?.repoName || "Curriculum Repo"}`,
          color: theme.colors.retroCyanBright,
          bold: true,
        }}
        right={{
          text: `[${repoInfo?.branch || "main"}]`,
          color: theme.colors.retroBlueBright,
          bold: true,
        }}
        width={innerWidth}
      />

      <SidebarTwoColumnRow
        left={{
          text: currentSubDir ? `📁 /${currentSubDir}` : "📁 / (repo root)",
          color: theme.colors.white,
          bold: Boolean(currentSubDir),
        }}
        right={{
          text: viewMode === "explorer" ? `${files.length} items` : `viewing: ${path.basename(activeFile?.path || "")}`,
          color: theme.colors.retroSlateDark,
        }}
        width={innerWidth}
      />
      <SidebarDivider width={innerWidth} />

      {/* Loading Row */}
      {loading && <SidebarLoadingRow suffix="course repository" width={innerWidth} />}

      {/* Status Notice if any */}
      {!loading && statusNotice && (
        <SidebarLine
          text={statusNotice}
          width={innerWidth}
          color={statusNotice.startsWith("✖") ? theme.colors.error : theme.colors.retroGreenBright}
          bold
        />
      )}

      {/* ─────────────────── EXPLORER MODE ─────────────────── */}
      {!loading && viewMode === "explorer" && (
        <Box flexDirection="column" height={viewportHeight} overflow="hidden">
          {files.length === 0 ? (
            <Box flexDirection="column" paddingX={1} paddingTop={1}>
              <Text color={theme.colors.retroSlateDark}>
                No files found in this directory.
              </Text>
              <Text color={theme.colors.retroSlateDark}>
                Press Backspace to go up a folder, or 'O' to open repo in VS Code.
              </Text>
            </Box>
          ) : (
            visibleFiles.map((file) => {
              const isSelected = files[selectedIndex]?.relativePath === file.relativePath;
              const prefix = isSelected ? "❯ " : "  ";
              const icon = file.isDir ? "📂 " : "📄 ";
              const isExercise = file.name.toLowerCase().includes("exercise") || file.name.endsWith(".md");

              return (
                <SidebarTwoColumnRow
                  key={file.relativePath}
                  left={{
                    text: `${prefix}${icon}${file.name}`,
                    color: isSelected
                      ? theme.colors.white
                      : isExercise
                      ? theme.colors.retroCyanBright
                      : file.isDir
                      ? theme.colors.retroBlueBright
                      : theme.colors.text,
                    bold: isSelected || file.isDir || isExercise,
                  }}
                  right={{
                    text: file.isDir ? "DIR" : `${Math.round((file.size || 0) / 1024)}KB`,
                    color: theme.colors.retroSlateDark,
                  }}
                  width={innerWidth}
                />
              );
            })
          )}
          <SidebarEmptyRows
            count={Math.max(
              0,
              viewportHeight - (files.length === 0 ? 2 : visibleFiles.length),
            )}
            width={innerWidth}
          />
        </Box>
      )}

      {/* ─────────────────── VIEWER MODE ─────────────────── */}
      {!loading && viewMode === "viewer" && (
        <Box flexDirection="column" height={viewportHeight} overflow="hidden">
          {visibleFileLines.map((line, idx) => {
            const lineNum = clampedViewerOffset + idx + 1;
            const lineNumStr = String(lineNum).padStart(3, " ");
            const availW = Math.max(10, innerWidth - 7);
            const truncated = line.length > availW ? line.slice(0, availW - 1) + "…" : line;

            return (
              <Box key={idx} flexDirection="row" width={innerWidth} height={1} overflow="hidden">
                <Text color={theme.colors.retroSlateDark} backgroundColor={theme.colors.sidebarBg}>
                  {` ${lineNumStr} `}
                </Text>
                <Text color={theme.colors.white} backgroundColor={theme.colors.sidebarBg}>
                  {truncated}
                </Text>
              </Box>
            );
          })}
          <SidebarEmptyRows
            count={Math.max(0, viewportHeight - visibleFileLines.length)}
            width={innerWidth}
          />
        </Box>
      )}

      {/* ─────────────────── EDIT MODE ─────────────────── */}
      {!loading && viewMode === "edit" && (
        <Box flexDirection="column" height={viewportHeight} overflow="hidden">
          <SidebarLine
            text="INLINE EDITOR · Type to append · Ctrl+S save · Esc cancel"
            width={innerWidth}
            color={theme.colors.retroAmberBright}
            bold
          />
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={theme.colors.retroCyanBright}
            paddingX={1}
            marginX={1}
            height={viewportHeight - 2}
          >
            <Text color={theme.colors.white}>
              {editBuffer.slice(-300)}
              <Text color={theme.colors.retroCyanBright} bold>
                █
              </Text>
            </Text>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <SidebarDivider width={innerWidth} />
      <SidebarTwoColumnRow
        left={{
          text:
            viewMode === "explorer"
              ? "Enter open · Backspace up · 'O' VS Code"
              : viewMode === "viewer"
              ? "↑/↓ scroll · 'O' VS Code · 'E' edit"
              : "Ctrl+S save · Esc cancel",
          color: theme.colors.retroSlateDark,
        }}
        right={{
          text: "'S' Submit Task · Tab chat",
          color: theme.colors.retroCyanBright,
          bold: true,
        }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
