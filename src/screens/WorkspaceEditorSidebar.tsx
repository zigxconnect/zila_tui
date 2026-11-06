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
import { isMouseOrControlSequence, cleanTypedInput } from "../utils/terminalInputSanitizer.js";
import { tokenizeCodeLine, VSCODE_DARK } from "../utils/codeHighlighter.js";

interface WorkspaceEditorSidebarProps {
  width?: number;
  height?: number;
  isFocused?: boolean;
  onOpenSubmitTask?: () => void;
  onClose?: () => void;
}

function getLineAndCol(
  text: string,
  cursorIndex: number,
): { lineIdx: number; colIdx: number; lines: string[] } {
  const lines = text.split("\n");
  let accumulated = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i]?.length || 0;
    if (cursorIndex <= accumulated + lineLen) {
      return { lineIdx: i, colIdx: Math.max(0, cursorIndex - accumulated), lines };
    }
    accumulated += lineLen + 1; // +1 for newline
  }
  return {
    lineIdx: Math.max(0, lines.length - 1),
    colIdx: lines[lines.length - 1]?.length || 0,
    lines,
  };
}

function getIndexFromLineAndCol(lines: string[], lineIdx: number, colIdx: number): number {
  let idx = 0;
  const targetLine = Math.max(0, Math.min(lines.length - 1, lineIdx));
  for (let i = 0; i < targetLine; i++) {
    idx += (lines[i]?.length || 0) + 1;
  }
  const targetCol = Math.max(0, Math.min(lines[targetLine]?.length || 0, colIdx));
  return idx + targetCol;
}

function getFileInfo(fileName: string): { icon: string; lang: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".py")) return { icon: "🐍", lang: "Python" };
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return { icon: "📘", lang: "TypeScript" };
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return { icon: "🟨", lang: "JavaScript" };
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return { icon: "📝", lang: "Markdown" };
  if (lower.endsWith(".json")) return { icon: "📦", lang: "JSON" };
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return { icon: "⚙️", lang: "YAML" };
  if (lower.endsWith(".sh") || lower.endsWith(".bash")) return { icon: "🐚", lang: "Shell" };
  return { icon: "📄", lang: "Plain Text" };
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
  const [editCursor, setEditCursor] = useState<number>(0);
  const [editScrollOffset, setEditScrollOffset] = useState<number>(0);

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
  const refreshDirectory = (subDir: string, info = repoInfo) => {
    if (!info) return;
    const entries = listWorkspaceFiles(info.localPath, subDir);
    if (subDir) {
      const parentDir = path.dirname(subDir);
      const nextDir = parentDir === "." ? "" : parentDir;
      entries.unshift({
        name: ".. (parent directory)",
        relativePath: nextDir,
        isDir: true,
      });
    }
    setFiles(entries);
    setSelectedIndex(0);
  };

  useInput((input, key) => {
    if (!isFocused) return;
    if (isMouseOrControlSequence(input)) return;

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

      // Left arrow goes up to parent directory
      if (key.leftArrow) {
        if (currentSubDir) {
          const parentDir = path.dirname(currentSubDir);
          const nextDir = parentDir === "." ? "" : parentDir;
          setCurrentSubDir(nextDir);
          refreshDirectory(nextDir);
        }
        return;
      }

      // Enter or Right arrow enters directory or opens file
      if (key.return || key.rightArrow) {
        const item = files[selectedIndex];
        if (!item || !repoInfo) return;

        if (item.isDir) {
          setCurrentSubDir(item.relativePath);
          refreshDirectory(item.relativePath);
        } else if (key.return) {
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
        setEditCursor(activeFile ? activeFile.content.length : 0);
        setEditScrollOffset(0);
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
    // EDIT MODE (Full In-Terminal Text Editor)
    // ─────────────────────────────────────────────
    if (viewMode === "edit") {
      if ((key.ctrl && input === "s") || (key.ctrl && input === "w")) {
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

      // Left arrow
      if (key.leftArrow) {
        setEditCursor((prev) => Math.max(0, prev - 1));
        return;
      }

      // Right arrow
      if (key.rightArrow) {
        setEditCursor((prev) => Math.min(editBuffer.length, prev + 1));
        return;
      }

      // Up arrow
      if (key.upArrow) {
        const { lineIdx, colIdx, lines } = getLineAndCol(editBuffer, editCursor);
        if (lineIdx > 0) {
          const nextIdx = getIndexFromLineAndCol(lines, lineIdx - 1, colIdx);
          setEditCursor(nextIdx);
        } else {
          setEditCursor(0);
        }
        return;
      }

      // Down arrow
      if (key.downArrow) {
        const { lineIdx, colIdx, lines } = getLineAndCol(editBuffer, editCursor);
        if (lineIdx < lines.length - 1) {
          const nextIdx = getIndexFromLineAndCol(lines, lineIdx + 1, colIdx);
          setEditCursor(nextIdx);
        } else {
          setEditCursor(editBuffer.length);
        }
        return;
      }

      // Home / Ctrl+A
      if ((key as any).home || (key.ctrl && input === "a")) {
        const { lineIdx, lines } = getLineAndCol(editBuffer, editCursor);
        setEditCursor(getIndexFromLineAndCol(lines, lineIdx, 0));
        return;
      }

      // End / Ctrl+E
      if ((key as any).end || (key.ctrl && input === "e")) {
        const { lineIdx, lines } = getLineAndCol(editBuffer, editCursor);
        setEditCursor(getIndexFromLineAndCol(lines, lineIdx, lines[lineIdx]?.length || 0));
        return;
      }

      // PageUp / PageDown
      if (key.pageUp) {
        const { lineIdx, colIdx, lines } = getLineAndCol(editBuffer, editCursor);
        setEditCursor(getIndexFromLineAndCol(lines, Math.max(0, lineIdx - 6), colIdx));
        return;
      }
      if (key.pageDown) {
        const { lineIdx, colIdx, lines } = getLineAndCol(editBuffer, editCursor);
        setEditCursor(getIndexFromLineAndCol(lines, Math.min(lines.length - 1, lineIdx + 6), colIdx));
        return;
      }

      // Enter key (newline at cursor)
      if (key.return) {
        const cur = editCursor;
        const newBuf = editBuffer.slice(0, cur) + "\n" + editBuffer.slice(cur);
        setEditBuffer(newBuf);
        setEditCursor(cur + 1);
        return;
      }

      // Backspace key (delete character before cursor)
      if (key.backspace || input === "\x7f" || input === "\b") {
        const cur = editCursor;
        if (cur > 0) {
          const newBuf = editBuffer.slice(0, cur - 1) + editBuffer.slice(cur);
          setEditBuffer(newBuf);
          setEditCursor(cur - 1);
        }
        return;
      }

      // Delete key (delete character at cursor)
      if (key.delete || input === "\x1b[3~") {
        const cur = editCursor;
        if (cur < editBuffer.length) {
          const newBuf = editBuffer.slice(0, cur) + editBuffer.slice(cur + 1);
          setEditBuffer(newBuf);
        }
        return;
      }

      // Text typing
      if (input && !key.ctrl && !key.meta && input !== "\r" && input !== "\n") {
        const cleaned = cleanTypedInput(input);
        if (!cleaned) return;
        const cur = editCursor;
        const newBuf = editBuffer.slice(0, cur) + cleaned + editBuffer.slice(cur);
        setEditBuffer(newBuf);
        setEditCursor(cur + cleaned.length);
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
      {viewMode === "explorer" ? (
        <>
          <SidebarTwoColumnRow
            left={{
              text: `◈ EXPLORER: ${repoInfo?.repoName || "Curriculum Repo"}`,
              color: theme.colors.retroCyanBright,
              bold: true,
            }}
            right={{
              text: `[git: ${repoInfo?.branch || "main"}]`,
              color: theme.colors.retroBlueBright,
              bold: true,
            }}
            width={innerWidth}
          />

          <SidebarTwoColumnRow
            left={{
              text: currentSubDir ? `📁 /${currentSubDir}` : "📁 / (workspace root)",
              color: theme.colors.white,
              bold: Boolean(currentSubDir),
            }}
            right={{
              text: `${files.length} items`,
              color: theme.colors.retroSlateDark,
            }}
            width={innerWidth}
          />
        </>
      ) : (
        <>
          {/* VS Code Tab Bar */}
          <Box flexDirection="row" width={innerWidth} height={1} overflow="hidden">
            <Text color="#FFFFFF" backgroundColor={VSCODE_DARK.editorBg} bold>
              {` [ ${getFileInfo(activeFile?.relativePath || "").icon} ${path.basename(activeFile?.path || "")} ${viewMode === "edit" ? "●" : "×"} ] `}
            </Text>
            <Text color={theme.colors.retroSlateDark} backgroundColor={VSCODE_DARK.tabInactiveBg}>
              {` [${viewMode.toUpperCase()}] `}
            </Text>
            <Text backgroundColor={VSCODE_DARK.tabInactiveBg}>
              {" ".repeat(Math.max(0, innerWidth - (path.basename(activeFile?.path || "").length + 18)))}
            </Text>
          </Box>
          {/* Breadcrumbs */}
          <Box flexDirection="row" width={innerWidth} height={1} overflow="hidden">
            <Text color={VSCODE_DARK.gutterFg} backgroundColor={VSCODE_DARK.editorBg}>
              {` 📁 ${activeFile?.relativePath.split("/").join(" › ")} `}
            </Text>
            <Text backgroundColor={VSCODE_DARK.editorBg}>
              {" ".repeat(Math.max(0, innerWidth - (activeFile?.relativePath.length || 0) - 6))}
            </Text>
          </Box>
        </>
      )}
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
              const fileInfo = file.isDir ? { icon: "📁", lang: "Directory" } : getFileInfo(file.name);
              const icon = `${fileInfo.icon} `;
              const isExercise = file.name.toLowerCase().includes("exercise") || file.name.endsWith(".md");
              const prefix = isSelected ? "▎ " : "  ";

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
                    color: isSelected ? theme.colors.white : theme.colors.retroSlateDark,
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
            const tokens = tokenizeCodeLine(line, activeFile?.relativePath || "");
            const gutterText = ` ${lineNumStr} │ `;
            const availCodeW = Math.max(10, innerWidth - gutterText.length);

            let lineLen = 0;
            const renderedTokens: React.ReactNode[] = [];

            for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
              const token = tokens[tIdx]!;
              if (lineLen >= availCodeW) break;
              const remaining = availCodeW - lineLen;
              const tokenStr = token.text.length > remaining ? token.text.slice(0, remaining) : token.text;
              lineLen += tokenStr.length;
              renderedTokens.push(
                <Text
                  key={tIdx}
                  color={token.color}
                  backgroundColor={VSCODE_DARK.editorBg}
                  bold={token.bold}
                  dimColor={token.dim}
                >
                  {tokenStr}
                </Text>
              );
            }

            const padW = Math.max(0, availCodeW - lineLen);

            return (
              <Box key={idx} flexDirection="row" width={innerWidth} height={1} overflow="hidden">
                <Text color={VSCODE_DARK.gutterFg} backgroundColor={VSCODE_DARK.gutterBg}>
                  {gutterText}
                </Text>
                {renderedTokens}
                {padW > 0 && (
                  <Text backgroundColor={VSCODE_DARK.editorBg}>
                    {" ".repeat(padW)}
                  </Text>
                )}
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
      {!loading && viewMode === "edit" && (() => {
        const editLines = editBuffer.split("\n");
        const { lineIdx: curLine, colIdx: curCol } = getLineAndCol(editBuffer, editCursor);
        const editorViewportH = Math.max(3, viewportHeight - 1);

        // Keep active line within viewport
        let currentScroll = editScrollOffset;
        if (curLine < currentScroll) {
          currentScroll = curLine;
        } else if (curLine >= currentScroll + editorViewportH) {
          currentScroll = curLine - editorViewportH + 1;
        }

        const visibleEditLines = editLines.slice(currentScroll, currentScroll + editorViewportH);
        const emptyRows = Math.max(0, editorViewportH - visibleEditLines.length);
        const fileInfo = getFileInfo(activeFile?.relativePath || "");

        return (
          <Box flexDirection="column" height={viewportHeight} overflow="hidden">
            {/* VS Code Status Bar */}
            <Box flexDirection="row" width={innerWidth} height={1} overflow="hidden">
              <Text color={VSCODE_DARK.statusBarFg} backgroundColor={VSCODE_DARK.statusBarBg} bold>
                {` ⚡ Ln ${curLine + 1}, Col ${curCol + 1}  │  UTF-8  │  ${fileInfo.lang}  │  Spaces: 4 `}
              </Text>
              <Text color={VSCODE_DARK.statusBarFg} backgroundColor={VSCODE_DARK.statusBarBg}>
                {" ".repeat(Math.max(1, innerWidth - (fileInfo.lang.length + String(curLine).length + String(curCol).length + (repoInfo?.branch?.length || 4) + 38)))}
              </Text>
              <Text color={VSCODE_DARK.statusBarFg} backgroundColor={VSCODE_DARK.statusBarBg} bold>
                {`[git: ${repoInfo?.branch || "main"}] `}
              </Text>
            </Box>

            {visibleEditLines.map((lineText, vIdx) => {
              const actualLineNum = currentScroll + vIdx + 1;
              const isCurrent = currentScroll + vIdx === curLine;
              const numStr = String(actualLineNum).padStart(3, " ");
              const gutterText = ` ${numStr} │ `;
              const availCodeW = Math.max(10, innerWidth - gutterText.length);
              const rowBg = isCurrent ? VSCODE_DARK.editorActiveLineBg : VSCODE_DARK.editorBg;
              const gutterColor = isCurrent ? VSCODE_DARK.activeLineGutterFg : VSCODE_DARK.gutterFg;

              if (isCurrent) {
                const before = lineText.slice(0, curCol);
                const curChar = curCol < lineText.length ? lineText[curCol] : " ";
                const after = curCol < lineText.length ? lineText.slice(curCol + 1) : "";
                const curCharW = 1;
                const remainingW = Math.max(0, availCodeW - before.length - curCharW - after.length);

                return (
                  <Box key={vIdx} flexDirection="row" width={innerWidth} height={1} overflow="hidden">
                    <Text color={gutterColor} backgroundColor={rowBg} bold>
                      {gutterText}
                    </Text>
                    <Text color={VSCODE_DARK.plain} backgroundColor={rowBg}>
                      {before}
                    </Text>
                    <Text color="#000000" backgroundColor={VSCODE_DARK.cursor} bold>
                      {curChar}
                    </Text>
                    <Text color={VSCODE_DARK.plain} backgroundColor={rowBg}>
                      {after}
                    </Text>
                    {remainingW > 0 && (
                      <Text backgroundColor={rowBg}>
                        {" ".repeat(remainingW)}
                      </Text>
                    )}
                  </Box>
                );
              }

              // Inactive lines: tokenize for syntax coloring
              const tokens = tokenizeCodeLine(lineText, activeFile?.relativePath || "");
              let lineLen = 0;
              const renderedTokens: React.ReactNode[] = [];

              for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
                const token = tokens[tIdx]!;
                if (lineLen >= availCodeW) break;
                const remaining = availCodeW - lineLen;
                const tokenStr = token.text.length > remaining ? token.text.slice(0, remaining) : token.text;
                lineLen += tokenStr.length;
                renderedTokens.push(
                  <Text
                    key={tIdx}
                    color={token.color}
                    backgroundColor={rowBg}
                    bold={token.bold}
                    dimColor={token.dim}
                  >
                    {tokenStr}
                  </Text>
                );
              }

              const padW = Math.max(0, availCodeW - lineLen);

              return (
                <Box key={vIdx} flexDirection="row" width={innerWidth} height={1} overflow="hidden">
                  <Text color={gutterColor} backgroundColor={rowBg}>
                    {gutterText}
                  </Text>
                  {renderedTokens}
                  {padW > 0 && (
                    <Text backgroundColor={rowBg}>
                      {" ".repeat(padW)}
                    </Text>
                  )}
                </Box>
              );
            })}
            <SidebarEmptyRows count={emptyRows} width={innerWidth} />
          </Box>
        );
      })()}

      {/* Footer */}
      <SidebarDivider width={innerWidth} />
      <SidebarTwoColumnRow
        left={{
          text:
            viewMode === "explorer"
              ? "Enter/→ open · Backspace/← up · 'O' VS Code"
              : viewMode === "viewer"
              ? "↑/↓ scroll · 'E' edit · 'O' VS Code"
              : "Arrows navigate · Enter newline · Backspace del",
          color: theme.colors.retroSlateDark,
        }}
        right={{
          text: viewMode === "edit" ? "Ctrl+S save · Esc back" : "'S' Submit · Tab focus",
          color: theme.colors.retroCyanBright,
          bold: true,
        }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
