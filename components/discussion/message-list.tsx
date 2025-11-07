"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageItem } from "./message-item";
import type { MessageWithAuthor } from "@/types";

interface MessageListProps {
  discussionId: string;
  initialMessages: MessageWithAuthor[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MessageList({
  discussionId,
  initialMessages,
  currentUserId,
  isAdmin,
}: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auto-scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`discussion:${discussionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussionId}`,
        },
        async (payload) => {
          console.log("New message received:", payload);

          // Fetch the complete message with author data
          const { data: newMessage, error } = await supabase
            .from("messages")
            .select(`
              *,
              author:users!messages_author_id_fkey(id, name, email, role),
              discussion:discussions!messages_discussion_id_fkey(id, title)
            `)
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Error fetching new message:", error);
            return;
          }

          if (newMessage && !(newMessage as Record<string, unknown>).is_deleted) {
            const typedMessage = newMessage as unknown as MessageWithAuthor;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === typedMessage.id)) {
                return prev;
              }
              return [...prev, typedMessage];
            });
            // Auto-scroll on new message
            setTimeout(() => scrollToBottom(), 100);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussionId}`,
        },
        async (payload) => {
          console.log("Message updated:", payload);

          // Fetch the updated message with author data
          const { data: updatedMessage, error } = await supabase
            .from("messages")
            .select(`
              *,
              author:users!messages_author_id_fkey(id, name, email, role),
              discussion:discussions!messages_discussion_id_fkey(id, title)
            `)
            .eq("id", payload.new.id)
            .single();

          if (error) {
            console.error("Error fetching updated message:", error);
            return;
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (updatedMessage as unknown as MessageWithAuthor) : msg
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `discussion_id=eq.${discussionId}`,
        },
        (payload) => {
          console.log("Message deleted:", payload);
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [discussionId, supabase]);


  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <svg
          className="h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No messages yet
        </h3>
        <p className="text-sm text-gray-500">
          Be the first to start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-6 space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
