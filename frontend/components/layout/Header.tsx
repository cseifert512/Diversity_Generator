'use client';

import Link from 'next/link';
import { HelpCircle, Pencil } from 'lucide-react';
import { DevModeToggle } from '@/components/dev/DevModeToggle';

export function Header() {
  return (
    <header className="bg-drafted-cream border-b border-drafted-border sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left section: Logo and Dev Mode Toggle */}
          <div className="flex items-center gap-4">
            {/* Logo - matching Drafted style with serif font */}
            <Link href="/" className="flex items-center gap-0.5">
              <span className="font-serif text-xl font-bold text-drafted-black tracking-tight">
                Drafted
              </span>
              <span className="text-coral-500 text-xl font-serif font-bold">.</span>
            </Link>
            
            {/* Dev Mode Toggle */}
            <DevModeToggle />
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-4 py-2 text-sm font-medium text-drafted-black bg-drafted-bg rounded-full">
              Diversity Analyzer
            </button>
            <Link 
              href="/editor"
              className="px-4 py-2 text-sm font-medium text-drafted-gray hover:text-drafted-black transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editor
            </Link>
            <Link 
              href="/how-it-works"
              className="px-4 py-2 text-sm font-medium text-drafted-gray hover:text-drafted-black transition-colors"
            >
              How It Works
            </Link>
            <a 
              href="https://drafted.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-drafted-gray hover:text-drafted-black transition-colors"
            >
              Back to App
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Help button */}
            <Link
              href="/how-it-works"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-drafted-bg hover:bg-drafted-border transition-colors"
              title="How It Works"
            >
              <HelpCircle className="w-5 h-5 text-drafted-gray" />
            </Link>
            
            <a
              href="https://drafted.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-drafted-primary font-serif font-bold"
            >
              Start Drafting
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
