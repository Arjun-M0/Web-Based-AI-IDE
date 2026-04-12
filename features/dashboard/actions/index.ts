"use server"
import {currentUser} from "@/features/auth/actions";
import {db} from "@/lib/db";
import {Templates} from "@/lib/generated/prisma/enums";
import { pl } from "date-fns/locale";
import { revalidatePath } from "next/cache";

export const createPlayground = async (data:{
    title: string;
    template: Templates;
    description?: string;
}) => {
    const  {template , title , description} = data;
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    try{
        const playground = await db.playground.create({
            data:{
                title,
                description: description || "",
                template,
                userId: user.id
            }
        })
        return playground;
    }
    catch(error){
        console.error(error);
        return null;
    }
}

export const getAllPlaygroundsForUser = async () => {
    const user = await currentUser();
    try{
        const playground = await db.playground.findMany({
            where:{
                userId: user?.id
            },
            include:{
                user:true,
                Starmark:{
                    where:{
                        userId: user?.id
                    },
                    select:{
                        isMarked: true
                    }
                }
            }
        });
        return playground;
    }
    catch(error){
        console.error(error);
        return null;
    }
}

export const deleteProjectById = async (id: string) => {
    try{
        await db.playground.delete({
            where:{
                id
            }
        })
        revalidatePath("/dashboard");
    }
    catch(error){
        console.error(error);
    }
}

export const editProjectById = async (id: string, data: {
    title: string;
    description: string;})=>{
        try{
            await db.playground.update({
                where:{
                    id
                },
                data:data
            })
            revalidatePath("/dashboard");
        }catch(error){
            console.error(error);
        }
}

export const duplicateProjectById = async (id: string) => {
    try{
        const otiginalPlayground = await db.playground.findUnique({
            where:{
                id},
    })

    if(!otiginalPlayground) throw new Error("Original playground not found");

    const duplicatedPlayground = await db.playground.create({
        data:{
            title: otiginalPlayground.title + " Copy",
            description: otiginalPlayground.description,
            template: otiginalPlayground.template,
            userId: otiginalPlayground.userId
        }
    })
    revalidatePath("/dashboard");
    return duplicatedPlayground;
    }catch(error){
        console.error(error);
    }
}

