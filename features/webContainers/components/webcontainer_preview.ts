"use client";
import React , {useEffect , useRef , useState} from "react";
import { TemplateFolder } from "@/features/playground/lib/path-to-json";
import { WebContainer } from "@webcontainer/api";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle , Loader2 , XCircle} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { error } from "console";

interface WebContainerPreviewProps{
    templateData: TemplateFolder;
    serverUrl:string;
    isLoading:boolean;
    error:string | null;
    instance:WebContainer | null;
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
    const [loadingState, setLoadingState] = useState({
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

    useEffect(()=>{
        if(forceResetup){
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
    },[forceResetup]);

    useEffect(()=>{
        async function setupContainer(){
            if(!instance || isSetupInProgress || isSetupComplete) return;

            try{
                setIsSetupInProgress(true);
                setSetupError(null);

                try{
                    const packageJsonExists = await instance.fs.readFile("/package.json","utf8")

                    if(packageJsonExists){
                        //implement Terminal related stuff here
                    }

                    instance.on("server-ready", (port: number, url: string) => {
                        console.log(`Server is ready on port ${port} at URL: ${url}`);
                        //terminal

                        setPreviewUrl(url);
                        setLoadingState(prev => ({...prev,starting:false, ready: true}));
                        setIsSetupComplete(true);
                        setIsSetupInProgress(false);
                    });
                    setCurrentStep(4);
                    setLoadingState(prev => ({...prev,starting:true}));
                    return;
                }
                catch(err){
                    console.error("Error during transformation:", err);
                    throw new Error("Failed to transform template data");
                }
            }
            catch(err){
                setSetupError((err as Error).message);
                setIsSetupInProgress(false);
        }
    },[])

    return (
        <div>WebContainerPreview</div>
    )
}

export default WebContainerPreview;