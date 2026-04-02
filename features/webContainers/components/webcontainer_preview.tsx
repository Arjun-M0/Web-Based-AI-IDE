"use client";
import React, { useEffect, useState } from "react";
import { TemplateFolder } from "@/features/playground/lib/path-to-json";
import { WebContainer } from "@webcontainer/api";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WebContainerPreviewProps {
    templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
    writeFileSync: (path: string, content: string) => Promise<void>;
    forceResetup?: boolean;
}


const WebContainerPreview = ({
    templateData,
    error,
    instance,
    isLoading,
    serverUrl,
    writeFileSync,
    forceResetup = false
}: WebContainerPreviewProps) => {
    const [previewUrl, setPreviewUrl] = useState<string>("");
  const [, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = 4;
    const [setupError, setSetupError] = useState<string | null>(null);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [isSetupInProgress, setIsSetupInProgress] = useState(false);

    useEffect(() => {
      if (forceResetup) {
            setIsSetupComplete(false);
            setIsSetupInProgress(false);
            setPreviewUrl("");
            setCurrentStep(0);
            setLoadingState({
                transforming: false,
                mounting: false,
                installing: false,
                starting: false,
                ready: false,
            });
        }
    }, [forceResetup]);

    useEffect(() => {
      let isDisposed = false;

      async function setupContainer() {
        if (!instance || isSetupInProgress || isSetupComplete) return;

        try {
                setIsSetupInProgress(true);
                setSetupError(null);
          setLoadingState((prev) => ({ ...prev, transforming: true }));
          setCurrentStep(1);

          const files = transformToWebContainerFormat(templateData);

          setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }));
          setCurrentStep(2);
          await instance.mount(files);

          setLoadingState((prev) => ({ ...prev, mounting: false, installing: true }));
          setCurrentStep(3);
          const installProcess = await instance.spawn("npm", ["install"]);
          await installProcess.output.pipeTo(
            new WritableStream({
            write() {
              // Terminal output wiring can be added here.
            },
            })
          );
          const installExitCode = await installProcess.exit;
          if (installExitCode !== 0) {
            throw new Error(`npm install failed with exit code ${installExitCode}`);
          }

          const packageJsonContent = await instance.fs.readFile("/package.json", "utf8");
          const packageJson = JSON.parse(packageJsonContent);
          const hasDevScript = Boolean(packageJson?.scripts?.dev);
          const hasStartScript = Boolean(packageJson?.scripts?.start);

          if (!hasDevScript && !hasStartScript) {
            throw new Error("No start script found. Add either 'dev' or 'start' in package.json scripts.");
          }

          setLoadingState((prev) => ({ ...prev, installing: false, starting: true }));
          setCurrentStep(4);

          instance.on("server-ready", (port: number, url: string) => {
            if (isDisposed) return;
            console.log(`Server is ready on port ${port} at URL: ${url}`);
                        setPreviewUrl(url);
              setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
                        setIsSetupComplete(true);
                        setIsSetupInProgress(false);
                });

          const startProcess = await instance.spawn("npm", ["run", hasDevScript ? "dev" : "start"]);
          void startProcess.output.pipeTo(
            new WritableStream({
            write() {
              // Terminal output wiring can be added here.
            },
            })
          );
          void startProcess.exit.then((code) => {
            if (code !== 0 && !isDisposed) {
              setSetupError(`Server process exited with code ${code}`);
              setIsSetupInProgress(false);
            }
          });

            }
        catch (err) {
          if (isDisposed) return;
                setSetupError((err as Error).message);
                setIsSetupInProgress(false);
                setLoadingState({
                    transforming: false,
                    mounting: false,
                    installing: false,
                    starting: false,
                    ready: false,
                });
                }
              }

        setupContainer();
              return () => {
                isDisposed = true;
              };
            }, [instance, templateData, isSetupComplete, isSetupInProgress]);

            useEffect(() => {
              return () => {
                // Cleanup can be added if we later subscribe to external resources.
              };
            }, []);

            if (isLoading) {
              return <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/>
                <h3 className="text-lg font-medium">Initialising WebContainer</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Setting up the environment...</p>
            </div>
              </div>;
    }

    if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

    const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;
    
    return (
      <span className={`text-sm font-medium ${
        isComplete ? 'text-green-600' : 
        isActive ? 'text-blue-600' : 
        'text-gray-500'
      }`}>
        {label}
      </span>
    );
  };

    return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
           

            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
            <h1>Terminal</h1>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Preview */}
          <div className="flex-1">
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
            />
          </div>
          
          {/* Terminal at bottom when preview is ready */}
          <div className="h-64 border-t">
            <h1>Terminal Component</h1>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebContainerPreview;