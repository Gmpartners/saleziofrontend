import * as React from "react"

import { cn } from "@/lib/utils"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "h-full w-full border-r border-[#1f2937]/40 bg-[#070b11] p-4 pt-8 shadow-lg",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Sidebar.displayName = "Sidebar"

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode
  description?: React.ReactNode
}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, title, description, ...props }, ref) => {
    return (
      <div
        className={cn(
          "mb-6 flex flex-col border-b border-[#1f2937]/40 pb-6",
          className
        )}
        ref={ref}
        {...props}
      >
        {title && (
          <div className="text-lg font-semibold text-white">{title}</div>
        )}
        {description && (
          <div className="text-sm text-slate-400">{description}</div>
        )}
      </div>
    )
  }
)
SidebarHeader.displayName = "SidebarHeader"

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn("flex-1 overflow-auto", className)}
        ref={ref}
        {...props}
      />
    )
  }
)
SidebarContent.displayName = "SidebarContent"

interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode
}

const SidebarSection = React.forwardRef<HTMLDivElement, SidebarSectionProps>(
  ({ className, title, ...props }, ref) => {
    return (
      <div className={cn("mb-4", className)} ref={ref} {...props}>
        {title && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </div>
        )}
        <div className="space-y-1">{props.children}</div>
      </div>
    )
  }
)
SidebarSection.displayName = "SidebarSection"

interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  icon?: React.ReactNode
  label?: React.ReactNode
  suffix?: React.ReactNode
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ className, active, icon, label, suffix, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-[#10b981]/10 text-[#10b981]"
            : "text-slate-400 hover:bg-[#101820] hover:text-white",
          className
        )}
        ref={ref}
        {...props}
      >
        {icon && <div className="mr-2 text-lg">{icon}</div>}
        <div className="flex-1">{label}</div>
        {suffix && <div>{suffix}</div>}
      </div>
    )
  }
)
SidebarItem.displayName = "SidebarItem"

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "mt-auto flex items-center border-t border-[#1f2937]/40 pt-4",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
SidebarFooter.displayName = "SidebarFooter"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarSection,
  SidebarItem,
  SidebarFooter,
}
