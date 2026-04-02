import { useState , useEffect , useCallback } from "react";
import {WebContainer} from "@webcontainer/api";
import {TemplateFolder} from "@/features/playground/lib/path-to-json";

interface UseWebContainerProps{
    templateData: TemplateFolder;
}

interface UseWebContainerReturn{
    serverUrl: string | null;
    isLoading: boolean;
    error: string | null;
    instance: WebContainer | null;
    writeFileSync: (path: string, content: string) => Promise<void>;
    destroy: () => void;
}

export const useWebContainer = ({templateData}: UseWebContainerProps): UseWebContainerReturn => {
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<WebContainer | null>(null);

    useEffect(()=>{
        let mounted = true;
        let bootedInstance: WebContainer | null = null;
        async function initializeWebContainer(){
            try{
                const webContainerInstance = await WebContainer.boot();
                if(!mounted) return;
                bootedInstance = webContainerInstance;
                setInstance(webContainerInstance);
                setIsLoading(false);
            }
            catch(err){
                setError((err as Error).message);
                setIsLoading(false);
            }
        }

        initializeWebContainer();

        return ()=>{
            mounted = false;
            if(bootedInstance){
                bootedInstance.teardown();
            }
        }
    },[]);

    const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
        if(!instance){
            throw new Error("WebContainer instance is not initialized");
        }

        try{
            const pathParts = path.split("/");
            const folderPath = pathParts.slice(0, -1).join("/");

            if(folderPath){
                await instance.fs.mkdir(folderPath, {recursive: true});
            }
            await instance.fs.writeFile(path, content);
        }
        catch(err){
            throw new Error(`Failed to write file: ${(err as Error).message}`);
        }
    },[instance]);

    const destroy = useCallback(()=>{
        if(instance){
            instance.teardown();
            setInstance(null);
            setServerUrl(null);
        }
    },[instance]);

    return {
        destroy,
        error,
        instance,
        isLoading,
        serverUrl,
        writeFileSync
    }
}