"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);
  const handleFileSelect = (file: TemplateFile) => { 
    openFile(file);
  }

  if (isLoading) return <div>Loading...</div>;
  if (!templateData) return <div>No template data found.</div>;

  console.log(templateData);

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
                      onClick={() => {}}
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
                  {
                    activeFile?.content || "No content to display"
                  }
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
