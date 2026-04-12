import React from "react";
import AddNewButton from "@/features/dashboard/components/add-new-button";
import EmptyState from "@/components/ui/empty-state";
import { deleteProjectById, duplicateProjectById, editProjectById, getAllPlaygroundsForUser } from "@/features/dashboard/actions";
import ProjectTable from "@/features/dashboard/components/project-table";

const Page = async()=>{
    const playgrounds = await getAllPlaygroundsForUser();
    return(
        <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
            <div className="mt-10 flex flex-col justify-center items-center w-full">
                <AddNewButton/>
            </div>
            <div className="mt-10 flex flex-col justify-center items-center w-full">
                {
                    playgrounds && playgrounds.length===0 ? (<EmptyState title="No Playgrounds" description="You don't have any playgrounds yet. Create one to get started." imageSrc="/empty-state.svg" />):(
                        <ProjectTable
                            projects = {playgrounds || []}
                            onDeleteProject = {deleteProjectById}
                            onUpdateProject = {editProjectById} 
                            onDuplicateProject = {duplicateProjectById}
                        />
                    )
                }
            </div>
        </div>
    )
}

export default Page;

