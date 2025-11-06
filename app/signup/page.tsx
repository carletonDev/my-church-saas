"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signUp, checkSlugAvailability } from "@/actions/auth.actions";
import { slugify } from "@/lib/utils";

// Validation schema
const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    organizationName: z
      .string()
      .min(2, "Organization name must be at least 2 characters"),
    organizationSlug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .regex(
        /^[a-z0-9-]+$/,
        "Slug must only contain lowercase letters, numbers, and hyphens"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const organizationName = watch("organizationName");
  const organizationSlug = watch("organizationSlug");

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName && !organizationSlug) {
      const slug = slugify(organizationName);
      setValue("organizationSlug", slug);
    }
  }, [organizationName, organizationSlug, setValue]);

  // Check slug availability when it changes
  useEffect(() => {
    const checkSlug = async () => {
      if (!organizationSlug || organizationSlug.length < 2) {
        setSlugAvailable(null);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const result = await checkSlugAvailability(organizationSlug);
        if (result.success && result.data) {
          setSlugAvailable(result.data.available);
        }
      } catch {
        // Error checking slug availability
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timeoutId = setTimeout(checkSlug, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [organizationSlug]);

  const onSubmit = async (data: SignUpFormData) => {
    // Final slug availability check
    if (slugAvailable === false) {
      toast.error("Organization slug is not available. Please choose another.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(
        data.email,
        data.password,
        data.name,
        data.organizationName
      );

      if (result.success) {
        toast.success("Account created successfully!");
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to create account");
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Personal Information
              </h3>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                {...register("name")}
                id="name"
                type="text"
                autoComplete="name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
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
                {...register("password")}
                id="password"
                type="password"
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                {...register("confirmPassword")}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Organization Information */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Organization Information
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                You&apos;ll be the owner of this organization.
              </p>
            </div>

            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-medium text-gray-700"
              >
                Organization Name
              </label>
              <input
                {...register("organizationName")}
                id="organizationName"
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="First Baptist Church"
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="organizationSlug"
                className="block text-sm font-medium text-gray-700"
              >
                Organization Slug
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  {process.env.NEXT_PUBLIC_APP_URL || "yoursite.com"}/
                </span>
                <input
                  {...register("organizationSlug")}
                  id="organizationSlug"
                  type="text"
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-none rounded-r-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="first-baptist-church"
                />
              </div>
              {errors.organizationSlug && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.organizationSlug.message}
                </p>
              )}
              {isCheckingSlug && (
                <p className="mt-1 text-sm text-gray-500">
                  Checking availability...
                </p>
              )}
              {!isCheckingSlug && slugAvailable === true && organizationSlug && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Slug is available
                </p>
              )}
              {!isCheckingSlug && slugAvailable === false && (
                <p className="mt-1 text-sm text-red-600">
                  ✗ Slug is not available
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || slugAvailable === false}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
