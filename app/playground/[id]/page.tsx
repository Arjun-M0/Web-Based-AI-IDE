"use client";

import React, { useEffect, useState , useCallback, useRef } from "react";
import PlaygroundEditor from "@/features/playground/components/playground-editor";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import LoadingStep from "@/components/ui/loader";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePlayground } from "@/features/playground/hooks/usePlayground";
import TemplateFileTree from "@/features/playground/components/template-file-tree";
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer";
import type { TemplateFile } from "@/features/playground/types";
import { findFilePath } from "@/features/playground/lib";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs , TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@/components/ui/tabs";
import {
  FileText,
  FolderOpen,
  AlertCircle,
  Save,
  X,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "react-day-picker";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWebContainer } from "@/features/webContainers/hooks/useWebContainer";
import WebContainerPreview from "@/features/webContainers/components/webcontainer_preview";

const Page = () => {
  const { id } = useParams<{ id: string }>();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    updateFileContent,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    openFiles,
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
  } = useFileExplorer();

  const {
    serverUrl,
    isLoading:containerLoading,
    error: containerError,
    instance,
    writeFileSync,
    // @ts-ignore
  } = useWebContainer({templateData});

  const lastSyncedContent = useRef<Map<string, string>>(new Map());

  useEffect(()=>{
    setPlaygroundId(id);
  },[id,setPlaygroundId])

  useEffect(()=>{
    if(templateData && !openFiles.length){
      setTemplateData(templateData);
    }
  },[templateData, setTemplateData, openFiles.length])

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);
  const handleFileSelect = (file: TemplateFile) => { 
    openFile(file);
  }

  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetFileId = fileId || activeFileId;
      if (!targetFileId) return;

      const fileToSave = openFiles.find((f) => f.id === targetFileId);
      if (!fileToSave) return;

      const latestTemplateData = useFileExplorer.getState().templateData;
      if (!latestTemplateData) return;

      try {
        const filePath = findFilePath(fileToSave, latestTemplateData);
        if (!filePath) {
          toast.error(
            `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`
          );
          return;
        }

        // Update file content in template data (clone for immutability)
        const updatedTemplateData = JSON.parse(
          JSON.stringify(latestTemplateData)
        ) as { folderName: string; items: Array<Record<string, unknown>> };
        const updateFileContent = (
          items: Array<Record<string, unknown>>
        ): Array<Record<string, unknown>> =>
          items.map((item): Record<string, unknown> => {
            if ("folderName" in item) {
              return {
                ...item,
                items: updateFileContent(
                  (item.items as Array<Record<string, unknown>>) || []
                ),
              };
            } else if (
              item.filename === fileToSave.filename &&
              item.fileExtension === fileToSave.fileExtension
            ) {
              return { ...item, content: fileToSave.content };
            }
            return item;
          });
        updatedTemplateData.items = updateFileContent(
          updatedTemplateData.items
        );

        // Sync with WebContainer
        if (writeFileSync) {
          await writeFileSync(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
          if (instance && instance.fs) {
            await instance.fs.writeFile(filePath, fileToSave.content);
          }
        }

        // Use saveTemplateData to persist changes
        await saveTemplateData(updatedTemplateData as any);
        setTemplateData(updatedTemplateData as any);

        // Update open files
        const updatedOpenFiles = openFiles.map((f) =>
          f.id === targetFileId
            ? {
                ...f,
                content: fileToSave.content,
                originalContent: fileToSave.content,
                hasUnsavedChanges: false,
              }
            : f
        );
        setOpenFiles(updatedOpenFiles);

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
        throw error;
      }
    },
    [
      activeFileId,
      openFiles,
      writeFileSync,
      instance,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ]
  );

  React.useEffect(()=>{
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSave]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep
              currentStep={1}
              step={1}
              label="Loading playground data"
            />
            <LoadingStep
              currentStep={2}
              step={2}
              label="Setting up environment"
            />
            <LoadingStep currentStep={3} step={3} label="Ready to code" />
          </div>
        </div>
      </div>
    );
  }

  // No template data
  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">
          No template data available
        </h2>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Template
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree data={templateData!} onFileSelect={handleFileSelect} selectedFile={activeFile} />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center">
              <div className="flex flex-col flex-1">
                <h1 className="text-sm font-medium">
                  {playgroundData?.title || "Code Playground"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {openFiles.length} File(s) open
                  {hasUnsavedChanges && " - Unsaved changes"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"sm"}
                      variant="outline"
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                      onClick={() => handleSave()}
                    >
                      <Save className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save changes</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"sm"}
                      variant="outline"
                      disabled={!hasUnsavedChanges}
                      onClick={() => {}}
                    >
                      <Bot className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle AI</p>
                  </TooltipContent>
                </Tooltip> */}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size={"sm"} variant="outline">
                    <Settings className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setIsPreviewVisible((prev) => !prev)}
                  >
                    {isPreviewVisible ? "Hide" : "Show"} Preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={closeAllFiles}>
                    Close All Files
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-4">
                      <TabsList className ="h-8 bg-transparent p-0">
                        {
                            openFiles.map((file)=>(
                              <TabsTrigger key={file.id} value={file.id} className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group">
                                  <div className="flex items-center gap-2">
                                    <FileText className="size-3" />
                                    <span className="text-sm">{file.filename}</span>
                                    {
                                      file.hasUnsavedChanges && (
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                      )
                                    }
                                    <span onClick={(e)=>{
                                      e.stopPropagation();
                                      closeFile(file.id);
                                    }} className="ml-2 text-muted-foreground hover:text-foreground">
                                      <X className="size-4" />
                                    </span>
                                  </div>
                              </TabsTrigger>
                            ))
                        }
                      </TabsList>
                      {
                         openFiles.length > 1 && (
                          <Button variant="outline" size="sm" onClick={closeAllFiles}>
                            Close All
                          </Button>
                         )
                      }
                    </div>
                  </Tabs>
                </div>
                <div className="flex-1">
                  <ResizablePanelGroup orientation="horizontal" className="h-full">
                    <ResizablePanel defaultSize={isPreviewVisible?50:100}>
                      <PlaygroundEditor
                        activeFile={activeFile}
                        content={activeFile?.content || ""}
                        onContentChange={(value)=> activeFileId && updateFileContent(activeFileId, value)}
                      />
                    </ResizablePanel>

                      {
                        isPreviewVisible && (
                          <>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={50} >
                              <WebContainerPreview
                                templateData={templateData}
                                instance={instance}
                                isLoading={containerLoading}
                                error={containerError}
                                writeFileSync={writeFileSync}
                                serverUrl={serverUrl!}
                                forceResetup={false}
                              />
                            </ResizablePanel>
                          </>
                        )
                      }

                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
                <FileText className="size-16 text-gray-300" />
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">No file opened</h2>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </>
    </TooltipProvider>
  );
};

export default Page;
