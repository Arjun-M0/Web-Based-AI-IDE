"use client";
import React, { useRef, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { TemplateFile } from "../lib/path-to-json";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "../lib/editor-config";
import { clear } from "node:console";
import { create } from "node:domain";

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  content: string;
  onContentChange: (value: string) => void;
  suggestion: string | null;
  suggestionPosition: { line: number; column: number } | null;
  suggestionLoading: boolean;
  onAcceptSuggestion: (editor: any, monaco: any) => void;
  onRejectSuggestion: (editor: any) => void;
  onTriggerSuggestion: (type: string, editor: any) => void;
}

const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionPosition,
  suggestionLoading,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const inlineCompletionProviderRef = useRef<any>(null);
  const currentSuggestionRef = useRef<{
    text: string;
    position: { line: number; column: number };
    id: string;
  } | null>(null);
  const isAcceptingSuggestionRef = useRef(false);
  const suggestionAcceptedRef = useRef(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabCommandRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateSuggestionId = () => {
    return `suggestion-${Date.now()}-${Math.random()}`;
  };

  const createInlineCompletionProvider = useCallback(
    (monaco: Monaco) => {
      return {
        provideInlineCompletions: async (
          model: any,
          position: any,
          context: any,
          token: any,
        ) => {
          console.log("provideInlineCompletions called", {
            hasSuggestion: !!suggestion,
            hasPosition: !!suggestionPosition,
            currentPos: `${position.lineNumber}:${position.column}`,
            suggestionPos: suggestionPosition
              ? `${suggestionPosition.line}:${suggestionPosition.column}`
              : null,
            isAccepting: isAcceptingSuggestionRef.current,
            suggestionAccepted: suggestionAcceptedRef.current,
          });

          // Don't provide completions if we're currently accepting or have already accepted
          if (
            isAcceptingSuggestionRef.current ||
            suggestionAcceptedRef.current
          ) {
            console.log("Skipping completion - already accepting or accepted");
            return { items: [] };
          }

          // Only provide suggestion if we have one
          if (!suggestion || !suggestionPosition) {
            console.log("No suggestion or position available");
            return { items: [] };
          }

          // Check if current position matches suggestion position (with some tolerance)
          const currentLine = position.lineNumber;
          const currentColumn = position.column;

          const isPositionMatch =
            currentLine === suggestionPosition.line &&
            currentColumn >= suggestionPosition.column &&
            currentColumn <= suggestionPosition.column + 2; // Small tolerance

          if (!isPositionMatch) {
            console.log("Position mismatch", {
              current: `${currentLine}:${currentColumn}`,
              expected: `${suggestionPosition.line}:${suggestionPosition.column}`,
            });
            return { items: [] };
          }

          const suggestionId = generateSuggestionId();
          currentSuggestionRef.current = {
            text: suggestion,
            position: suggestionPosition,
            id: suggestionId,
          };

          console.log("Providing inline completion", {
            suggestionId,
            suggestion: suggestion.substring(0, 50) + "...",
          });

          // Clean the suggestion text (remove \r characters)
          const cleanSuggestion = suggestion.replace(/\r/g, "");

          return {
            items: [
              {
                insertText: cleanSuggestion,
                range: new monaco.Range(
                  suggestionPosition.line,
                  suggestionPosition.column,
                  suggestionPosition.line,
                  suggestionPosition.column,
                ),
                kind: monaco.languages.CompletionItemKind.Snippet,
                label: "AI Suggestion",
                detail: "AI-generated code suggestion",
                documentation: "Press Tab to accept",
                sortText: "0000", // High priority
                filterText: "",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              },
            ],
          };
        },
        freeInlineCompletions: (completions: any) => {
          console.log("freeInlineCompletions called");
        },
        disposeInlineCompletions: (completions: any) => {
          console.log("disposeInlineCompletions called");
        },
      };
    },
    [suggestion, suggestionPosition],
  );

  const clearCurrentSuggestion = useCallback(() => {
    console.log("Clearing current suggestion");
    currentSuggestionRef.current = null;
    suggestionAcceptedRef.current = false;
    if (editorRef.current) {
      editorRef.current.trigger("ai", "editor.action.inlineSuggest.hide", null);
    }
  }, []);

  const acceptCurrentSuggestion = useCallback(() => {
    if (
      !editorRef.current ||
      !monacoRef.current ||
      !currentSuggestionRef.current
    )
      return false;

    if (!isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      return false;
    }

    isAcceptingSuggestionRef.current = true;
    suggestionAcceptedRef.current = true;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const currentSuggestion = currentSuggestionRef.current;

    try {
      const cleanSuggestionText = currentSuggestion.text.replace(/\r/g, "");
      const currentPosition = editor.getPosition();
      const suggestionPos = currentSuggestion.position;

      if (
        currentPosition.lineNumber !== suggestionPos.line &&
        currentPosition.column < suggestionPos.column &&
        currentPosition.column > suggestionPos.column + 5
      ) {
        console.log("Position changed , cannot accept suggestion");
        return false;
      }
      const range = new monaco.Range(
        suggestionPos.line,
        suggestionPos.column,
        suggestionPos.line,
        suggestionPos.column,
      );

      const success = editor.executeEdits("ai-suggestion-accept", [
        {
          range: range,
          text: cleanSuggestionText,
          forceMoveMarkers: true,
        },
      ]);

      const lines = cleanSuggestionText.split("\n");
      const endline = suggestionPos.line + lines.length - 1;
      const endColumn =
        lines.length === 1
          ? suggestionPos.column + cleanSuggestionText.length
          : lines[lines.length - 1].length + 1;

      editor.setPosition({ lineNumber: endline, column: endColumn });

      clearCurrentSuggestion();

      onAcceptSuggestion(editor, monaco);

      return true;
    } catch (error) {
      return false;
    } finally {
      isAcceptingSuggestionRef.current = false;

      setTimeout(() => {
        suggestionAcceptedRef.current = false;
      }, 1000);
    }
  }, [clearCurrentSuggestion, onAcceptSuggestion]);

  const hasActiveSuggestionAtPosition = useCallback(() => {
    if (!editorRef.current || !currentSuggestionRef.current) return false

    const position = editorRef.current.getPosition()
    const suggestion = currentSuggestionRef.current

    return (
      position.lineNumber === suggestion.position.line &&
      position.column >= suggestion.position.column &&
      position.column <= suggestion.position.column + 2
    )
  }, [])

  useEffect(() => {
    if(!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log("Skipping update - currently accepting/accepted suggestion")
      return
    }

     if (inlineCompletionProviderRef.current) {
      inlineCompletionProviderRef.current.dispose()
      inlineCompletionProviderRef.current = null
    }

    currentSuggestionRef.current = null;

     if (suggestion && suggestionPosition) {
      console.log("Registering new inline completion provider")

      const language = getEditorLanguage(activeFile?.fileExtension || "")
      const provider = createInlineCompletionProvider(monaco)

      inlineCompletionProviderRef.current = monaco.languages.registerInlineCompletionsProvider(language, provider)

      // Small delay to ensure editor is ready, then trigger suggestions
      setTimeout(() => {
        if (editorRef.current && !isAcceptingSuggestionRef.current && !suggestionAcceptedRef.current) {
          console.log("Triggering inline suggestions")
          editor.trigger("ai", "editor.action.inlineSuggest.trigger", null)
        }
      }, 50)
    }
    


  },[suggestion, suggestionPosition , activeFile , createInlineCompletionProvider])

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    configureMonaco(monaco);
    updateEditorLanguage();

    editor.onDidChangeModelContent((e: any) => {
      clearCurrentSuggestion();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (!isAcceptingSuggestionRef.current && !suggestionAcceptedRef.current) {
          onTriggerSuggestion("inline", editor);
        }
      }, 750);
    });
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const language = getEditorLanguage(activeFile.fileExtension || "");
    try {
      monacoRef.current.editor.setModelLanguage(model, language);
    } catch (e) {
      console.error("Failed to set editor language:", e);
    }
  };

  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile]);

  return (
    <div className="h-full relative">
      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        //@ts-ignore
        options={defaultEditorOptions}
      />
    </div>
  );
};

export default PlaygroundEditor;
