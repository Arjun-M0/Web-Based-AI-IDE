"use server";

import { currentUser } from "@/features/auth/actions";
import {db} from "@/lib/db";
import { TemplateFolder } from "../lib/path-to-json";

export const getPlaygroundById = async (id:string) => {
    try{
        const playground = await db.playground.findUnique({
            where: { id },
            select : {
                title:true,
                description:true,
                templateFiles:{
                    select:{
                        content:true
                    }
                }
            }
        });
        return playground;
    }
    catch(error){
        console.error("Error fetching playground data:", error);
    }
}

export const saveUpdatedCode = async (playgroundId:string , data:TemplateFolder)=>{
    const user = await currentUser();
    if(!user) return null;
    try{
        await db.templateFile.upsert({
            where: {
                playgroundId
            },
            update:{
                content: JSON.stringify(data)
            },
            create:{
                playgroundId,
                content: JSON.stringify(data)
            }
        })
    }
    catch(error){
        console.error("Error saving updated code:", error);
    }
}