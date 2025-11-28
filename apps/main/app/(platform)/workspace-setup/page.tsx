"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function WorkspaceSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [email1, setEmail1] = useState("");
  const [email2, setEmail2] = useState("");
  const [email3, setEmail3] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Dataroom Name
  const handleStep1Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        if (workspaceName.trim().length < 3) {
          throw new Error("Dataroom name must be at least 3 characters long");
        }

        if (workspaceName.trim().length > 50) {
          throw new Error("Dataroom name must not exceed 50 characters");
        }

        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(workspaceName)) {
          throw new Error("Dataroom name contains invalid characters");
        }

        // Save to API
        const res = await fetch("/api/platform/onboarding/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: workspaceName.trim() }),
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save dataroom name");
        }

        setCurrentStep(2);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create dataroom. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceName]
  );

  // Step 2: Use Case Selection
  const handleStep2Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch("/api/platform/onboarding/use-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useCase: selectedOption }),
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save use case");
        }

        setCurrentStep(3);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedOption]
  );

  // Navigate to pricing page
  const navigateToPricing = useCallback(() => {
    // Use window.location for reliable navigation
    window.location.href = "/pricing";
  }, []);

  // Step 3: Team Invitations
  const handleStep3Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Prevent double submission
      if (isLoading) return;

      setIsLoading(true);
      setError("");

      try {
        const emails = [email1, email2, email3].filter(
          (email) => email.trim().length > 0
        );

        const res = await fetch("/api/platform/onboarding/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails }),
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send invitations");
        }

        if (emails.length > 0) {
          toast.success("Invitations sent!");
        }

        // Navigate to pricing
        toast.success("Redirecting to pricing...");
        navigateToPricing();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
      // Don't set isLoading to false on success - keep loading during redirect
    },
    [email1, email2, email3, isLoading, navigateToPricing]
  );

  const handleSkip = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Mark team step as skipped
      await fetch("/api/platform/onboarding/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [] }),
        credentials: "include",
      });

      navigateToPricing();
    } catch {
      setIsLoading(false);
      toast.error("Failed to proceed. Please try again.");
    }
  }, [isLoading, navigateToPricing]);

  const options = [
    { value: "investor", label: "Investor" },
    { value: "single-firm", label: "Single Firm" },
  ];

  const progressWidth = `${(currentStep / 3) * 100}%`;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-20">
      {/* Main Container */}
      <div className="flex flex-col w-full sm:w-[412px]">
        {/* Company Logo */}
        <div className="mb-8">
          <Image
            src="/SignupLogo.svg"
            alt="Company Logo"
            width={60}
            height={40}
          />
        </div>

        {/* Steps Container */}
        <div className="min-h-[500px]">
          {/* Step 1: Workspace Name */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2 mb-6">
                <h1 className="text-3xl font-normal text-gray-900">
                  Welcome to Tequity
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Create a secure room for your deal, project, or confidential
                  files.
                </p>
              </div>

              <div className="space-y-5">
                {error && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleStep1Submit(e as React.FormEvent);
                      }
                    }}
                    placeholder="Dataroom Name"
                    className={`w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                      error
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    You can rename this later — no commitments yet.
                  </p>
                </div>

                <Button
                  onClick={handleStep1Submit}
                  disabled={!workspaceName.trim() || isLoading}
                  className="w-full h-11 cursor-pointer bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Setting up..." : "Set up dataroom"}
                </Button>

                <div className="flex items-center justify-center">
                  <div className="w-full max-w-[120px] h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                      style={{ width: progressWidth }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Use Case Selection */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2 mb-6">
                <h1 className="text-3xl font-normal text-gray-900">
                  What brings you to Tequity?
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Help us tailor your experience with the right tools.
                </p>
              </div>

              <div className="space-y-5">
                {error && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-10 px-3 border border-gray-300 rounded-lg hover:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                      >
                        {selectedOption
                          ? options.find((opt) => opt.value === selectedOption)
                              ?.label
                          : "Select"}
                        <ChevronDown
                          className={`ml-2 h-4 w-4 transition-transform ${
                            isOpen ? "transform rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] p-1">
                      {options.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          className="flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                          onSelect={() => {
                            setSelectedOption(option.value);
                            setIsOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          {selectedOption === option.value && (
                            <Check className="h-4 w-4 text-pink-500" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  onClick={handleStep2Submit}
                  disabled={!selectedOption || isLoading}
                  className="w-full h-11 cursor-pointer bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Setting up..." : "Continue"}
                </Button>

                <div className="flex items-center justify-center">
                  <div className="w-full max-w-[120px] h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                      style={{ width: progressWidth }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Team Invitations */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2 mb-6">
                <h1 className="text-3xl font-normal text-gray-900">
                  Invite Your Team
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Add team members to collaborate in your dataroom.
                </p>
              </div>

              <div className="space-y-5">
                {error && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <input
                    type="email"
                    value={email1}
                    onChange={(e) => setEmail1(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                  />
                  <input
                    type="email"
                    value={email2}
                    onChange={(e) => setEmail2(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                  />
                  <input
                    type="email"
                    value={email3}
                    onChange={(e) => setEmail3(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                  />
                </div>

                <Button
                  onClick={handleStep3Submit}
                  disabled={isLoading}
                  className="w-full h-11 cursor-pointer bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending invitations..." : "Send Invites"}
                </Button>

                <Button
                  onClick={handleSkip}
                  variant="link"
                  className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200 cursor-pointer"
                >
                  Skip for now, I&apos;ll invite later
                </Button>

                <div className="flex items-center justify-center">
                  <div className="w-full max-w-[120px] h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                      style={{ width: progressWidth }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
