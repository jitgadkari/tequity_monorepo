"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import { PricingHeader } from "./components/PricingHeader";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export default function PricingPage() {
  const [billingType, setBillingType] = useState("yearly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectPlan = async (planName: string) => {
    setSelectedPlan(planName);
    setLoadingPlan(planName);

    try {
      // TODO: Replace with actual API call to save selected plan
      // const response = await fetch('/api/subscription/select', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ plan: planName, billing: billingType }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Navigate to Dashboard
      router.push("/Dashboard/Library");
    } catch (error) {
      console.error("Error selecting plan:", error);
      setLoadingPlan(null);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-white py-6 overflow-hidden">
      {/* Main Container - Responsive width */}
      <div className="max-w-[1280px] min-h-[947.6px] mx-auto flex items-left justify-center py-8">
        {/* Form Container */}
        <div className="w-full max-w-[1000px] min-h-[755.6px] flex flex-col items-center gap-7">
          {/* Header Section - Left Aligned */}
          <div className="w-full max-w-[1000px] flex flex-col items-start gap-6 px-4 sm:px-6 lg:px-8">
            {/* Main Heading and Subheading */}
            <PricingHeader
              plusJakartaSansClass={plusJakartaSans.className}
              instrumentSerifClass={instrumentSerif.className}
            />

            {/* Billing Toggle */}
            <div className="flex items-center gap-1">
              <div className="relative inline-flex items-center bg-white p-1 rounded-full border border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setBillingType("monthly")}
                    className={`relative px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                      billingType === "monthly"
                        ? "bg-black text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingType("yearly")}
                    className={`relative px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                      billingType === "yearly"
                        ? "bg-black text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <span className="px-2 py-2 text-[#71717A] text-xs font-semibold rounded-full sm:whitespace-nowrap text-left">
                <span className="text-blue-500">Save 33%</span> on a<br className="sm:hidden" /> yearly subscription
              </span>
            </div>
          </div>

          {/* Pricing Cards Section */}
          <div className="w-full min-h-[566px] flex gap-5 justify-start xl:justify-center overflow-x-auto overflow-y-visible xl:overflow-x-visible scrollbar-hide snap-x snap-mandatory xl:flex-row items-start pb-4 pt-5 px-4 sm:px-6 lg:px-8">
            {/* Starter Plan Card */}
            <div className="w-[320px] min-w-[300px] flex-shrink-0 border-2 snap-center bg-white border-[#E4E4E7]"
            style={{ borderRadius: '24px' }}
            >
              <div className="w-[320px] flex flex-col items-start" style={{ padding: '24px 16px 16px', gap: '24px' }}>
                {/* Card Header */}
                <div className="w-[211px] flex flex-col items-start" style={{ padding: '0px 8px', gap: '24px' }}>
                  <div className="flex flex-col items-start" style={{ padding: '0px', gap: '2px' }}>
                    <h3 className={plusJakartaSans.className} style={{
                      fontWeight: 500,
                      fontSize: '20px',
                      lineHeight: '32px',
                      color: '#09090B'
                    }}>
                      Starter
                    </h3>
                    <p style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#71717A'
                    }}>
                      Best for early-stage startups.
                    </p>
                  </div>

                  <div className="flex items-end" style={{ gap: '4px' }}>
                    <span className={plusJakartaSans.className} style={{
                      fontWeight: 500,
                      fontSize: '40px',
                      lineHeight: '44px',
                      color: '#09090B'
                    }}>
                      ${billingType === "yearly" ? "12" : "15"}
                    </span>
                    <div className="flex flex-col" style={{ gap: '0px' }}>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>per month</span>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>billed yearly</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan("Starter");
                  }}
                  disabled={loadingPlan !== null && loadingPlan !== "Starter"}
                  className={`w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer ${
                    selectedPlan === "Starter" ? "hover:opacity-80" : "hover:bg-[#F4F4F5]"
                  }`}
                  style={{
                    height: '44px',
                    background: selectedPlan === "Starter" ? '#09090B' : 'white',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.006em',
                    color: selectedPlan === "Starter" ? '#FFFFFF' : '#09090B'
                  }}
                >
                  {loadingPlan === "Starter" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting trial...
                    </span>
                  ) : (
                    "Start 30 days free trial"
                  )}
                </Button>

                {/* Features List */}
                <div className="flex flex-col items-start" style={{ padding: '0px 16px 16px 8px', gap: '20px', width: '288px' }}>
                  {/* Feature items */}
                  {[
                    "3 Paid Users",
                    "200 Total Users",
                    "1 TB Cloud Storage",
                    "AI data room setup from file dump",
                    "Auto-organization of up to 50 documents",
                    "Basic investor access (view-only)",
                    "Limited activity tracking (500 views)",
                    "Email support",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start" style={{ gap: '8px', width: '264px' }}>
                      <div style={{ width: '18px', height: '18px' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="truncate" style={{
                        fontFamily: 'Inter',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '100%',
                        letterSpacing: '-0.006em',
                        color: '#09090B',
                        flex: 1
                      }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Professional Plan Card - Highlighted */}
            <div className="w-[320px] min-w-[300px] flex-shrink-0 border-2 snap-center relative bg-[#F4F4F5] border-[#E4E4E7]"
            style={{ borderRadius: '24px' }}
            >
              <div className="w-[320px] flex flex-col items-start" style={{ padding: '24px 16px 16px', gap: '24px' }}>
                {/* Card Header */}
                <div className="w-[223px] flex flex-col items-start" style={{ padding: '0px 8px', gap: '24px' }}>
                  <div className="flex flex-col items-start" style={{ padding: '0px', gap: '2px' }}>
                    <div className="flex items-center" style={{ gap: '12px' }}>
                      <h3 className={plusJakartaSans.className} style={{
                        fontWeight: 500,
                        fontSize: '20px',
                        lineHeight: '32px',
                        color: '#09090B'
                      }}>
                        Professional
                      </h3>
                      <div className="flex justify-center items-center" style={{
                        padding: '5px 10px',
                        background: '#007AFF',
                        boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
                        borderRadius: '5.1px'
                      }}>
                        <span style={{
                          fontFamily: 'Inter',
                          fontWeight: 700,
                          fontSize: '12px',
                          lineHeight: '16px',
                          textAlign: 'center',
                          letterSpacing: '-0.006em',
                          color: '#FFFFFF'
                        }}>Popular</span>
                      </div>
                    </div>
                    <p style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#71717A',
                      whiteSpace: 'nowrap'
                    }}>
                      For large teams & corporations.
                    </p>
                  </div>

                  <div className="flex items-end" style={{ gap: '4px' }}>
                    <span className={plusJakartaSans.className} style={{
                      fontWeight: 500,
                      fontSize: '40px',
                      lineHeight: '44px',
                      color: '#09090B'
                    }}>
                      ${billingType === "yearly" ? "25" : "30"}
                    </span>
                    <div className="flex flex-col" style={{ gap: '0px' }}>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>per month</span>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>billed yearly</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan("Professional");
                  }}
                  disabled={loadingPlan !== null && loadingPlan !== "Professional"}
                  className="w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-80 cursor-pointer"
                  style={{
                    height: '44px',
                    background: '#09090B',
                    borderRadius: '6px',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.006em',
                    color: '#FFFFFF'
                  }}
                >
                  {loadingPlan === "Professional" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting trial...
                    </span>
                  ) : (
                    "Start 30 days free trial"
                  )}
                </Button>

                {/* Features List */}
                <div className="flex flex-col items-start" style={{ padding: '0px 16px 16px 8px', gap: '20px', width: '288px' }}>
                  {/* Feature items */}
                  {[
                    "10 Paid Users",
                    "1,000 Total Users",
                    "Unlimited Cloud Storage",
                    "Up to 3 active deal rooms",
                    "Full AI-powered Q&A + search",
                    "Custom document requests & fulfillment",
                    "Advanced activity tracking",
                    "Slack/CRM integrations",
                    "Email support",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start" style={{ gap: '8px', width: '264px' }}>
                      <div style={{ width: '18px', height: '18px' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="truncate" style={{
                        fontFamily: 'Inter',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '100%',
                        letterSpacing: '-0.006em',
                        color: '#09090B',
                        flex: 1
                      }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enterprise Plan Card */}
            <div className="w-[320px] min-w-[300px] flex-shrink-0 border-2 snap-center bg-white border-[#E4E4E7]"
            style={{ borderRadius: '24px' }}
            >
              <div className="w-[320px] flex flex-col items-start" style={{ padding: '24px 16px 16px', gap: '24px' }}>
                {/* Card Header */}
                <div className="w-[187px] flex flex-col items-start" style={{ padding: '0px 8px', gap: '24px' }}>
                  <div className="flex flex-col items-start" style={{ padding: '0px', gap: '2px' }}>
                    <h3 className={plusJakartaSans.className} style={{
                      fontWeight: 500,
                      fontSize: '20px',
                      lineHeight: '32px',
                      color: '#09090B'
                    }}>
                      Enterprise
                    </h3>
                    <p style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#71717A',
                      whiteSpace: 'nowrap'
                    }}>
                      Best for business owners.
                    </p>
                  </div>

                  <div className="flex items-end" style={{ gap: '4px' }}>
                    <span className={plusJakartaSans.className} style={{
                      fontWeight: 500,
                      fontSize: '40px',
                      lineHeight: '44px',
                      color: '#09090B'
                    }}>
                      ${billingType === "yearly" ? "59" : "70"}
                    </span>
                    <div className="flex flex-col" style={{ gap: '0px' }}>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>per month</span>
                      <span style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '10px',
                        lineHeight: '14px',
                        letterSpacing: '-0.006em',
                        color: '#71717A'
                      }}>billed yearly</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan("Enterprise");
                  }}
                  disabled={loadingPlan !== null && loadingPlan !== "Enterprise"}
                  className={`w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer ${
                    selectedPlan === "Enterprise" ? "hover:opacity-80" : "hover:bg-[#F4F4F5]"
                  }`}
                  style={{
                    height: '44px',
                    background: selectedPlan === "Enterprise" ? '#09090B' : 'white',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.006em',
                    color: selectedPlan === "Enterprise" ? '#FFFFFF' : '#09090B'
                  }}
                >
                  {loadingPlan === "Enterprise" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting trial...
                    </span>
                  ) : (
                    "Start 30 days free trial"
                  )}
                </Button>

                {/* Features List */}
                <div className="flex flex-col items-start" style={{ padding: '0px 16px 16px 8px', gap: '20px', width: '288px' }}>
                  {/* Feature items */}
                  {[
                    "20 Paid Users",
                    "Unlimited Users",
                    "Unlimited Cloud Storage",
                    "Everything in Professional",
                    "Unlimited deal rooms",
                    "Multi-user teams + role-based permissions",
                    "Audit logs & download tracking",
                    "Priority support",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start" style={{ gap: '8px', width: '264px' }}>
                      <div style={{ width: '18px', height: '18px' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="truncate" style={{
                        fontFamily: 'Inter',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '100%',
                        letterSpacing: '-0.006em',
                        color: '#09090B',
                        flex: 1
                      }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
