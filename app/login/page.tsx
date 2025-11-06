"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { signIn, signInWithMagicLink } from "@/actions/auth.actions";

// Validation schemas
const emailPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Email/Password form
  const {
    register: registerEmailPassword,
    handleSubmit: handleSubmitEmailPassword,
    formState: { errors: errorsEmailPassword },
  } = useForm<EmailPasswordFormData>({
    resolver: zodResolver(emailPasswordSchema),
  });

  // Magic Link form
  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: errorsMagicLink },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmitEmailPassword = async (data: EmailPasswordFormData) => {
    setIsLoading(true);

    try {
      const result = await signIn(data.email, data.password);

      if (!result.success) {
        toast.error(result.error || "Failed to sign in");
      }
      // If successful, redirect happens in the server action
    } catch {
      // Error is handled by server action
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitMagicLink = async (data: MagicLinkFormData) => {
    setIsLoading(true);

    try {
      const result = await signInWithMagicLink(data.email);

      if (result.success) {
        setMagicLinkSent(true);
        toast.success("Magic link sent! Check your email.");
      } else {
        toast.error(result.error || "Failed to send magic link");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setShowMagicLink(false)}
            className={`flex-1 py-3 text-sm font-medium ${
              !showMagicLink
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setShowMagicLink(true)}
            className={`flex-1 py-3 text-sm font-medium ${
              showMagicLink
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Forms */}
        <div className="mt-8">
          {!showMagicLink ? (
            // Email/Password Form
            <form
              onSubmit={handleSubmitEmailPassword(onSubmitEmailPassword)}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="email-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  {...registerEmailPassword("email")}
                  id="email-password"
                  type="email"
                  autoComplete="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="you@example.com"
                />
                {errorsEmailPassword.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errorsEmailPassword.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  {...registerEmailPassword("password")}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                />
                {errorsEmailPassword.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errorsEmailPassword.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            // Magic Link Form
            <form
              onSubmit={handleSubmitMagicLink(onSubmitMagicLink)}
              className="space-y-6"
            >
              {!magicLinkSent ? (
                <>
                  <div>
                    <label
                      htmlFor="email-magic"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>
                    <input
                      {...registerMagicLink("email")}
                      id="email-magic"
                      type="email"
                      autoComplete="email"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="you@example.com"
                    />
                    {errorsMagicLink.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errorsMagicLink.email.message}
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    We&apos;ll send you a magic link to sign in without a password.
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Sending..." : "Send magic link"}
                  </button>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Check your email
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          We&apos;ve sent you a magic link. Click the link in the
                          email to sign in.
                        </p>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setMagicLinkSent(false)}
                          className="text-sm font-medium text-green-800 hover:text-green-700"
                        >
                          Resend magic link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
