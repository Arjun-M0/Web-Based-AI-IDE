"use client";
import React from 'react'
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import { cn } from "@/lib/utils";
import TemplateSelectionModel from './template-selection-model';
import { createPlayground } from '../actions';
import { toast } from 'sonner';

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{
    title: string;
    template : "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  } | null>(null);

  const router = useRouter();

  const handleSubmit = async(data:{
    title: string;
    template : "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  })=>{
    setSelectedTemplate(data);
    const res = await createPlayground(data);
    toast.success("Playground created successfully!");
     setIsModalOpen(false);
     router.push(`/playground/${res?.id}`);
  }
  return (
    <>
    <div
      onClick ={() => setIsModalOpen(true)}
        className={cn(
          "group w-full max-w-md px-8 py-7 flex flex-row justify-between items-center border rounded-xl bg-muted cursor-pointer",
          "transition-all duration-300 ease-in-out",
          "hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02]",
          "shadow-[0_2px_10px_rgba(0,0,0,0.08)]",
          "hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
        )}
      >
      <div className="flex flex-row justify-center gap-5 items-center">
         <Button
            variant={"outline"}
            className="flex h-14 w-14 justify-center items-center bg-white group-hover:bg-[#fff8f8] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
            size={"icon"}
          >
            <Plus size={30} className="transition-transform duration-300 group-hover:rotate-90" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">Add New</h1>
            <p className="text-sm text-muted-foreground max-w-[260px]">Create a new playground</p>
          </div>
      </div>
    </div>
    <TemplateSelectionModel
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSubmit={handleSubmit}
      />
    </>
  )
}

export default AddNewButton
