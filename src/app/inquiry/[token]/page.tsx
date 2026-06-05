"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

interface Thread {
  id: string;
  message: string;
  subject: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface InquiryData {
  name: string;
  email: string;
  businessType: string;
  businessName: string | null;
  status: string;
  createdAt: string;
  threads: Thread[];
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-yellow-100 text-yellow-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  QUALIFIED: "bg-purple-100 text-purple-800",
  PROPOSAL_SENT: "bg-indigo-100 text-indigo-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  ON_HOLD: "bg-gray-100 text-gray-800",
};

export default function CustomerPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [inquiry, setInquiry] = useState<InquiryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInquiry();
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [inquiry?.threads]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchInquiry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/public/launchpad-portal/${token}`);
      const data = await response.json();

      if (data.ok) {
        setInquiry(data.data);
      } else {
        setError(data.error || "Inquiry not found");
      }
    } catch {
      setError("Failed to load inquiry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      setIsSending(true);
      setSendSuccess(false);
      const response = await fetch(`/api/public/launchpad-portal/${token}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await response.json();

      if (data.ok) {
        setReplyMessage("");
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
        // Append message to thread locally for instant feedback
        if (inquiry) {
          setInquiry({
            ...inquiry,
            threads: [...inquiry.threads, data.data],
          });
        }
      } else {
        alert(data.error || "Failed to send reply");
      }
    } catch {
      alert("Failed to send reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading your inquiry...</p>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Inquiry Not Found</h2>
          <p className="text-gray-600 mb-6">
            This link may be invalid or expired. Please check your email for the correct link.
          </p>
          <a
            href="/launchpad"
            className="inline-block px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Visit Launch Pad
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Your Inquiry Portal</h1>
              <p className="text-xs text-gray-500">Kitchen Network International</p>
            </div>
          </div>
          <a
            href="/launchpad"
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Visit KNI
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Inquiry Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{inquiry.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {inquiry.businessType.replace(/_/g, " ")}
                {inquiry.businessName && ` — ${inquiry.businessName}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Submitted {formatDate(inquiry.createdAt)}
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inquiry.status] || "bg-gray-100 text-gray-800"}`}>
              {inquiry.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold text-gray-900">Conversation</h3>
            <p className="text-xs text-gray-500 mt-1">Messages between you and the KNI team</p>
          </div>

          {/* Messages */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
            {inquiry.threads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm mt-1">The KNI team will contact you soon.</p>
              </div>
            ) : (
              inquiry.threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`flex ${thread.isAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      thread.isAdmin
                        ? "bg-gray-100 text-gray-900 rounded-tl-md"
                        : "bg-red-500 text-white rounded-tr-md"
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${thread.isAdmin ? "text-gray-500" : "text-red-100"}`}>
                      {thread.isAdmin ? "KNI Team" : "You"}
                    </p>
                    {thread.subject && (
                      <p className={`text-xs font-medium mb-1 ${thread.isAdmin ? "text-gray-500" : "text-red-200"}`}>
                        Re: {thread.subject}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{thread.message}</p>
                    <p className={`text-xs mt-2 ${thread.isAdmin ? "text-gray-400" : "text-red-200"}`}>
                      {formatDate(thread.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          <div className="border-t p-4">
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 border rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                  {replyMessage.length}/2000
                </span>
              </div>
              <div className="flex items-center justify-between">
                {sendSuccess && (
                  <p className="text-sm text-green-600 font-medium">Reply sent successfully!</p>
                )}
                {!sendSuccess && <div />}
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyMessage.trim()}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a href="/launchpad" className="text-red-500 hover:text-red-600">
            Kitchen Network International
          </a>
        </p>
      </footer>
    </div>
  );
}
