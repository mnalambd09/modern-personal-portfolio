/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ExternalLink, 
  Code2, 
  Palette, 
  Globe, 
  Cpu, 
  Send, 
  MessageSquare, 
  X, 
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Star,
  Users,
  Briefcase,
  Award,
  Zap,
  CheckCircle2,
  ArrowUp,
  Clock,
  BookOpen,
  DollarSign,
  ArrowRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Toaster, toast } from 'sonner';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- Types ---
interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  image: string;
  link: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
}

interface TimelineItem {
  id: number;
  year: string;
  title: string;
  company: string;
  description: string;
}

interface PricingPlan {
  id: number;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

interface BlogPost {
  id: number;
  title: string;
  date: string;
  category: string;
  image: string;
  content: string;
}

interface AdminMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: any;
}

interface Subscriber {
  id: string;
  email: string;
  createdAt: any;
}

// --- Components ---

const ProjectModal = ({ project, onClose }: { project: Project, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 md:h-80">
          <img 
            src={project.image} 
            alt={project.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-3xl font-bold mb-4">{project.title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {project.description} This project demonstrates advanced implementation of modern web technologies, focusing on user experience, performance, and scalable architecture.
          </p>
          <div className="flex gap-4">
            <a 
              href={project.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              View Live Demo <ExternalLink size={20} />
            </a>
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminDashboard = ({ user, onLogout, onClose }: { user: User, onLogout: () => void, onClose: () => void }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'subscribers' | 'newsletter'>('messages');
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Messages
    const qMsg = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminMessage[]);
    });

    // Subscribers
    const qSub = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      setSubscribers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscriber[]);
    });

    // Analytics (Simple count)
    const unsubAnalytics = onSnapshot(collection(db, 'analytics'), (snapshot) => {
      setVisitorCount(snapshot.size);
      setLoading(false);
    });

    return () => {
      unsubMsg();
      unsubSub();
      unsubAnalytics();
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Failed to delete message");
    }
  };

  const toggleRead = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'messages', id), {
        read: !currentStatus
      });
    } catch (error) {
      console.error("Update Error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletterSubject || !newsletterMessage) {
      toast.error("Please fill in both subject and message");
      return;
    }
    if (subscribers.length === 0) {
      toast.error("No subscribers to send to");
      return;
    }

    setIsSending(true);
    try {
      // 1. Log the newsletter to Firestore
      await addDoc(collection(db, 'newsletters'), {
        subject: newsletterSubject,
        message: newsletterMessage,
        recipientCount: subscribers.length,
        createdAt: serverTimestamp(),
        sentBy: user.email
      });

      // 2. Call the backend API to send actual emails
      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: newsletterSubject,
          message: newsletterMessage,
          subscribers: subscribers.map(s => s.email)
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        throw new Error(`Server error (${response.status}): ${text.slice(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }
      
      toast.success(`Newsletter sent to ${subscribers.length} subscribers!`);
      setNewsletterSubject('');
      setNewsletterMessage('');
      setActiveTab('messages');
    } catch (error: any) {
      console.error("Newsletter Error:", error);
      toast.error(error.message || "Failed to send newsletter");
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(msg => 
    msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: messages.length,
    unread: messages.filter(m => !m.read).length,
    today: messages.filter(m => {
      const today = new Date();
      const msgDate = m.createdAt?.toDate();
      return msgDate && 
             msgDate.getDate() === today.getDate() &&
             msgDate.getMonth() === today.getMonth() &&
             msgDate.getFullYear() === today.getFullYear();
    }).length
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold font-display tracking-tight mb-2">Admin Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400">Welcome back, {user.displayName}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Back to Site
            </button>
            <button 
              onClick={onLogout}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Messages", value: stats.total, icon: <MessageSquare size={20} />, color: "blue" },
            { label: "Subscribers", value: subscribers.length, icon: <Users size={20} />, color: "purple" },
            { label: "Total Visitors", value: visitorCount, icon: <Globe size={20} />, color: "green" },
            { label: "Received Today", value: stats.today, icon: <Clock size={20} />, color: "orange" }
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className={`w-10 h-10 rounded-2xl bg-${s.color}-100 dark:bg-${s.color}-900/30 text-${s.color}-600 dark:text-${s.color}-400 flex items-center justify-center mb-4`}>
                {s.icon}
              </div>
              <div className="text-3xl font-bold mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Messages
          </button>
          <button 
            onClick={() => setActiveTab('subscribers')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'subscribers' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Subscribers
          </button>
          <button 
            onClick={() => setActiveTab('newsletter')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'newsletter' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Send Newsletter
          </button>
        </div>

        {/* Search and Content */}
        {activeTab === 'messages' && (
          <div className="mb-8">
            <div className="relative max-w-md">
              <input 
                type="text" 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              />
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeTab === 'messages' ? (
              filteredMessages.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Mail size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No messages found.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    layout
                    className={`bg-white dark:bg-slate-900 p-8 rounded-3xl border transition-all ${
                      !msg.read 
                        ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-50 dark:shadow-none' 
                        : 'border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                          !msg.read ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {msg.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold">{msg.name}</h3>
                            {!msg.read && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                New
                              </span>
                            )}
                          </div>
                          <a href={`mailto:${msg.email}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">{msg.email}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end md:self-start">
                        <span className="text-xs text-slate-400 font-medium">
                          {msg.createdAt?.toDate().toLocaleString() || 'Just now'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleRead(msg.id, msg.read)}
                            className={`p-2 rounded-xl transition-colors ${
                              msg.read 
                                ? 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' 
                                : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100'
                            }`}
                            title={msg.read ? "Mark as unread" : "Mark as read"}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleDelete(msg.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Delete message"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
                      {msg.message}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <a 
                        href={`mailto:${msg.email}?subject=Re: Portfolio Inquiry`}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:gap-3 transition-all"
                      >
                        Quick Reply <ArrowRight size={16} />
                      </a>
                    </div>
                  </motion.div>
                ))
              )
            ) : activeTab === 'subscribers' ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Email</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Subscribed At</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subscribers.map(sub => (
                      <tr key={sub.id}>
                        <td className="px-6 py-4 font-medium">{sub.email}</td>
                        <td className="px-6 py-4 text-slate-500">{sub.createdAt?.toDate().toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'subscribers', sub.id));
                                toast.success("Subscriber removed");
                              } catch (e) {
                                toast.error("Failed to remove subscriber");
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Compose Newsletter</h3>
                    <p className="text-sm text-slate-500">Send an update to all {subscribers.length} subscribers.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Subject</label>
                    <input 
                      type="text" 
                      value={newsletterSubject}
                      onChange={(e) => setNewsletterSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      placeholder="e.g. New Project Launch!"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Message</label>
                    <textarea 
                      rows={8}
                      value={newsletterMessage}
                      onChange={(e) => setNewsletterMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white"
                      placeholder="Write your newsletter content here..."
                    />
                  </div>
                  <button 
                    onClick={handleSendNewsletter}
                    disabled={isSending}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send to All Subscribers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'subscribers'), {
        email,
        createdAt: serverTimestamp()
      });
      toast.success("Subscribed successfully!", {
        description: "You'll receive my latest updates soon."
      });
      setEmail('');
    } catch (error) {
      console.error("Subscription Error:", error);
      toast.error("Subscription failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-24 bg-blue-600 dark:bg-blue-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display tracking-tight">Stay in the Loop</h2>
            <p className="text-blue-100 text-lg mb-10 leading-relaxed">
              Subscribe to my newsletter to receive the latest news about my projects, 
              tech insights, and design inspirations directly in your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder:text-blue-200 outline-none focus:ring-2 focus:ring-white/50 transition-all"
              />
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? "Subscribing..." : "Subscribe Now"}
              </button>
            </form>
            <p className="mt-6 text-blue-200 text-sm">No spam, ever. Unsubscribe at any time.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ScrollProgress = () => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setWidth(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div className="scroll-progress" style={{ width: `${width}%` }} />;
};

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 500);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 bg-white dark:bg-slate-900 p-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ isDark, toggleDark }: { isDark: boolean, toggleDark: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass py-3 shadow-sm' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="text-2xl font-bold font-display tracking-tighter">
          PORT<span className="text-blue-600">FOLIO</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium uppercase tracking-widest">
          <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
          <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
          <a href="#projects" className="hover:text-blue-600 transition-colors">Projects</a>
          <a href="#testimonials" className="hover:text-blue-600 transition-colors">Reviews</a>
          <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          
          <button 
            onClick={toggleDark}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="flex items-center space-x-4 md:hidden">
          <button 
            onClick={toggleDark}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-4 text-sm font-medium uppercase tracking-widest">
              <a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
              <a href="#services" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
              <a href="#projects" onClick={() => setIsMobileMenuOpen(false)}>Projects</a>
              <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)}>Reviews</a>
              <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Timeline = ({ items }: { items: TimelineItem[] }) => {
  return (
    <div className="relative">
      <div className="timeline-line" />
      <div className="space-y-12">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`relative flex flex-col md:flex-row items-start md:items-center ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
          >
            <div className="timeline-dot" />
            <div className="w-full md:w-1/2 pl-12 md:px-12">
              <div className="glass p-6 rounded-2xl shadow-sm">
                <span className="text-blue-600 font-bold text-sm">{item.year}</span>
                <h3 className="text-xl font-bold mt-1">{item.title}</h3>
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-3">{item.company}</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Pricing = ({ plans, onSelect }: { plans: PricingPlan[], onSelect: (plan: string) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {plans.map((plan) => (
        <motion.div
          key={plan.id}
          whileHover={{ y: -10 }}
          className={`p-8 rounded-[32px] border transition-all ${
            plan.isPopular 
              ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200 dark:shadow-none scale-105 z-10' 
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100'
          }`}
        >
          {plan.isPopular && (
            <span className="inline-block px-3 py-1 bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
              Most Popular
            </span>
          )}
          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className={`text-sm ${plan.isPopular ? 'text-blue-100' : 'text-slate-500'}`}>/project</span>
          </div>
          <ul className="space-y-4 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <CheckCircle2 size={16} className={plan.isPopular ? 'text-blue-200' : 'text-blue-600'} />
                {feature}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => onSelect(plan.name)}
            className={`w-full py-4 rounded-xl font-bold transition-all ${
            plan.isPopular 
              ? 'bg-white text-blue-600 hover:bg-slate-100' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>
            Get Started
          </button>
        </motion.div>
      ))}
    </div>
  );
};

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I am your AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || input.trim();
    if (!messageToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: messageToSend }] }],
        config: {
          systemInstruction: "You are a helpful AI assistant for a personal portfolio website. Be professional, concise, and friendly. If asked about services, mention Web Dev, UI/UX, SEO, and AI Integration."
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "What services do you offer?",
    "Tell me about your projects",
    "How can I contact you?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass w-80 md:w-96 h-[550px] mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900/90"
          >
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-semibold">AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap gap-2 mb-4">
                {quickActions.map((action, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSendMessage(action)}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading}
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
};

const BlogModal = ({ post, onClose }: { post: BlogPost, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 md:h-80 shrink-0">
          <img 
            src={post.image} 
            alt={post.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8 md:p-12 overflow-y-auto">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">
            <span>{post.category}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="text-slate-500">{post.date}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-display tracking-tight">{post.title}</h2>
          <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Blog = ({ posts, onReadMore }: { posts: BlogPost[], onReadMore: (post: BlogPost) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {posts.map((post) => (
        <motion.div
          key={post.id}
          whileHover={{ y: -5 }}
          className="group cursor-pointer"
          onClick={() => onReadMore(post)}
        >
          <div className="aspect-video rounded-2xl overflow-hidden mb-4">
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            <span>{post.category}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="text-slate-500">{post.date}</span>
          </div>
          <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors leading-tight">
            {post.title}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Read More <ArrowRight size={16} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const SkillsMarquee = () => {
  const skills = [
    "Mechanical Piping", "Industrial Supervisor", "Project Management", 
    "React", "Node.js", "TypeScript", "Next.js", "Tailwind CSS", 
    "Firebase", "South Korea", "Iraq", "Libya", "Industrial Admin",
    "Figma", "Redux", "GraphQL", "MongoDB", "Git"
  ];

  return (
    <div className="py-12 bg-slate-900 text-white overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...skills, ...skills].map((skill, i) => (
          <div key={i} className="flex items-center mx-8">
            <Zap size={16} className="text-blue-500 mr-2" />
            <span className="text-xl font-display font-bold uppercase tracking-tighter">{skill}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    // Analytics: Record page view
    const recordView = async () => {
      try {
        await addDoc(collection(db, 'analytics'), {
          page: window.location.pathname,
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent
        });
      } catch (e) {
        console.error("Analytics Error:", e);
      }
    };
    recordView();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.title = "MN Alambo | Full-Stack Developer & Designer";
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email?.toLowerCase() === "mnalambd09@gmail.com") {
        toast.success("Logged in as Admin");
        setView('admin');
      } else {
        toast.error("Access Denied", {
          description: "This dashboard is for the project owner only."
        });
        await signOut(auth);
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      toast.error(`Login failed: ${error.message || "Unknown error"}`);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domain not authorized", {
          description: "Please add your Vercel domain to Firebase Console > Auth > Settings > Authorized domains."
        });
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
    toast.info("Logged out");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Save to Firestore
      await addDoc(collection(db, 'messages'), {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Message sent successfully!', {
        description: "I'll get back to you as soon as possible.",
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error("Firestore Error:", error);
      toast.error('Failed to send message', {
        description: "Please try again later or email me directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePricingSelect = (plan: string) => {
    toast.info(`Selected ${plan} Plan`, {
      description: "Redirecting you to the contact form...",
    });
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const projects: Project[] = [
    {
      id: 1,
      title: "JUNJE Website",
      description: "Mechanical Project Management and Admin Portal. Built for industrial efficiency and team coordination.",
      tags: ["React", "Firebase", "Admin Dashboard"],
      image: "https://picsum.photos/seed/industrial/800/600",
      link: "https://mnalambd09.github.io/junje-website/"
    },
    {
      id: 2,
      title: "Md-nooralam Profile",
      description: "Interactive career guide and portfolio showcase highlighting global engineering experience.",
      tags: ["TypeScript", "Motion", "Portfolio"],
      image: "https://picsum.photos/seed/profile/800/600",
      link: "https://mnalambd09.github.io/Md-nooralam/"
    },
    {
      id: 3,
      title: "Mechanical Engineering Portfolio",
      description: "A comprehensive showcase of 16 years of global piping and supervisor experience.",
      tags: ["Web Design", "SEO", "Industrial"],
      image: "https://picsum.photos/seed/engineering/800/600",
      link: "https://mnalambd09.github.io/blue-port/"
    }
  ];

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "CEO",
      company: "TechFlow",
      content: "Working with this team was a game-changer for our startup. The attention to detail and technical expertise is unmatched.",
      avatar: "https://i.pravatar.cc/150?u=sarah"
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Product Manager",
      company: "InnovateX",
      content: "The AI integration they built for us saved our team 20 hours a week. Highly recommended for any complex web project.",
      avatar: "https://i.pravatar.cc/150?u=michael"
    },
    {
      id: 3,
      name: "Elena Rodriguez",
      role: "Founder",
      company: "CreativePulse",
      content: "Beautiful design combined with rock-solid performance. Our conversion rate increased by 40% after the redesign.",
      avatar: "https://i.pravatar.cc/150?u=elena"
    }
  ];

  const stats = [
    { icon: <Briefcase size={24} />, label: "Years Experience", value: "16+" },
    { icon: <CheckCircle2 size={24} />, label: "Global Projects", value: "10+" },
    { icon: <Users size={24} />, label: "Countries Worked", value: "4" },
    { icon: <Award size={24} />, label: "Certifications", value: "15+" }
  ];

  const timelineItems: TimelineItem[] = [
    {
      id: 1,
      year: "Present",
      title: "Mechanical Piping Specialist",
      company: "Hyundai Samho Heavy Industries (South Korea)",
      description: "Specializing in complex mechanical piping work for heavy industrial projects."
    },
    {
      id: 2,
      year: "Previous",
      title: "Supervisor",
      company: "Samsung Engineering & Construction (Dhaka)",
      description: "Supervised construction activities at Terminal 3, Dhaka International Airport."
    },
    {
      id: 3,
      year: "Previous",
      title: "Admin (Korean Team)",
      company: "Hanwha Engineering (Iraq)",
      description: "Managed administrative tasks for the JUNJE Team in Iraq."
    },
    {
      id: 4,
      year: "Previous",
      title: "Computer Operator & Admin",
      company: "Won Engineering (Libya)",
      description: "Handled IT operations and administrative support in Libya."
    }
  ];

  const pricingPlans: PricingPlan[] = [
    {
      id: 1,
      name: "Basic",
      price: "$999",
      features: ["Single Page Website", "Responsive Design", "Basic SEO", "1 Month Support"]
    },
    {
      id: 2,
      name: "Professional",
      price: "$2,499",
      features: ["Multi-page Web App", "Custom UI/UX Design", "Advanced SEO", "AI Integration", "3 Months Support"],
      isPopular: true
    },
    {
      id: 3,
      name: "Enterprise",
      price: "$4,999",
      features: ["Complex SaaS Platform", "Cloud Infrastructure", "Custom API Development", "Priority Support", "Lifetime Updates"]
    }
  ];

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "The Future of AI in Web Development",
      date: "Mar 15, 2026",
      category: "Technology",
      image: "https://picsum.photos/seed/tech/800/450",
      content: "Artificial Intelligence is revolutionizing how we build and interact with the web. From automated code generation to personalized user experiences, AI is no longer a futuristic concept but a present reality. In this post, we explore how tools like Gemini and other LLMs are assisting developers in writing cleaner, more efficient code while enabling features that were previously impossible.\n\nKey takeaways:\n- AI-driven development workflows\n- Personalized UI components\n- Real-time data processing with AI"
    },
    {
      id: 2,
      title: "Mastering Tailwind CSS for Modern UI",
      date: "Feb 28, 2026",
      category: "Design",
      image: "https://picsum.photos/seed/design/800/450",
      content: "Tailwind CSS has changed the way we think about styling. By providing a utility-first approach, it allows for rapid prototyping and highly customizable designs without leaving your HTML. This article dives deep into advanced Tailwind techniques, including custom configuration, responsive design patterns, and how to maintain a clean codebase while using utility classes.\n\nTopics covered:\n- Utility-first philosophy\n- Customizing tailwind.config.js\n- Responsive and dark mode strategies"
    },
    {
      id: 3,
      title: "Optimizing React Performance in 2026",
      date: "Jan 12, 2026",
      category: "Development",
      image: "https://picsum.photos/seed/dev/800/450",
      content: "Performance is critical for user retention. As React applications grow in complexity, maintaining a smooth 60fps experience becomes challenging. We discuss the latest optimization techniques in React, including the use of Server Components, efficient state management, and leveraging the latest hooks for fine-grained control over re-renders.\n\nStrategies discussed:\n- React Server Components (RSC)\n- Memoization best practices\n- Code splitting and lazy loading"
    }
  ];

  return (
    <div className="min-h-screen selection:bg-blue-100 selection:text-blue-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-300">
      <Toaster position="top-center" richColors />
      <AnimatePresence>
        {view === 'admin' && user && (
          <AdminDashboard 
            user={user} 
            onLogout={handleLogout} 
            onClose={() => setView('home')} 
          />
        )}
        {selectedProject && (
          <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
          />
        )}
        {selectedBlogPost && (
          <BlogModal 
            post={selectedBlogPost} 
            onClose={() => setSelectedBlogPost(null)} 
          />
        )}
      </AnimatePresence>
      <ScrollProgress />
      <Navbar isDark={isDark} toggleDark={() => setIsDark(!isDark)} />
      
      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 dark:opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* আপনার নতুন ছবি */}
            <div className="mb-10 flex justify-center">
              <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl ring-8 ring-blue-50 dark:ring-blue-900/10">
                <img 
                  src="https://i.ibb.co/hJs0qXv8/photo.png" 
                  alt="MD NOORALAM" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 rounded-full">
              Available for new projects
            </span>
            <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tight mb-8 leading-[0.9]">
              MD <span className="gradient-text">NOORALAM</span> <br />
              Supervisor & Developer.
            </h1>
            
            {/* মনে করে এই নিচের ট্যাগটি চেক করবেন */}
          </motion.div> 
        </div>
      </section>

      <SkillsMarquee />

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center text-blue-600 mb-4">{stat.icon}</div>
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">My Expertise</h2>
              <p className="text-slate-600 dark:text-slate-400">I combine technical skills with creative design to deliver comprehensive solutions for modern web challenges.</p>
            </div>
            <div className="text-blue-600 dark:text-blue-400 font-bold text-sm tracking-widest uppercase">
              What I Do
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Code2 size={32} />, title: "Web Development", desc: "Building scalable, high-performance web applications using modern frameworks." },
              { icon: <Palette size={32} />, title: "UI/UX Design", desc: "Creating intuitive and beautiful user interfaces with a focus on user experience." },
              { icon: <Globe size={32} />, title: "SEO Strategy", desc: "Optimizing your digital presence to reach the right audience effectively." },
              { icon: <Cpu size={32} />, title: "AI Integration", desc: "Leveraging large language models to add intelligent features to your apps." }
            ].map((service, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all"
              >
                <div className="text-blue-600 dark:text-blue-400 mb-6">{service.icon}</div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Selected Projects</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">A collection of some of my favorite work, ranging from complex web apps to creative design experiments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.map((project) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">{project.description}</p>
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm hover:gap-3 transition-all"
                  >
                    View Details <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Timeline Section */}
      <section id="experience" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">My Journey</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">A timeline of my professional experience and the companies I've helped grow.</p>
          </div>
          <Timeline items={timelineItems} />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Service Packages</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Transparent pricing for high-quality digital solutions tailored to your needs.</p>
          </div>
          <Pricing plans={pricingPlans} onSelect={handlePricingSelect} />
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Latest Insights</h2>
              <p className="text-slate-600 dark:text-slate-400">Thoughts on technology, design, and the future of the web.</p>
            </div>
            <a href="#" className="hidden md:flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all">
              View All Posts <ArrowRight size={18} />
            </a>
          </div>
          <Blog posts={blogPosts} onReadMore={setSelectedBlogPost} />
        </div>
      </section>

      <Newsletter />

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Client Stories</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Don't just take my word for it. Here's what some of my amazing clients have to say about our collaboration.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.id} className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative">
                <Star className="text-yellow-400 absolute top-8 right-8" size={20} fill="currentColor" />
                <div className="flex items-center gap-4 mb-6">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800" referrerPolicy="no-referrer" />
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.role} @ {t.company}</div>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic leading-relaxed">"{t.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-blue-600 rounded-[40px] p-8 md:p-20 text-white flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">Let's build something <br /> amazing together.</h2>
              <p className="text-blue-100 text-lg mb-10 max-w-md">Have a project in mind? Or just want to say hi? I'm always open to discussing new ideas and opportunities.</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-blue-200 uppercase tracking-widest font-bold">Email Me</div>
                    <div className="font-semibold">mnalambd09@gmail.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-blue-200 uppercase tracking-widest font-bold">Phone</div>
                    <div className="font-semibold">+82 10-2216-2484</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-[450px] bg-white dark:bg-slate-900 rounded-3xl p-8 text-slate-900 dark:text-slate-100 shadow-2xl">
              <form className="space-y-6" onSubmit={handleContactSubmit}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white" 
                    placeholder="John Doe" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white" 
                    placeholder="john@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Message</label>
                  <textarea 
                    rows={4} 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white" 
                    placeholder="Tell me about your project..."
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-bold font-display tracking-tighter">
            PORT<span className="text-blue-600">FOLIO</span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-sm">
            © 2026 MD NOORALAM. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="https://github.com/mnalambo09" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors"><Github size={20} /></a>
            <a href="https://linkedin.com/in/mnalambo09" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors"><Linkedin size={20} /></a>
            <a href="mailto:mnalambd09@gmail.com" className="text-slate-400 hover:text-blue-600 transition-colors"><Mail size={20} /></a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 flex justify-center">
          <button 
            onClick={user?.email?.toLowerCase() === "mnalambd09@gmail.com" ? () => setView('admin') : handleLogin}
            className="text-[10px] uppercase tracking-widest font-bold text-slate-300 hover:text-blue-600 transition-colors"
          >
            {user?.email?.toLowerCase() === "mnalambd09@gmail.com" ? "Open Dashboard" : "Admin Login"}
          </button>
        </div>
      </footer>

      <AIChat />
      <BackToTop />
    </div>
  );
}
