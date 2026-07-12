import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Share2, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle,
  Activity,
  Globe,
  Lock,
  ChevronRight,
  Plus
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Home() {
  const [activeTab, setActiveTab] = useState('editor');

  const features = [
    {
      icon: <Users className="w-6 h-6 text-indigo-400" />,
      title: "Real-Time Collaboration",
      description: "Work together with your team synchronously. See active cursors, edits, and comments instantly."
    },
    {
      icon: <FileText className="w-6 h-6 text-emerald-400" />,
      title: "Rich Text Editor",
      description: "Format documents elegantly with clean typography, tables, embedded media, and code blocks."
    },
    {
      icon: <Share2 className="w-6 h-6 text-pink-400" />,
      title: "Instant Sharing",
      description: "Share workspace links with permission controls. Export your work as PDF, Markdown, or HTML."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-amber-400" />,
      title: "In-line Comments & Chat",
      description: "Discuss edits inline or use the integrated sidebar chat to keep team conversations contextual."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar Component */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            <span>Introducing CollabSpace 1.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-none mb-6">
            Where Teams Create and <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Collaborate</span> Beautifully
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A real-time workspace for teams to author docs, track notes, and coordinate projects together—powered by the MERN stack.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
              Try the Workspace <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all flex items-center justify-center gap-2">
              Learn More <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Live Workspace Mockup */}
        <section id="workspace" className="max-w-6xl mx-auto px-6 pb-24">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
            {/* Header of window */}
            <div className="h-12 border-b border-slate-800/80 bg-slate-950/80 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800/50 text-[11px] text-slate-400 w-64 justify-center">
                <Lock className="w-3 h-3 mr-1 text-slate-500" /> collabspace.app/workspace/design-system
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5 mr-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-[10px] font-bold flex items-center justify-center border border-slate-950">JD</div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-[10px] font-bold flex items-center justify-center border border-slate-950">SK</div>
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center border border-slate-950">AL</div>
                </div>
                <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
            </div>

            {/* Editor Workspace Mock Layout */}
            <div className="flex h-[450px]">
              {/* Sidebar */}
              <div className="w-60 border-r border-slate-800/80 bg-slate-950/40 p-4 hidden md:flex flex-col gap-6">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Documents</h4>
                  <div className="flex flex-col gap-1.5">
                    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs text-left font-medium">
                      <FileText className="w-3.5 h-3.5" /> Product Architecture
                    </button>
                    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs text-left transition-colors">
                      <FileText className="w-3.5 h-3.5" /> Brand Guidelines
                    </button>
                    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs text-left transition-colors">
                      <FileText className="w-3.5 h-3.5" /> Launch Roadmap
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Members</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> John Doe (Editor)
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sarah K. (Designer)
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Alex L. (Away)
                    </div>
                  </div>
                </div>
                <div className="mt-auto">
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Create New Doc
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 bg-slate-900/20 p-6 md:p-8 overflow-y-auto flex flex-col">
                <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                  {/* Rich Editor Title */}
                  <h2 className="text-3xl font-extrabold text-white mb-2 focus:outline-none" contentEditable defaultValue="Product Architecture">
                    Product Architecture
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 border-b border-slate-800 pb-4 mb-6">
                    <span>Last edited 2 minutes ago by Sarah K.</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Globe className="w-3 h-3" /> Live Synced
                    </span>
                  </div>

                  {/* Editor body mock */}
                  <div className="text-sm leading-relaxed text-slate-300 space-y-4 flex-1">
                    <p>
                      Welcome to the **CollabSpace** planning document. This system serves as our single source of truth for the core architecture design. Our main goal is to support real-time sync with high performance.
                    </p>
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs flex items-start gap-2.5 my-4">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Key Decision:</strong> We are using Express with MongoDB because of Mongoose schemas' flexibility, and Vite for standard modular components.
                      </div>
                    </div>
                    <p>
                      We recommend dividing the layout into structured sections to manage clean code blocks and state:
                    </p>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 overflow-x-auto">
{`// server/config/db.js
import mongoose from 'mongoose';
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
};`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Crafted for Modern Development</h2>
            <p className="text-slate-400">Everything you need to kickstart collaborative content editing platforms.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 transition-all flex gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-400">CollabSpace</span>
          </div>
          <div>
            © {new Date().getFullYear()} CollabSpace. Powered by React, Vite, and Express.
          </div>
        </div>
      </footer>

    </div>
  );
}
