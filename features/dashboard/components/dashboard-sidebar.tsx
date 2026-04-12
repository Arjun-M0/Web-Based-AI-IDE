"use client";
import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuItem ,SidebarMenuButton, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarFooter, SidebarRail  } from '@/components/ui/sidebar';
import { Code2, Compass, Database, FlameIcon, Layout, Lightbulb, LucideIcon, Terminal, Zap } from 'lucide-react';
import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { History } from 'lucide-react';
import TemplateSelectionModel from './template-selection-model';
import { createPlayground } from '../actions';
import { toast } from 'sonner';
interface PlaygroundDataProps{
    id:string;
    name:string;
    icon:string;
    starred:boolean;
}

const lucidIconMap:Record<string,LucideIcon>={
    Zap:Zap,
    Lightbulb:Lightbulb,
    Database:Database,
    Compass:Compass,
    FlameIcon:FlameIcon,
    Terminal:Terminal,
    Code2:Code2
}

const DashboardSidebar = ({initialPlaygroundData}: {initialPlaygroundData: PlaygroundDataProps[]}) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentPlaygrounds] = useState(initialPlaygroundData.slice(0,5)); 

    const handleCreatePlayground = async (data: {
      title: string;
      template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
      description?: string;
    }) => {
      try {
        const res = await createPlayground(data);
        if (!res?.id) {
          toast.error("Unable to create playground. Please try again.");
          return;
        }

        toast.success("Playground created successfully!");
        setIsModalOpen(false);
        router.push(`/playground/${res.id}`);
      } catch {
        toast.error("Unable to create playground. Please try again.");
      }
    };

    return (
    <Sidebar variant='inset'collapsible='icon' className='border-1 border-r'>
        <SidebarHeader>
            <div className='flex items-center gap-2 px-4 py-3 justify-center'>
                <Image src={"/logo.svg"} alt='Logo' width={60} height={60}/>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip={"Dashboard"}>
                            <Link href={"/dashboard"}>
                            <Layout className='size-4'/>
                            <span>Dashboard</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
          <SidebarGroupLabel>
            <History className="h-4 w-4 mr-2" />
            Recent
          </SidebarGroupLabel>
          <SidebarGroupAction title="Create new playground" onClick={() => setIsModalOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentPlaygrounds.length === 0 ? null : (
                recentPlaygrounds.map((playground) => {
                  const IconComponent = lucidIconMap[playground.icon] || Code2;
                  return (
                    <SidebarMenuItem key={playground.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/playground/${playground.id}`}
                        tooltip={playground.name}
                      >
                        <Link href={`/playground/${playground.id}`}>
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span>{playground.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View all">
                  <Link href="/playgrounds">
                    <span className="text-sm text-muted-foreground">View all playgrounds</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      <SidebarRail />
      <TemplateSelectionModel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePlayground}
      />
    </Sidebar>

  )
}

export default DashboardSidebar
