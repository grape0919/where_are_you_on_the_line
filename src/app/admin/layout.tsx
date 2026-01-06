"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Settings,
  Menu,
  X,
  Contact,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const sidebarItems = [
  {
    title: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "진료항목 관리",
    href: "/admin/services",
    icon: Stethoscope,
  },
  {
    title: "의료진 관리",
    href: "/admin/doctors",
    icon: Contact,
  },
  {
    title: "환자 관리",
    href: "/admin/patients",
    icon: Users,
  },
  {
    title: "예약 관리",
    href: "/admin/reservations",
    icon: Calendar,
  },
  {
    title: "정원 설정",
    href: "/admin/reservations/capacity",
    icon: SlidersHorizontal,
  },
  {
    title: "설정",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } finally {
      router.replace("/admin/login");
    }
  };

  return (
    <div className="bg-background flex h-screen">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-50 w-64 transform border-r transition-transform duration-200 ease-in-out lg:static lg:inset-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="border-sidebar-border flex h-16 items-center justify-between border-b px-6">
            <Link href="/admin" className="flex items-center space-x-2">
              <Stethoscope className="text-sidebar-primary h-6 w-6" />
              <span className="text-sidebar-foreground text-lg font-semibold">AllRight Queue</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-sidebar-border border-t p-4">
            <div className="text-sidebar-foreground/60 text-xs">관리자 패널 v1.0</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background flex h-16 items-center justify-between border-b px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">관리자 대시보드</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle inline />
            <Link href="/">
              <Button variant="outline" size="sm">
                메인으로
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
