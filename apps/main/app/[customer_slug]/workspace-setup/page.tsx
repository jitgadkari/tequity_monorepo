"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

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
import { authFetch } from "@/lib/client-auth";
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
  const [dataroomId, setDataroomId] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const customerSlug = params.customer_slug as string;

  // Step 1 handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setWorkspaceName(e.target.value);
    },
    []
  );

  const handleStep1Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        // Validate workspace name
        if (workspaceName.trim().length < 3) {
          throw new Error("Dataroom name must be at least 3 characters long");
        }

        if (workspaceName.trim().length > 50) {
          throw new Error("Dataroom name must not exceed 50 characters");
        }

        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(workspaceName)) {
          throw new Error("Dataroom name contains invalid characters");
        }

        // Move to step 2 (we'll create dataroom after use case selection)
        localStorage.setItem("dataroomName", workspaceName.trim());
        setCurrentStep(2);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create dataroom. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceName]
  );

  // Step 2 handlers - Create dataroom with use case
  const handleStep2Submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Create dataroom via API
      const response = await authFetch<{ dataroom: { id: string; name: string } }>('/datarooms', {
        method: 'POST',
        body: JSON.stringify({
          name: workspaceName.trim(),
          useCase: selectedOption || null,
        }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create dataroom');
      }

      // Store dataroom ID for invitations
      setDataroomId(response.data?.dataroom.id || null);
      toast.success('Dataroom created successfully!');

      // Move to step 3
      setCurrentStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to create dataroom. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceName, selectedOption]);

  // Step 3 handlers - Send invitations
  const handleStep3Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      try {
        if (!dataroomId) {
          throw new Error('Dataroom not created. Please go back and try again.');
        }

        // Collect valid emails
        const emails = [email1, email2, email3]
          .map(e => e.trim().toLowerCase())
          .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

        if (emails.length === 0) {
          // No emails entered, just navigate to dashboard
          router.push(`/${customerSlug}/Dashboard/Library`);
          return;
        }

        // Send invitations for each email
        let successCount = 0;
        for (const email of emails) {
          const response = await authFetch(`/datarooms/${dataroomId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email, role: 'member' }),
          });

          if (response.success) {
            successCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} invitation(s) sent!`);
        }

        // Navigate to Dashboard
        router.push(`/${customerSlug}/Dashboard/Library`);
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Failed to send invitations. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [router, customerSlug, dataroomId, email1, email2, email3]
  );

  const handleSkip = useCallback(() => {
    // Navigate to Dashboard when skipping
    router.push(`/${customerSlug}/Dashboard/Library`);
  }, [router, customerSlug]);

  const options = [
    { value: "investor", label: "Investor" },
    { value: "single-firm", label: "Single Firm " },
  ];

  const progressWidth = `${(currentStep / 3) * 100}%`;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-20">
      {/* Main Container */}
      <div className="flex flex-col w-full sm:w-[412px]">
        {/* Company Logo - Fixed Position */}
        <div className="mb-8">
          <Image src="/SignupLogo.svg" alt="Company Logo" width={60} height={40} />
        </div>

        {/* Steps Container with Fixed Min Height */}
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
                    onChange={handleInputChange}
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
                <div className="space-y-2">
                  <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && selectedOption) {
                            e.preventDefault();
                            handleStep2Submit(e as React.FormEvent);
                          }
                        }}
                        className="w-full justify-between h-10 px-3 border border-gray-300 rounded-lg hover:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                      >
                        {selectedOption
                          ? options.find((opt) => opt.value === selectedOption)
                              ?.label 
                          : "Select" }
                        <ChevronDown
                          className={`ml-2 h-4 w-4 transition-transform ${
                            isOpen ? "transform rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) p-1">
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
                <div className="space-y-4">
                  <input
                    type="email"
                    value={email1}
                    onChange={(e) => setEmail1(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (email1.trim()) {
                          handleStep3Submit(e as React.FormEvent);
                        }
                      }
                    }}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                  />
                  <input
                    type="email"
                    value={email2}
                    onChange={(e) => setEmail2(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (email2.trim()) {
                          handleStep3Submit(e as React.FormEvent);
                        }
                      }
                    }}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm transition-colors"
                  />
                  <input
                    type="email"
                    value={email3}
                    onChange={(e) => setEmail3(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (email3.trim()) {
                          handleStep3Submit(e as React.FormEvent);
                        }
                      }
                    }}
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
                  Skip for now, I &apos;ll invite later
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
