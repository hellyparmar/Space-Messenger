import React from 'react';

export const STICKERS: Record<string, React.ReactNode> = {
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  planet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  flower: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22v-7"/><path d="M12 15a4 4 0 0 0-4-4H5a4 4 0 0 0 4 4v3"/><path d="M12 15a4 4 0 0 1 4-4h3a4 4 0 0 1-4 4v3"/><circle cx="12" cy="7" r="3"/><path d="M12 4V2"/><path d="M15 7h2"/><path d="M9 7H7"/><path d="M14 9.5l1.5 1.5"/><path d="M10 9.5L8.5 11"/></svg>,
  bouquet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-2-5-2-8a4 4 0 0 1 8 0c0 3-2 8-2 8"/><path d="M12 14c-3 0-6-2-6-5a4 4 0 1 1 8 0"/><path d="M8 9a4 4 0 1 1 8 0"/><path d="M16 9a4 4 0 1 1-8 0"/></svg>,
  waxSeal: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v4h4v2h-4v4h-2v-4H7v-2h4V7z"/></svg>,
  postmark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" strokeDasharray="4 4"/><circle cx="12" cy="12" r="7"/><path d="M12 5v2m0 10v2M5 12h2m10 0h2m-2.5-4.5l-1.5 1.5m-6 6l-1.5 1.5M7.5 7.5l1.5 1.5m6 6l1.5 1.5"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
  music: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
};

export const PAPER_STYLES: Record<string, React.CSSProperties> = {
  parchment: { 
    background: '#f4ecd8', 
    color: '#3e3427', 
    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0) 90%, rgba(200,160,80,0.15) 100%), repeating-linear-gradient(transparent, transparent 31px, rgba(139,111,78,0.15) 31px, rgba(139,111,78,0.15) 32px), radial-gradient(circle at 50% 50%, #fcf8ee 0%, #f4ecd8 100%)',
    boxShadow: 'inset 0 0 40px rgba(139,111,78,0.2)'
  },
  blueprint: { 
    background: '#0a1930', 
    color: '#4A9EFF', 
    backgroundImage: 'linear-gradient(rgba(74,158,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(74,158,255,0.15) 1px, transparent 1px), radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)', 
    backgroundSize: '20px 20px, 20px 20px, 100% 100%',
    textShadow: '0 0 2px rgba(74,158,255,0.4)',
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)'
  },
  grid: { 
    background: '#050510', 
    color: '#c8a050', 
    backgroundImage: 'linear-gradient(rgba(200,160,80,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(200,160,80,0.15) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 40%, rgba(200,160,80,0.05) 100%)', 
    backgroundSize: '24px 24px, 24px 24px, 100% 100%',
    textShadow: '0 0 8px rgba(200,160,80,0.5)',
    boxShadow: 'inset 0 0 20px rgba(200,160,80,0.1)'
  },
  starry: { 
    background: '#020205', 
    color: '#e0e7ff', 
    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(200,160,80,0.15) 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(74,158,255,0.2) 2px, transparent 2px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 1.5px, transparent 1.5px), radial-gradient(circle at 50% 50%, rgba(74,158,255,0.05) 0%, transparent 100%)', 
    backgroundSize: '40px 40px, 60px 60px, 30px 30px, 100% 100%', 
    textShadow: '0 0 4px rgba(255,255,255,0.4)',
    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
  },
  obsidian: { 
    background: '#09090b',
    color: '#b8a6ff',
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(184, 166, 255, 0.03) 0px, rgba(184, 166, 255, 0.03) 2px, transparent 2px, transparent 12px)',
    textShadow: '0 0 8px rgba(184,166,255,0.3)',
    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.9)'
  }
};
