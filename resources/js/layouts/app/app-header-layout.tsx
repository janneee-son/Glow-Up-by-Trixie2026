import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({ children }: AppLayoutProps) {
    return (
        <AppContent
    variant="header"
    className="min-h-screen w-full max-w-none flex-1 flex-col bg-[#FAF7F4]"
>
    {children}
</AppContent>   
        
    );
}
