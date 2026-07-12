import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import { useEditor, EditorContent, Mark, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { io } from 'socket.io-client';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import { 
  FileText, 
  Users, 
  Share2, 
  Plus, 
  LogOut,
  Lock,
  Globe,
  CheckCircle,
  Folder,
  LayoutDashboard,
  Trash2,
  Edit2,
  X,
  FilePlus,
  Loader2,
  ArrowLeft,
  Clock,
  Search,
  CloudLightning,
  AlertCircle,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Terminal,
  Minus,
  Undo,
  Redo,
  ChevronDown,
  UserPlus,
  MessageSquare,
  CornerDownRight,
  Check,
  RotateCcw,
  Activity,
  Paperclip,
  Sun,
  Moon,
  Menu,
  Sparkles
} from 'lucide-react';

// Collaborative Caret Colors
const userColors = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Violet
];

// Consistency helper to map sockets to colors
const getCollaboratorColor = (socketId) => {
  if (!socketId) return '#6366f1';
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % userColors.length;
  return userColors[index];
};

// ProseMirror / Tiptap Extension to render live collaborator carets & selections
const CollaborativeCursors = Extension.create({
  name: 'collaborativeCursors',

  addOptions() {
    return {
      cursors: {}, // socketId -> { range: { from, to }, user: { name, color } }
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: new PluginKey('collaborative-cursors'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, value, oldState, newState) {
            const cursors = extension.options.cursors || {};
            const doc = newState.doc;
            const decorations = [];

            Object.entries(cursors).forEach(([socketId, cursorData]) => {
              const { range, user } = cursorData;
              if (!range) return;

              const { from, to } = range;
              const size = doc.content.size;
              const safeFrom = Math.min(Math.max(0, from), size);
              const safeTo = Math.min(Math.max(0, to), size);
              const cursorColor = user?.color || '#6366f1';

              // 1. Text Selection Range Highlight
              if (safeFrom !== safeTo) {
                decorations.push(
                  Decoration.inline(Math.min(safeFrom, safeTo), Math.max(safeFrom, safeTo), {
                    style: `background-color: ${cursorColor}20; border-bottom: 2px solid ${cursorColor}40;`,
                    class: 'remote-selection',
                  })
                );
              }

              // 2. Caret line and temporary floating username label
              const caretPos = safeTo;
              decorations.push(
                Decoration.widget(caretPos, () => {
                  const containerEl = document.createElement('span');
                  containerEl.className = 'remote-cursor-container relative inline-block w-0 h-0';
                  
                  // Caret line element
                  const caretLine = document.createElement('span');
                  caretLine.className = 'absolute top-0 bottom-0 left-0 w-[2px] h-[1.2em] -translate-y-[0.05em] pointer-events-none';
                  caretLine.style.backgroundColor = cursorColor;
                  containerEl.appendChild(caretLine);

                  // Floating label element
                  const labelBadge = document.createElement('span');
                  labelBadge.className = 'absolute bottom-full left-0 px-1 py-0.5 rounded text-[8px] font-bold text-white whitespace-nowrap pointer-events-none select-none -translate-y-0.5 transition-opacity duration-350 ease-out z-50';
                  labelBadge.style.backgroundColor = cursorColor;
                  labelBadge.innerText = user?.name || 'Anonymous';
                  
                  // Pop badge open and fade it out after 3 seconds
                  labelBadge.style.opacity = '1';
                  setTimeout(() => {
                    labelBadge.style.opacity = '0';
                  }, 3000);

                  caretLine.appendChild(labelBadge);
                  return containerEl;
                }, {
                  side: 10,
                })
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

// Custom Tiptap Comment Mark
const CommentMark = Mark.create({
  name: 'commentMark',

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return {
            'data-comment-id': attributes.commentId,
            class: 'inline-comment-highlight',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

// Formatting Menu Bar for TipTap Editor
const MenuBar = ({ editor, onAttach, isUploading }) => {
  if (!editor) {
    return null;
  }

  const btnClass = (isActive, disabled = false) => `p-2 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
    disabled 
      ? 'opacity-40 cursor-not-allowed border-transparent text-slate-655' 
      : isActive 
        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' 
        : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
  }`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-950 border border-slate-800/80 rounded-xl mb-4 select-none">
      
      {/* Inline styles */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnClass(editor.isActive('code'))}
        title="Code (inline)"
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-slate-800 mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
      >
        <span className="text-[10px] font-extrabold">H1</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        <span className="text-[10px] font-bold">H2</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
      >
        <span className="text-[10px] font-semibold">H3</span>
      </button>

      <div className="h-6 w-px bg-slate-800 mx-1" />

      {/* Lists & blocks */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
        title="Code Block"
      >
        <Terminal className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
        title="Horizontal Rule"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-slate-800 mx-1" />

      {/* History */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={btnClass(false, !editor.can().undo())}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={btnClass(false, !editor.can().redo())}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-slate-800 mx-1" />

      {/* Attach Media */}
      <button
        type="button"
        onClick={onAttach}
        disabled={isUploading}
        className={btnClass(false)}
        title="Attach Image or PDF file"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </button>

    </div>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Refs to prevent state closure staleness in Tiptap callbacks
  const latestTitleRef = useRef('');
  const latestContentRef = useRef('');
  const isSettingContentRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  
  // Socket Connection Ref
  const socketRef = useRef(null);

  // Dashboard & Documents states
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Creation modal states
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCreatingSubmit, setIsCreatingSubmit] = useState(false);

  // Sharing Modal states
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('editor'); // 'editor', 'viewer'
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  // Right Side Panel Tab selections ('comments' vs 'activity')
  const [rightTab, setRightTab] = useState('comments');
  const rightTabRef = useRef('comments');
  useEffect(() => {
    rightTabRef.current = rightTab;
  }, [rightTab]);

  // Comments & Replies states
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [replyTexts, setReplyTexts] = useState({}); // commentId -> reply text

  // Activity Log states
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Editor states
  const [activeDoc, setActiveDoc] = useState(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  // Collaborator states
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  
  // Calculate active user's role on the active document
  const getMyRole = () => {
    if (!activeDoc || !user) return 'viewer';
    const docOwnerId = activeDoc.owner?._id || activeDoc.owner;
    if (docOwnerId && docOwnerId.toString() === user._id.toString()) {
      return 'owner';
    }
    const c = activeDoc.collaborators?.find((item) => {
      const cid = item.user?._id || item.user;
      return cid && cid.toString() === user._id.toString();
    });
    return c ? c.role : 'viewer';
  };

  const activeRole = getMyRole();

  // Track active role and save status in refs to avoid stale callback scopes
  const activeRoleRef = useRef('viewer');
  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  // Synchronize latest refs
  useEffect(() => {
    latestTitleRef.current = editorTitle;
  }, [editorTitle]);

  useEffect(() => {
    latestContentRef.current = editorContent;
  }, [editorContent]);

  // Track saveStatus in a ref to avoid beforeunload listener churn
  const saveStatusRef = useRef('saved');
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  // Media Upload States and Refs
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Responsive sidebar toggles
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Gemini AI States
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiAssistOutput, setAiAssistOutput] = useState('');
  const [isAssisting, setIsAssisting] = useState(false);
  const [aiAssistError, setAiAssistError] = useState('');

  // File upload response handler
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploadingMedia(true);
    try {
      const { data } = await API.uploadMedia(file);
      
      if (data.mimetype.startsWith('image/')) {
        editor.chain().focus().setImage({ src: data.url, alt: data.originalname }).run();
      } else if (data.mimetype === 'application/pdf') {
        const originalNameNoExtension = data.originalname.replace(/\.[^/.]+$/, "");
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${data.url}" target="_blank">📄 ${originalNameNoExtension} (PDF)</a> `
          )
          .run();
      }

      // Sync and AutoSave
      const updatedMarkdown = editor.getMarkdown();
      triggerAutoSave(latestTitleRef.current, updatedMarkdown);
      
      if (socketRef.current) {
        socketRef.current.emit('send-changes', {
          documentId: activeDoc?._id,
          title: latestTitleRef.current,
          content: updatedMarkdown,
        });
      }
    } catch (err) {
      console.error('Error uploading media:', err);
      alert(err.response?.data?.message || 'Failed to upload media file');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Summarize document handler
  const handleGenerateSummary = async () => {
    if (!activeDoc) return;
    setIsSummarizing(true);
    setAiSummaryError('');
    try {
      const { data } = await API.summarizeDocument(activeDoc._id);
      setAiSummary(data.summary);
    } catch (err) {
      console.error('Error generating summary:', err);
      setAiSummaryError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Selection text grabber helper
  const getSelectedText = () => {
    if (!editor) return '';
    const { state } = editor;
    const { from, to } = state.selection;
    return state.doc.textBetween(from, to, ' ');
  };

  // Writing assist handler
  const handleWritingAssist = async () => {
    if (!activeDoc || !aiInstruction.trim()) return;
    setIsAssisting(true);
    setAiAssistError('');
    setAiAssistOutput('');
    try {
      const selectedText = getSelectedText();
      const { data } = await API.aiAssist(activeDoc._id, {
        instruction: aiInstruction.trim(),
        selectedText,
      });
      setAiAssistOutput(data.refinedText);
    } catch (err) {
      console.error('Error getting writing assistance:', err);
      setAiAssistError(err.response?.data?.message || 'Failed to obtain writing assistance');
    } finally {
      setIsAssisting(false);
    }
  };

  // Insert refinement callback
  const handleInsertAssistResult = () => {
    if (!editor || !aiAssistOutput) return;

    let cleanText = aiAssistOutput;
    
    // Clean potential markdown container prefixes from mockup output fallback
    if (cleanText.includes('**Refined Text**:')) {
      const lines = cleanText.split('\n');
      const startIdx = lines.findIndex(l => l.includes('**Refined Text**:'));
      if (startIdx !== -1) {
        cleanText = lines.slice(startIdx + 1).join('\n').replace(/^"(.*)"$/, '$1'); // strip outer quotes
      }
    }
    
    // Strip trailing mockup markers
    cleanText = cleanText.replace(/\[Enhanced with a cohesive tone.*\]/g, '').trim();

    const { from, to } = editor.state.selection;
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, cleanText)
      .run();

    // Trigger save updates
    const updatedMarkdown = editor.getMarkdown();
    triggerAutoSave(latestTitleRef.current, updatedMarkdown);
    if (socketRef.current) {
      socketRef.current.emit('send-changes', {
        documentId: activeDoc?._id,
        title: latestTitleRef.current,
        content: updatedMarkdown,
      });
    }

    setAiAssistOutput('');
    setAiInstruction('');
  };

  // Page exit (tab close / reload) handler using keepalive fetch
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveStatusRef.current === 'saving' && activeDoc && activeRoleRef.current !== 'viewer') {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api';
        
        fetch(`${baseUrl}/documents/${activeDoc._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: latestTitleRef.current,
            content: latestContentRef.current
          }),
          keepalive: true
        }).catch(err => console.error('Exit save failed:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeDoc]);

  // React component unmount save handler (e.g. navigation switch)
  useEffect(() => {
    return () => {
      if (saveStatusRef.current === 'saving' && activeDoc && activeRoleRef.current !== 'viewer') {
        API.updateDocument(activeDoc._id, {
          title: latestTitleRef.current,
          content: latestContentRef.current
        }).catch(err => console.error('Unmount save failed:', err));
      }
    };
  }, [activeDoc]);

  // Instantiate Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      CollaborativeCursors.configure({
        cursors: {},
      }),
      CommentMark,
      Image,
      TiptapLink.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-indigo-400 hover:text-indigo-300 font-semibold underline inline-flex items-center gap-1 cursor-pointer',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isSettingContentRef.current) return;
      if (activeRoleRef.current === 'viewer') return; // Read-only mode prevents save emits

      const markdown = editor.getMarkdown();
      latestContentRef.current = markdown;
      setEditorContent(markdown);
      
      // Emit changes immediately via Socket.io
      if (socketRef.current) {
        socketRef.current.emit('send-changes', {
          documentId: activeDoc?._id,
          title: latestTitleRef.current,
          content: markdown,
        });
      }
      
      // Schedule debounced database auto-save
      triggerAutoSave(latestTitleRef.current, markdown);
    },
    onSelectionUpdate: ({ editor }) => {
      // 1. Regular selection socket emit (for cursor caret tracking)
      if (socketRef.current && activeDoc && activeRoleRef.current !== 'viewer') {
        const { from, to } = editor.state.selection;
        socketRef.current.emit('cursor-move', {
          documentId: activeDoc._id,
          range: { from, to },
        });
      }

      // 2. Active comment checking
      const { state } = editor;
      const { from } = state.selection;
      const node = state.doc.nodeAt(from);
      const mark = node?.marks?.find(m => m.type.name === 'commentMark');

      if (mark) {
        setActiveCommentId(mark.attrs.commentId);
      }
    },
  });

  // Toggle editor editable state dynamically when user role switches
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(activeRole !== 'viewer');
    }
  }, [activeRole, editor]);

  // Re-configure Tiptap remote cursor decorations when remoteCursors map updates
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setOptions({
        cursors: remoteCursors,
      });
      // Force ProseMirror transaction to apply decorations redraw
      editor.view.dispatch(editor.state.tr);
    }
  }, [remoteCursors, editor]);

  // Manage WebSockets lifecycle when activeDoc loads
  useEffect(() => {
    if (!activeDoc) {
      if (socketRef.current) {
        socketRef.current.emit('leave-document');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setActiveCollaborators([]);
      setRemoteCursors({});
      setActivityLogs([]);
      return;
    }

    // Connect to websocket server
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5001';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
      socket.emit('join-document', {
        documentId: activeDoc._id,
        user: {
          _id: user?._id || '',
          name: user?.name || 'Anonymous',
          email: user?.email || '',
          profilePicture: user?.profilePicture || '',
        },
      });
    });

    // Listen for incoming live modifications
    socket.on('receive-changes', ({ title, content }) => {
      isSettingContentRef.current = true;
      
      if (title !== undefined && title !== latestTitleRef.current) {
        setEditorTitle(title);
        latestTitleRef.current = title;
      }
      
      if (content !== undefined && content !== latestContentRef.current) {
        editor?.commands.setContent(content);
        setEditorContent(content);
        latestContentRef.current = content;
      }
      
      isSettingContentRef.current = false;

      // Reload activity log feed if active tab is activity log
      if (rightTabRef.current === 'activity') {
        fetchActivityLogs();
      }
    });

    // Listen for remote cursors movements
    socket.on('cursor-moved', ({ socketId, range, user: remoteUser }) => {
      const color = getCollaboratorColor(socketId);
      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: {
          range,
          user: { ...remoteUser, color },
        },
      }));
    });

    // Listen for collaborator exits
    socket.on('collaborator-left', (socketId) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    // Listen for comments reloads
    socket.on('receive-comment-update', () => {
      reloadActiveDocument();
      if (rightTabRef.current === 'activity') {
        fetchActivityLogs();
      }
    });

    // Listen for active collaborator presence changes
    socket.on('collaborators-changed', (collaborators) => {
      setActiveCollaborators(collaborators);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-document');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setRemoteCursors({});
      setActivityLogs([]);
    };
  }, [activeDoc, editor, user]);

  // Fetch chronological document activity logs from database
  const fetchActivityLogs = async () => {
    if (!activeDoc) return;
    setIsLogsLoading(true);
    try {
      const { data } = await API.getActivityLog(activeDoc._id);
      setActivityLogs(data);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Synchronize loading logs when switching right sidebar tab
  useEffect(() => {
    if (activeDoc && rightTab === 'activity') {
      fetchActivityLogs();
    }
  }, [activeDoc, rightTab]);

  // Dynamically load active document content into editor
  useEffect(() => {
    if (editor && activeDoc) {
      const currentMarkdown = editor.getMarkdown();
      if (currentMarkdown !== activeDoc.content) {
        isSettingContentRef.current = true;
        editor.commands.setContent(activeDoc.content || '');
        isSettingContentRef.current = false;
      }
    }
  }, [activeDoc, editor]);

  // Fetch documents on load or search query update
  const fetchDocuments = async (search = '') => {
    setIsLoading(true);
    try {
      const { data } = await API.getDocuments(search);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadActiveDocument = async () => {
    if (!activeDoc) return;
    try {
      const { data } = await API.getDocument(activeDoc._id);
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
    } catch (err) {
      console.error('Error reloading active doc:', err);
    }
  };

  // Debounced search query fetching
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only perform backend search calls if we are on the dashboard grid
      if (!activeDoc) {
        fetchDocuments(searchQuery);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeDoc]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Open a document in the editor workspace
  const openDocument = (doc) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setActiveDoc(doc);
    setEditorTitle(doc.title);
    setEditorContent(doc.content);
    latestTitleRef.current = doc.title;
    latestContentRef.current = doc.content;
    setRemoteCursors({});
    setActiveCommentId(null);
    setSaveStatus('saved');
    if (rightTab === 'activity') {
      fetchActivityLogs();
    }
  };

  // Close editor and go back to dashboard grid
  const closeEditor = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Save pending changes immediately on close
    if (saveStatus === 'saving' && activeRole !== 'viewer') {
      API.updateDocument(activeDoc._id, { title: editorTitle, content: latestContentRef.current })
        .then(() => {
          fetchDocuments();
        })
        .catch((err) => console.error(err));
    } else {
      fetchDocuments();
    }
    setRemoteCursors({});
    setActiveCommentId(null);
    setActivityLogs([]);
    setActiveDoc(null);
    setIsLeftSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  // Switch documents from editor sidebar
  const selectDocumentFromSidebar = async (doc) => {
    if (activeDoc && activeDoc._id === doc._id) return;

    // Force save active document first if saving
    if (saveStatus === 'saving' && activeRole !== 'viewer') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      try {
        await API.updateDocument(activeDoc._id, { title: editorTitle, content: latestContentRef.current });
        // Update item in local list before switching
        setDocuments(prev => 
          prev.map(d => d._id === activeDoc._id ? { ...d, title: editorTitle, content: latestContentRef.current } : d)
        );
      } catch (err) {
        console.error('Error saving before switch:', err);
      }
    }
    setIsLeftSidebarOpen(false);
    setIsRightSidebarOpen(false);
    openDocument(doc);
  };

  // Create document handler
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    setIsCreatingSubmit(true);
    try {
      const { data } = await API.createDocument(newDocTitle.trim(), '');
      setDocuments((prev) => [data, ...prev]);
      setNewDocTitle('');
      setIsCreating(false);
      openDocument(data);
    } catch (err) {
      console.error('Error creating document:', err);
    } finally {
      setIsCreatingSubmit(false);
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this document? Only owners can delete documents.')) {
      return;
    }

    try {
      await API.deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc._id !== docId));
      if (activeDoc && activeDoc._id === docId) {
        setActiveDoc(null);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.message || 'Not authorized to delete this document');
    }
  };

  // Rename document handler
  const handleRenameDocument = async (docId, currentTitle, e) => {
    e.stopPropagation();
    const newTitle = window.prompt('Rename document:', currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) {
      return;
    }

    try {
      const { data } = await API.updateDocument(docId, { title: newTitle.trim() });
      setDocuments((prev) => 
        prev.map((d) => (d._id === docId ? { ...d, title: newTitle.trim(), updatedAt: new Date().toISOString() } : d))
      );
      if (activeDoc && activeDoc._id === docId) {
        setEditorTitle(newTitle.trim());
        setActiveDoc(data); // Sync collaborators updates
        if (rightTabRef.current === 'activity') fetchActivityLogs();
      }
    } catch (err) {
      console.error('Error renaming document:', err);
      alert(err.response?.data?.message || 'Not authorized to rename this document');
    }
  };

  // Auto-save debounce logic
  const triggerAutoSave = (updatedTitle, updatedContent) => {
    if (activeRoleRef.current === 'viewer') return;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await API.updateDocument(activeDoc._id, { 
          title: updatedTitle, 
          content: updatedContent 
        });
        setSaveStatus('saved');
        // Update local list
        setDocuments(prev => 
          prev.map(d => d._id === activeDoc._id ? { ...d, title: updatedTitle, content: updatedContent, updatedAt: new Date().toISOString() } : d)
        );
        setActiveDoc(data);
        if (rightTabRef.current === 'activity') {
          fetchActivityLogs();
        }
      } catch (err) {
        console.error('Error auto-saving document:', err);
        setSaveStatus('error');
      }
    }, 1000);
  };

  const handleTitleInputChange = (updatedTitle) => {
    if (activeRole === 'viewer') return;
    setEditorTitle(updatedTitle);
    latestTitleRef.current = updatedTitle;
    
    // Emit title change immediately via Socket.io
    if (socketRef.current) {
      socketRef.current.emit('send-changes', {
        documentId: activeDoc?._id,
        title: updatedTitle,
        content: latestContentRef.current,
      });
    }

    triggerAutoSave(updatedTitle, latestContentRef.current);
  };

  // Document invitation submit
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setIsShareSubmitting(true);
    setShareError('');
    setShareSuccess('');
    try {
      const { data } = await API.shareDocument(activeDoc._id, shareEmail.trim(), shareRole);
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      setShareEmail('');
      setShareSuccess(`Successfully shared with ${shareEmail}`);
      setTimeout(() => setShareSuccess(''), 3000);
      if (rightTabRef.current === 'activity') fetchActivityLogs();
    } catch (err) {
      console.error('Error sharing document:', err);
      setShareError(err.response?.data?.message || 'Failed to share document');
    } finally {
      setIsShareSubmitting(false);
    }
  };

  // Document collaborator removal
  const handleRemoveCollaborator = async (collaboratorUserId) => {
    if (!window.confirm("Are you sure you want to revoke this user's access?")) {
      return;
    }

    try {
      const { data } = await API.removeCollaborator(activeDoc._id, collaboratorUserId);
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      if (rightTabRef.current === 'activity') fetchActivityLogs();
    } catch (err) {
      console.error('Error removing collaborator:', err);
      alert(err.response?.data?.message || 'Failed to remove collaborator');
    }
  };

  // Helper check for grid document card actions permission
  const canRenameCard = (doc) => {
    const docOwnerId = doc.owner?._id || doc.owner;
    if (docOwnerId?.toString() === user?._id?.toString()) return true;
    const collaborator = doc.collaborators?.find(c => {
      const cid = c.user?._id || c.user;
      return cid?.toString() === user?._id?.toString();
    });
    return collaborator?.role === 'editor';
  };

  const canDeleteCard = (doc) => {
    const docOwnerId = doc.owner?._id || doc.owner;
    return docOwnerId?.toString() === user?._id?.toString();
  };

  // Inline comment creation handler
  const handleAddInlineComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !editor) return;

    const commentId = 'comment_' + Math.random().toString(36).substring(2, 11);
    
    setIsCommentSubmitting(true);
    try {
      // 1. Wrap the current editor highlighted selection in a CommentMark
      editor.chain().focus().setMark('commentMark', { commentId }).run();
      const updatedContent = editor.getMarkdown();

      // 2. Add the comment object to database
      await API.addComment(activeDoc._id, commentId, newCommentText.trim());

      // 3. Immediately save the updated content with span marks
      const { data } = await API.updateDocument(activeDoc._id, {
        title: editorTitle,
        content: updatedContent,
      });

      // 4. Update local states
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      setNewCommentText('');
      setActiveCommentId(commentId);
      if (rightTabRef.current === 'activity') fetchActivityLogs();

      // 5. Broadcast to other room sockets
      if (socketRef.current) {
        socketRef.current.emit('send-changes', {
          documentId: activeDoc._id,
          title: editorTitle,
          content: updatedContent,
        });
        socketRef.current.emit('send-comment-update', { documentId: activeDoc._id });
      }
    } catch (err) {
      console.error('Error adding inline comment:', err);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Comment reply submission handler
  const handleAddReplySubmit = async (commentId, e) => {
    e.preventDefault();
    const replyText = replyTexts[commentId];
    if (!replyText || !replyText.trim()) return;

    try {
      const { data } = await API.addReply(activeDoc._id, commentId, replyText.trim());
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      setReplyTexts((prev) => ({ ...prev, [commentId]: '' }));
      if (rightTabRef.current === 'activity') fetchActivityLogs();

      if (socketRef.current) {
        socketRef.current.emit('send-comment-update', { documentId: activeDoc._id });
      }
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  // Comment resolution handler
  const handleResolveComment = async (commentId, isResolved) => {
    try {
      const { data } = await API.resolveComment(activeDoc._id, commentId, isResolved);
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      if (rightTabRef.current === 'activity') fetchActivityLogs();

      if (socketRef.current) {
        socketRef.current.emit('send-comment-update', { documentId: activeDoc._id });
      }
    } catch (err) {
      console.error('Error resolving comment:', err);
    }
  };

  // Comment thread deletion handler
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this comment thread?')) return;

    try {
      const { data } = await API.deleteComment(activeDoc._id, commentId);
      setActiveDoc(data);
      setDocuments((prev) => prev.map((d) => (d._id === data._id ? data : d)));
      if (rightTabRef.current === 'activity') fetchActivityLogs();
      
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }

      if (socketRef.current) {
        socketRef.current.emit('send-comment-update', { documentId: activeDoc._id });
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Sync editor selection when comment card clicked in sidebar
  const selectCommentTextInEditor = (commentId) => {
    if (!editor) return;
    let foundRange = null;

    editor.state.doc.descendants((node, pos) => {
      const mark = node.marks.find((m) => m.type.name === 'commentMark' && m.attrs.commentId === commentId);
      if (mark && foundRange === null) {
        foundRange = { from: pos, to: pos + node.nodeSize };
      }
    });

    if (foundRange) {
      editor.chain().focus().setTextSelection({ from: foundRange.from, to: foundRange.to }).run();
      setActiveCommentId(commentId);
    } else {
      setActiveCommentId(commentId);
    }
  };

  // Filtered documents for search (now delegated to MongoDB full-text search)
  const filteredDocs = documents;

  // Helper flags for inline comment selections
  const editorSelectionEmpty = editor ? editor.state.selection.empty : true;

  // Filter comments based on resolution status
  const docComments = activeDoc?.comments || [];
  const activeComments = docComments.filter(c => !c.isResolved);
  const resolvedComments = docComments.filter(c => c.isResolved);

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Authenticated Dashboard Header (Only show if not in editing screen) */}
      {!activeDoc && (
        <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">CollabSpace</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Workspace</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link 
                to="/profile" 
                className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-800 hover:opacity-85 transition-all"
              >
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-550 dark:text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/20 dark:border-indigo-500/35">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="text-left font-medium">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white leading-none">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
                </div>
              </Link>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 text-slate-650 dark:text-slate-300 transition-all cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </button>

              <button 
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800/80 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      {!activeDoc ? (
        // DASHBOARD GRID VIEW
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative z-10 flex flex-col gap-8">
          
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/65 dark:bg-gradient-to-tr dark:from-slate-900/60 dark:to-slate-900/10 border border-slate-200 dark:border-slate-800/60 p-6 rounded-2xl transition-colors duration-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name}!</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start collaborating or open one of your workspace documents.</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Document
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-400" /> Recent Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quick access to your edits.</p>
            </div>

            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </span>
              <input 
                type="text" 
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all font-semibold"
              />
            </div>
          </div>

          {/* Grid Content */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-semibold">Loading documents...</p>
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Creator Card */}
              <div 
                onClick={() => setIsCreating(true)}
                className="group border border-dashed border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/80 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900/10 dark:hover:bg-slate-900/30 flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-300 h-44 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-805 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                  <FilePlus className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Create New Document</h3>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Start writing formatted docs in the workspace editor.</p>
              </div>

              {/* Dynamic Document Cards */}
              {filteredDocs.map((doc) => {
                const docOwnerId = doc.owner?._id || doc.owner;
                const isMyDoc = docOwnerId?.toString() === user?._id?.toString();
                const canRename = canRenameCard(doc);
                const canDelete = canDeleteCard(doc);
                
                return (
                  <div 
                    key={doc._id}
                    onClick={() => openDocument(doc)}
                    className="group relative border border-slate-200 dark:border-slate-805 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl bg-white hover:bg-slate-50/50 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 p-5 flex flex-col gap-4 cursor-pointer transition-all duration-300 h-44"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-20">
                      {canRename && (
                        <button 
                          onClick={(e) => handleRenameDocument(doc._id, doc.title, e)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/20 hover:bg-indigo-500/5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                          title="Rename document"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={(e) => handleDeleteDocument(doc._id, e)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-rose-500/20 hover:bg-rose-500/5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="pr-6 truncate flex-1">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">{doc.title}</h3>
                        {!isMyDoc && (
                          <span className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 mt-0.5 inline-block">
                            Shared ({doc.collaborators?.find(c => {
                              const cid = c.user?._id || c.user;
                              return cid?.toString() === user?._id?.toString();
                            })?.role || 'editor'})
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-3 flex-1">
                      {doc.content ? doc.content.replace(/[#*`>_\-]/g, '').replace(/\[data-comment-id="[^"]*"\]/g, '') : <span className="italic text-slate-400 dark:text-slate-600">Empty document. Click to start editing.</span>}
                    </p>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-450 dark:text-slate-500 pt-2 border-t border-slate-150 dark:border-slate-800/50">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Updated {formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}

            </div>
          ) : (
            // EMPTY STATE
            <div className="border border-slate-800/80 rounded-2xl bg-slate-900/10 p-12 text-center flex flex-col items-center justify-center py-20 max-w-xl mx-auto w-full">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">No documents found</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
                {searchQuery ? "We couldn't find any documents matching your search. Try another keyword." : "Create your first document to experience rich-text formatting and markdown support."}
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setIsCreating(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {searchQuery ? 'Clear Search' : 'Create New Document'}
              </button>
            </div>
          )}

        </main>
      ) : (
        // LIVE WORKSPACE WINDOW / EDITOR VIEW
        <div className="flex-1 flex flex-col min-h-[calc(100vh-1px)] relative">
          <div className="flex flex-1 relative overflow-hidden">
            
            {/* Backdrop overlays for mobile */}
            {isLeftSidebarOpen && (
              <div className="fixed inset-0 bg-slate-950/60 z-30 md:hidden" onClick={() => setIsLeftSidebarOpen(false)} />
            )}
            {isRightSidebarOpen && (
              <div className="fixed inset-0 bg-slate-950/60 z-30 md:hidden" onClick={() => setIsRightSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <div className={`w-64 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 p-4 flex flex-col gap-6 flex-shrink-0 z-35 transition-all duration-300 absolute md:relative top-0 bottom-0 left-0 h-full md:translate-x-0 ${
              isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
              
              {/* App branding */}
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/60">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-md text-white tracking-tight">CollabSpace</span>
              </div>

              {/* Back to Dashboard */}
              <button 
                onClick={closeEditor}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>

              {/* Documents List */}
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Documents</h4>
                  <div className="flex flex-col gap-1">
                    {documents.map((doc) => {
                      const docOwnerId = doc.owner?._id || doc.owner;
                      const canRename = docOwnerId?.toString() === user?._id?.toString() || doc.collaborators?.some(c => (c.user?._id || c.user)?.toString() === user?._id?.toString() && c.role === 'editor');
                      const canDelete = docOwnerId?.toString() === user?._id?.toString();

                      return (
                        <div 
                          key={doc._id}
                          onClick={() => selectDocumentFromSidebar(doc)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group/sidebar-item relative ${
                            doc._id === activeDoc._id 
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-14">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{doc.title}</span>
                          </div>
                          
                          {/* Hover Actions inside Sidebar */}
                          <div className="absolute right-2 top-1.5 flex items-center gap-1 opacity-0 group-hover/sidebar-item:opacity-100 transition-all z-40">
                            {canRename && (
                              <button
                                onClick={(e) => handleRenameDocument(doc._id, doc.title, e)}
                                className="p-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 cursor-pointer"
                                title="Rename"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={(e) => handleDeleteDocument(doc._id, e)}
                                className="p-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Collaborators */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Active Collaborators</h4>
                  <div className="flex flex-col gap-2.5">
                    {activeCollaborators.map((c) => (
                      <div 
                        key={c.socketId}
                        className="flex items-center gap-2 text-xs text-slate-200 font-semibold"
                      >
                        {c.profilePicture ? (
                          <img 
                            src={c.profilePicture} 
                            alt={c.name} 
                            className="w-5 h-5 rounded-full object-cover border" 
                            style={{ borderColor: getCollaboratorColor(c.socketId) }}
                          />
                        ) : (
                          <div 
                            className="w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center border"
                            style={{ 
                              borderColor: getCollaboratorColor(c.socketId) + '50', 
                              backgroundColor: getCollaboratorColor(c.socketId) + '20', 
                              color: getCollaboratorColor(c.socketId) 
                            }}
                          >
                            {getInitials(c.name)}
                          </div>
                        )}
                        <span className="truncate flex-1">
                          {c.name} {c.socketId === socketRef.current?.id && '(You)'}
                        </span>
                        {c.socketId !== socketRef.current?.id && (
                          <span 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: getCollaboratorColor(c.socketId) }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Create */}
              <div className="pt-4 border-t border-slate-800/60">
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Doc
                </button>
              </div>
            </div>
            
            {/* Editor Panel */}
            <div className="flex-1 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col overflow-hidden relative transition-colors duration-200">
              
              {/* Editor Header */}
              <div className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-6 flex items-center justify-between z-20 transition-colors duration-200">
                <div className="flex items-center gap-2 md:gap-4">
                  {/* Left Toggle (Mobile only) */}
                  <button
                    onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-305 hover:text-slate-900 dark:hover:text-white md:hidden cursor-pointer"
                    title="Toggle Documents List"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  {activeRole !== 'viewer' ? (
                    <>
                      {saveStatus === 'saving' && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium select-none">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          <span>Saving edits...</span>
                        </div>
                      )}
                      {saveStatus === 'saved' && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400 font-medium select-none animate-fadeIn">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>All changes saved</span>
                        </div>
                      )}
                      {saveStatus === 'error' && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium select-none animate-fadeIn">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Save error. Retrying...</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-450 font-semibold select-none animate-fadeIn bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-2 py-0.5 rounded-lg">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Viewer Mode (Read Only)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 text-slate-655 dark:text-slate-305 transition-all cursor-pointer"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-455" />}
                  </button>

                  {/* Comments Toggle (Mobile only) */}
                  <button
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-305 hover:text-slate-900 dark:hover:text-white md:hidden cursor-pointer"
                    title="Toggle Comments Sidebar"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Share button */}
                  <button 
                    onClick={() => setIsSharingOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/10 dark:bg-indigo-650/40 border border-indigo-550/20 dark:border-indigo-500/25 hover:bg-indigo-600 hover:dark:bg-indigo-650/65 text-indigo-650 dark:text-indigo-400 hover:text-white dark:hover:text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>

                  {/* Avatar pile from Socket.io */}
                  <div className="flex -space-x-1.5 mr-2 select-none">
                    {activeCollaborators.map((c) => {
                      const colColor = getCollaboratorColor(c.socketId);
                      return c.profilePicture ? (
                        <img 
                          key={c.socketId}
                          src={c.profilePicture} 
                          alt={c.name} 
                          className="w-6 h-6 rounded-full object-cover border-2" 
                          style={{ borderColor: colColor }}
                          title={c.name}
                        />
                      ) : (
                        <div 
                          key={c.socketId}
                          className="w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border-2 text-white"
                          style={{ backgroundColor: colColor + '20', borderColor: colColor, color: colColor }}
                          title={c.name}
                        >
                          {getInitials(c.name)}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={closeEditor}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Close editor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Writing Area */}
              <div className="flex-1 p-6 md:p-10 overflow-y-auto flex flex-col items-center">
                <div className="max-w-3xl w-full flex-1 flex flex-col">
                  
                  {/* Dynamic Doc Title Input */}
                  <input 
                    type="text" 
                    value={editorTitle}
                    onChange={(e) => handleTitleInputChange(e.target.value)}
                    placeholder="Untitled Document"
                    disabled={activeRole === 'viewer'}
                    className="w-full bg-transparent text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-2 focus:outline-none placeholder-slate-400 dark:placeholder-slate-700 tracking-tight disabled:cursor-default"
                  />

                  {/* Header Subtitle details */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
                    <span>Active Document</span>
                    <span>•</span>
                    {activeRole === 'viewer' ? (
                      <span className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        <Lock className="w-3 h-3 text-amber-500" /> Read Only
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-3 h-3" /> Live Synced to MongoDB
                      </span>
                    )}
                  </div>

                  {/* Formatting Toolbar */}
                  {activeRole !== 'viewer' && (
                    <MenuBar 
                      editor={editor} 
                      onAttach={() => fileInputRef.current?.click()} 
                      isUploading={isUploadingMedia} 
                    />
                  )}

                  {/* TipTap Rich Text Editor */}
                  <div className="w-full flex-1 bg-transparent text-sm leading-relaxed text-slate-300 min-h-[400px]">
                    <EditorContent editor={editor} />
                  </div>

                  {/* Hidden file uploader input */}
                  {activeRole !== 'viewer' && (
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleMediaUpload}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                  )}
                  
                </div>
              </div>

            </div>

            {/* Google Docs-style Comments and Activity Log Panel */}
            <div className={`w-80 border-l border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0 z-35 transition-all duration-300 absolute md:relative top-0 bottom-0 right-0 h-full md:translate-x-0 ${
              isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            } select-none`}>
              
              {/* Tab Toggles */}
              <div className="flex border-b border-slate-200 dark:border-slate-800/85 select-none">
                <button
                  onClick={() => setRightTab('comments')}
                  className={`flex-1 pb-2.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all cursor-pointer ${
                    rightTab === 'comments'
                      ? 'border-indigo-500 text-indigo-550 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Comments
                </button>
                <button
                  onClick={() => setRightTab('activity')}
                  className={`flex-1 pb-2.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all cursor-pointer ${
                    rightTab === 'activity'
                      ? 'border-indigo-500 text-indigo-550 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setRightTab('ai')}
                  className={`flex-1 pb-2.5 text-[10px] font-bold tracking-wider uppercase border-b-2 text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    rightTab === 'ai'
                      ? 'border-indigo-500 text-indigo-555 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI
                </button>
              </div>

              {/* COMMENTS TAB CONTENT */}
              {rightTab === 'comments' && (
                <>
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Threads</h4>
                    <button
                      onClick={() => setShowResolvedComments(prev => !prev)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[9px] font-semibold text-slate-450 hover:text-white transition-all cursor-pointer"
                    >
                      {showResolvedComments ? 'Show Active' : 'Show Resolved'}
                    </button>
                  </div>

                  {/* Inline Comment Creation Area */}
                  {activeRole !== 'viewer' && (
                    <div className="bg-slate-900/35 border border-slate-850 p-3 rounded-xl flex flex-col gap-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Inline Comment</h4>
                      {editorSelectionEmpty ? (
                        <p className="text-[10px] text-slate-550 leading-normal italic">Highlight a text segment in the editor to leave an inline comment.</p>
                      ) : (
                        <form onSubmit={handleAddInlineComment} className="flex flex-col gap-2">
                          <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Write your comment..."
                            className="w-full min-h-[60px] p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium resize-y"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isCommentSubmitting || !newCommentText.trim()}
                            className="self-end px-3.5 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-55 cursor-pointer shadow shadow-indigo-500/10 flex items-center gap-1"
                          >
                            {isCommentSubmitting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <MessageSquare className="w-3 h-3" /> Comment
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Comments Thread List */}
                  <div className="flex-1 flex flex-col gap-3">
                    {(showResolvedComments ? resolvedComments : activeComments).length > 0 ? (
                      (showResolvedComments ? resolvedComments : activeComments).map((comment) => {
                        const cUser = comment.user || {};
                        const isUserObject = typeof cUser === 'object';
                        const cUserId = isUserObject ? cUser._id : cUser;
                        const cName = isUserObject ? cUser.name : 'User';
                        const cProfilePicture = isUserObject ? cUser.profilePicture : '';
                        
                        const isCardActive = activeCommentId === comment.commentId;
                        const isMyComment = user && cUserId?.toString() === user._id.toString();
                        const isDocOwner = user && (activeDoc.owner?._id || activeDoc.owner)?.toString() === user._id.toString();

                        return (
                          <div
                            key={comment.commentId}
                            onClick={() => selectCommentTextInEditor(comment.commentId)}
                            className={`p-3.5 rounded-xl border flex flex-col gap-3 transition-all cursor-pointer ${
                              isCardActive
                                ? 'bg-slate-900 border-amber-500/35 shadow shadow-amber-500/5'
                                : 'bg-slate-900/35 border-slate-850/65 hover:border-slate-800'
                            }`}
                          >
                            {/* Comment Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                {cProfilePicture ? (
                                  <img 
                                    src={cProfilePicture} 
                                    alt={cName} 
                                    className="w-6 h-6 rounded-full object-cover border border-slate-700" 
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-bold flex items-center justify-center border border-indigo-500/30">
                                    {getInitials(cName)}
                                  </div>
                                )}
                                <div className="text-left leading-none">
                                  <p className="text-[11px] font-bold text-white leading-none">{cName}</p>
                                  <span className="text-[8px] text-slate-500 leading-none mt-0.5 block">{formatDate(comment.createdAt)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Resolve Check Button */}
                                {activeRole !== 'viewer' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResolveComment(comment.commentId, !comment.isResolved);
                                    }}
                                    className={`p-1 rounded-lg border text-slate-500 hover:text-white cursor-pointer ${
                                      comment.isResolved
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-slate-950 border-slate-850 hover:border-indigo-500/25 hover:text-indigo-400'
                                    }`}
                                    title={comment.isResolved ? 'Reopen Comment' : 'Resolve Comment'}
                                  >
                                    {comment.isResolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                  </button>
                                )}

                                {/* Delete Thread Button */}
                                {(isMyComment || isDocOwner) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(comment.commentId);
                                    }}
                                    className="p-1 rounded-lg bg-slate-950 border border-slate-850 hover:border-rose-500/20 hover:bg-rose-500/5 text-slate-500 hover:text-rose-455 cursor-pointer"
                                    title="Delete comment thread"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Comment Text Content */}
                            <p className="text-xs text-slate-300 leading-normal font-medium">{comment.text}</p>

                            {/* Comment replies list */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="pl-3.5 border-l border-slate-800 space-y-3 mt-1">
                                {comment.replies.map((reply) => {
                                  const rUser = reply.user || {};
                                  const isRepUserObj = typeof rUser === 'object';
                                  const rUserId = isRepUserObj ? rUser._id : rUser;
                                  const rName = isRepUserObj ? rUser.name : 'User';
                                  const rProfilePic = isRepUserObj ? rUser.profilePicture : '';
                                  
                                  return (
                                    <div key={reply._id} className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        {rProfilePic ? (
                                          <img 
                                            src={rProfilePic} 
                                            alt={rName} 
                                            className="w-4.5 h-4.5 rounded-full object-cover border border-slate-800" 
                                          />
                                        ) : (
                                          <div className="w-4.5 h-4.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[7px] font-bold flex items-center justify-center border border-indigo-500/25">
                                            {getInitials(rName)}
                                          </div>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-350">{rName}</span>
                                        <span className="text-[8px] text-slate-500 ml-auto">{formatDate(reply.createdAt)}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 leading-normal pl-6 font-medium">{reply.text}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Comment Reply Form */}
                            {activeRole !== 'viewer' && !comment.isResolved && (
                              <form
                                onSubmit={(e) => handleAddReplySubmit(comment.commentId, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex gap-1.5 mt-1 border-t border-slate-850 pt-2.5"
                              >
                                <input
                                  type="text"
                                  value={replyTexts[comment.commentId] || ''}
                                  onChange={(e) =>
                                    setReplyTexts((prev) => ({ ...prev, [comment.commentId]: e.target.value }))
                                  }
                                  placeholder="Reply..."
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-855 focus:outline-none focus:border-indigo-500 text-[10px] text-white placeholder-slate-650 font-medium"
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={!(replyTexts[comment.commentId] || '').trim()}
                                  className="px-3 py-1.5 rounded-xl text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/35 hover:text-indigo-400 text-slate-400 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                  Reply
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center py-20 text-slate-600 gap-2">
                        <MessageSquare className="w-8 h-8 text-slate-700" />
                        <p className="text-[11px] font-semibold italic">
                          {showResolvedComments
                            ? 'No resolved comment threads.'
                            : 'No active comment threads yet.'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ACTIVITY LOG TAB CONTENT */}
              {rightTab === 'activity' && (
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1">Chronological Timeline</h4>

                  {isLogsLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <p className="text-[10px] font-semibold">Loading logs...</p>
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <div className="flex-grow overflow-y-auto pr-1">
                      <div className="relative border-l border-slate-800/80 pl-4 py-2 space-y-5">
                        {activityLogs.map((log) => {
                          const lUser = log.user || {};
                          const isLUserObj = typeof lUser === 'object';
                          const lName = isLUserObj ? lUser.name : 'User';
                          const lProfilePicture = isLUserObj ? lUser.profilePicture : '';
                          const initials = getInitials(lName);
                          
                          // Custom styles/icons based on activity category
                          let badgeColor = 'bg-slate-900 border-slate-800 text-slate-550';
                          let logIcon = <Clock className="w-3 h-3" />;
                          
                          if (log.action === 'create') {
                            badgeColor = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                            logIcon = <Plus className="w-3 h-3" />;
                          } else if (log.action === 'edit' || log.action === 'rename') {
                            badgeColor = 'bg-sky-500/10 border-sky-500/20 text-sky-400';
                            logIcon = <Edit2 className="w-3 h-3" />;
                          } else if (log.action === 'share' || log.action === 'unshare') {
                            badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                            logIcon = <Users className="w-3 h-3" />;
                          } else if (log.action.startsWith('comment')) {
                            badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                            logIcon = <MessageSquare className="w-3 h-3" />;
                          }

                          return (
                            <div key={log._id} className="relative text-left min-w-0">
                              
                              {/* Node pin line */}
                              <span className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                              </span>

                              <div className="flex gap-2 min-w-0">
                                {lProfilePicture ? (
                                  <img 
                                    src={lProfilePicture} 
                                    alt={lName} 
                                    className="w-5.5 h-5.5 rounded-full object-cover border border-slate-800 flex-shrink-0" 
                                  />
                                ) : (
                                  <div className="w-5.5 h-5.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                                    {initials}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center flex-wrap gap-1">
                                    <span className="text-[10px] font-bold text-slate-200 truncate">{lName}</span>
                                    <span className={`text-[7px] px-1 py-0.2 rounded border font-bold capitalize select-none leading-none scale-[0.9] origin-left ${badgeColor}`}>
                                      {log.action.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal font-medium break-words">{log.details}</p>
                                  <span className="text-[8px] text-slate-550 block mt-0.5 font-medium">{formatDate(log.createdAt)}</span>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-20 text-slate-600 gap-2">
                      <Activity className="w-8 h-8 text-slate-700" />
                      <p className="text-[11px] font-semibold italic">No activity logged for this document.</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI ASSISTANT TAB CONTENT */}
              {rightTab === 'ai' && (
                <div className="flex-grow flex flex-col gap-5 py-2 animate-fadeIn text-xs select-none">
                  {/* Summarizer Section */}
                  <div className="border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/20 rounded-xl p-4 flex flex-col gap-3.5">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Document Summarizer
                      </h3>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Use Gemini AI to condense the content of this document.</p>
                    </div>

                    {aiSummaryError && (
                      <div className="text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg">
                        {aiSummaryError}
                      </div>
                    )}

                    {isSummarizing ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-[10px]">Analyzing document...</span>
                      </div>
                    ) : aiSummary ? (
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850/80 max-h-48 overflow-y-auto leading-relaxed text-slate-700 dark:text-slate-300 text-[11px] prose-sm">
                        {aiSummary.split('\n').map((line, i) => (
                          <p key={i} className={line.startsWith('•') || line.startsWith('-') ? 'pl-2 mb-1.5' : 'mb-2'}>{line}</p>
                        ))}
                      </div>
                    ) : null}

                    <button
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-805 border border-slate-200 dark:border-slate-800/80 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {aiSummary ? 'Refresh Summary' : 'Generate Summary'}
                    </button>
                  </div>

                  {/* Writing Assistant Section */}
                  <div className="border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/20 rounded-xl p-4 flex flex-col gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Gemini Writing Assist
                      </h3>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Rewrite, format, translate, or expand selected text.</p>
                    </div>

                    {/* Selection Status indicator */}
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Assisting Target:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {getSelectedText() ? 'Selection Grabbed' : 'Full Document'}
                      </span>
                    </div>

                    {aiAssistError && (
                      <div className="text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg">
                        {aiAssistError}
                      </div>
                    )}

                    {/* Assist output */}
                    {isAssisting ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-[10px]">Processing request...</span>
                      </div>
                    ) : aiAssistOutput ? (
                      <div className="flex flex-col gap-2">
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850/80 max-h-48 overflow-y-auto leading-relaxed text-slate-700 dark:text-slate-300 text-[11px] prose-sm">
                          {aiAssistOutput.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleInsertAssistResult}
                            disabled={activeRole === 'viewer'}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-[10px] transition-all cursor-pointer"
                          >
                            {getSelectedText() ? 'Replace Selection' : 'Insert at Cursor'}
                          </button>
                          <button
                            onClick={() => setAiAssistOutput('')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-805 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] transition-all cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Instruction Form */}
                    <div className="flex flex-col gap-2">
                      <textarea
                        placeholder="e.g. 'Correct grammar and spelling', 'Translate to Spanish', 'Summarize key points'"
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        rows="3"
                        disabled={isAssisting || activeRole === 'viewer'}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-955 dark:border-slate-850 p-2 text-[11px] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 placeholder-slate-450 dark:placeholder-slate-600 font-medium resize-none disabled:opacity-50"
                      />
                      <button
                        onClick={handleWritingAssist}
                        disabled={isAssisting || !aiInstruction.trim() || activeRole === 'viewer'}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Ask Gemini
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* CREATE DOCUMENT OVERLAY MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            
            <button 
              onClick={() => {
                setNewDocTitle('');
                setIsCreating(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <FilePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create Document</h3>
                <p className="text-[11px] text-slate-400">Enter a name for your new document workspace.</p>
              </div>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-slate-300">Document Title</label>
                <input 
                  type="text" 
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Q3 Launch Strategy"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-855 focus:outline-none focus:border-indigo-500 text-xs text-white placeholder-slate-600 transition-all font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setNewDocTitle('');
                    setIsCreating(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingSubmit || !newDocTitle.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingSubmit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE DOCUMENT MODAL */}
      {isSharingOpen && activeDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            
            <button 
              onClick={() => {
                setShareEmail('');
                setShareError('');
                setShareSuccess('');
                setIsSharingOpen(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Share Document</h3>
                <p className="text-[11px] text-slate-400">Manage user authorization and collaborate on this document.</p>
              </div>
            </div>

            {/* Invite Form (Visible only to Document Owner) */}
            {activeRole === 'owner' ? (
              <form onSubmit={handleShareSubmit} className="space-y-4 pb-5 border-b border-slate-800/80">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-semibold text-slate-355">Invite User by Email</label>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="colleague@domain.com"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-855 focus:outline-none focus:border-indigo-500 text-xs text-white placeholder-slate-600 transition-all font-medium"
                      required
                    />
                    
                    <div className="relative">
                      <select 
                        value={shareRole}
                        onChange={(e) => setShareRole(e.target.value)}
                        className="h-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-855 focus:outline-none focus:border-indigo-500 text-xs text-slate-300 font-semibold cursor-pointer appearance-none pr-8"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>

                    <button 
                      type="submit"
                      disabled={isShareSubmitting || !shareEmail.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isShareSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" /> Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {shareError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{shareError}</span>
                  </div>
                )}
                {shareSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-550/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{shareSuccess}</span>
                  </div>
                )}
              </form>
            ) : (
              <div className="mb-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-400 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Only the document owner can share or update collaborator roles.</span>
              </div>
            )}

            {/* List of current users */}
            <div className="mt-5 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Who Has Access</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                
                {/* Document Owner */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/35 border border-slate-850/50">
                  <div className="flex items-center gap-3">
                    {activeDoc.owner?.profilePicture ? (
                      <img 
                        src={activeDoc.owner.profilePicture} 
                        alt={activeDoc.owner.name} 
                        className="w-7 h-7 rounded-full object-cover border border-slate-700" 
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/30">
                        {getInitials(activeDoc.owner?.name)}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">{activeDoc.owner?.name || 'Owner'}</p>
                      <p className="text-[9px] text-slate-450">{activeDoc.owner?.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-950 border border-slate-800 text-slate-400">
                    Owner
                  </span>
                </div>

                {/* Collaborators List */}
                {activeDoc.collaborators && activeDoc.collaborators.length > 0 ? (
                  activeDoc.collaborators.map((c) => {
                    const cUser = c.user || {};
                    const isCollabUserObject = typeof cUser === 'object';
                    const cUserId = isCollabUserObject ? cUser._id : cUser;
                    const cName = isCollabUserObject ? cUser.name : 'Collaborator';
                    const cEmail = isCollabUserObject ? cUser.email : '';
                    const cProfilePicture = isCollabUserObject ? cUser.profilePicture : '';
                    
                    return (
                      <div 
                        key={cUserId} 
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/35 border border-transparent hover:border-slate-850/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {cProfilePicture ? (
                            <img 
                              src={cProfilePicture} 
                              alt={cName} 
                              className="w-7 h-7 rounded-full object-cover border border-slate-800" 
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/25">
                              {getInitials(cName)}
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-200">{cName}</p>
                            <p className="text-[9px] text-slate-500">{cEmail}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-950 border border-slate-855 text-indigo-400 capitalize">
                            {c.role}
                          </span>
                          
                          {activeRole === 'owner' && (
                            <button
                              onClick={() => handleRemoveCollaborator(cUserId)}
                              className="p-1 rounded-lg bg-slate-950 border border-slate-855 hover:border-rose-500/20 hover:bg-rose-500/5 text-slate-500 hover:text-rose-455 cursor-pointer transition-all"
                              title="Revoke access"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  activeRole === 'owner' && (
                    <p className="text-[10px] text-slate-650 text-center py-4 italic">No one else has access to this document yet. Use the form above to invite people!</p>
                  )
                )}

              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-end">
              <button 
                onClick={() => {
                  setShareEmail('');
                  setShareError('');
                  setShareSuccess('');
                  setIsSharingOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
