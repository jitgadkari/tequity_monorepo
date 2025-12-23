"use client";

import { useState, useEffect } from "react";
import { FiCreditCard, FiLoader } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SubscriptionData {
  id: string;
  plan: string;
  planName: string;
  billing: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  price: number;
  features: string[];
}

export function Billings() {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/subscription", {
        credentials: "include",
      });
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  const handleManagePlan = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to open billing portal"
      );
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success("Subscription will be canceled at the end of the billing period");
      setIsCancelDialogOpen(false);
      fetchSubscription(); // Refresh data
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reactivate subscription");
      }

      toast.success("Subscription reactivated successfully");
      fetchSubscription(); // Refresh data
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate subscription"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Canceling
        </span>
      );
    }

    switch (status) {
      case "TRIALING":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Trial
          </span>
        );
      case "ACTIVE":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </span>
        );
      case "PAST_DUE":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Past Due
          </span>
        );
      case "CANCELED":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Canceled
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Billings
        </h2>
      </div>

      {/* Current Plan */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Current Plan
            </p>
            {subscription && getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
          </div>
          {subscription ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
                {subscription.planName} Plan - Billed {subscription.billing} at ${subscription.price}/month
              </p>
              {subscription.status === "TRIALING" && subscription.trialEndsAt && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Trial ends on {formatDate(subscription.trialEndsAt)}
                </p>
              )}
              {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Access until {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {!subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="text-xs text-gray-400">
                  Next billing date: {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              No active subscription
            </p>
          )}
        </div>
        <button
          onClick={handleManagePlan}
          disabled={actionLoading || !subscription}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading ? (
            <FiLoader className="h-4 w-4 animate-spin" />
          ) : (
            "Manage Plan"
          )}
        </button>
      </div>

      {/* Payment Method - Opens Stripe Portal */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Payment method
          </p>
          <div className="flex items-center gap-2">
            <FiCreditCard className="h-4 w-4 text-gray-500" />
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              Manage your payment methods in Stripe
            </p>
          </div>
        </div>
        <button
          onClick={handleManagePlan}
          disabled={actionLoading || !subscription}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update
        </button>
      </div>

      {/* Billing History - Opens Stripe Portal */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Billing history
          </p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            View and download past invoices
          </p>
        </div>
        <button
          onClick={handleManagePlan}
          disabled={actionLoading || !subscription}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View History
        </button>
      </div>

      {/* Cancel/Reactivate Subscription */}
      {subscription && subscription.status !== "CANCELED" && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#27272A]">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
              {subscription.cancelAtPeriodEnd ? "Reactivate subscription" : "Cancel subscription"}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              {subscription.cancelAtPeriodEnd
                ? "Resume your subscription to keep access to premium features"
                : "You will lose access to all premium features at period end"}
            </p>
          </div>
          {subscription.cancelAtPeriodEnd ? (
            <button
              onClick={handleReactivateSubscription}
              disabled={actionLoading}
              className="px-4 py-2 border border-green-600 text-green-600 rounded-md text-sm cursor-pointer hover:bg-green-50 transition-colors dark:border-green-500 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                "Reactivate"
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsCancelDialogOpen(true)}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md text-sm cursor-pointer hover:bg-red-50 transition-colors dark:border-[#27272A] dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Plan
            </button>
          )}
        </div>
      )}

      {/* Cancel Subscription Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="w-[368px] sm:max-w-[425px] z-100 fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] dark:bg-[#09090B] dark:border">
          <DialogHeader className="items-center font-bold">
            <DialogTitle>Cancel Subscription</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-4 dark:text-[#A1A1AA]">
              Are you sure you want to cancel your subscription? You will lose
              access to all premium features at the end of your billing period
              {subscription?.currentPeriodEnd && (
                <> on {formatDate(subscription.currentPeriodEnd)}</>
              )}
              .
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white disabled:opacity-50"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 dark:hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {actionLoading ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel Subscription"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
