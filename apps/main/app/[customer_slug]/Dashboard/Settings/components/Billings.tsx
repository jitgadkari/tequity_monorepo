"use client";

import { useState, useEffect } from "react";
import { FiCreditCard, FiExternalLink, FiDownload, FiAlertCircle, FiLoader } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Subscription {
  id: string;
  plan: string;
  planName: string;
  billing: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
  limits: Record<string, unknown>;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  date: string | null;
  paidAt: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

interface SubscriptionData {
  subscription: Subscription;
  tenant: { id: string; name: string; slug: string };
  upcomingInvoice: { amount: number; currency: string; dueDate: string | null } | null;
}

export function Billings() {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isInvoicesDialogOpen, setIsInvoicesDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Fetch subscription data
  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform/subscriptions', {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch subscription');
      }

      const data = await res.json();
      setSubscriptionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const res = await fetch('/api/platform/subscriptions/invoices', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch('/api/platform/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to open billing portal');
      }

      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const res = await fetch('/api/platform/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }), // Cancel at period end
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setIsCancelDialogOpen(false);
      // Refresh subscription data
      await fetchSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setCancelling(true);
      const res = await fetch('/api/platform/subscriptions/cancel', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resume subscription');
      }

      // Refresh subscription data
      await fetchSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setCancelling(false);
    }
  };

  const openInvoicesDialog = () => {
    setIsInvoicesDialogOpen(true);
    fetchInvoices();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      unpaid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Billings</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <FiLoader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !subscriptionData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Billings</h2>
        </div>
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
          <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const subscription = subscriptionData?.subscription;
  const isTrialing = subscription?.status === 'trialing';
  const isCancelled = subscription?.status === 'canceled';
  const willCancel = subscription?.cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Billings
        </h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
          <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Trial/Cancellation Notice */}
      {isTrialing && subscription?.trialEndsAt && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Free trial active
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your trial ends on {formatDate(subscription.trialEndsAt)}.
                You won't be charged until then.
              </p>
            </div>
          </div>
        </div>
      )}

      {willCancel && !isCancelled && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Subscription scheduled to cancel
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your subscription will end on {formatDate(subscription?.currentPeriodEnd || null)}.
                </p>
              </div>
            </div>
            <button
              onClick={handleResumeSubscription}
              disabled={cancelling}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {cancelling ? 'Resuming...' : 'Resume'}
            </button>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Current Plan
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              {subscription?.planName || subscription?.plan || 'No plan'} Plan
              {subscription?.billing && ` - Billed ${subscription.billing}`}
            </p>
            {subscription?.status && getStatusBadge(subscription.status)}
          </div>
          {subscription?.currentPeriodEnd && !isCancelled && (
            <p className="text-xs text-gray-400 mt-1">
              {willCancel ? 'Ends' : 'Renews'} on {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}
        </div>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A] disabled:opacity-50 flex items-center gap-2"
        >
          {portalLoading ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Manage Plan
              <FiExternalLink className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Payment Method */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
            Payment method
          </p>
          <div className="flex items-center gap-2">
            <FiCreditCard className="h-4 w-4 text-gray-500" />
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              Manage payment methods in the billing portal
            </p>
          </div>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A] cursor-pointer disabled:opacity-50"
        >
          Update
        </button>
      </div>

      {/* Upcoming Invoice */}
      {subscriptionData?.upcomingInvoice && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
              Next invoice
            </p>
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              ${subscriptionData.upcomingInvoice.amount.toFixed(2)} {subscriptionData.upcomingInvoice.currency.toUpperCase()}
              {subscriptionData.upcomingInvoice.dueDate &&
                ` due ${formatDate(subscriptionData.upcomingInvoice.dueDate)}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Billing History */}
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
          onClick={openInvoicesDialog}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors dark:border-[#27272A] dark:bg-[#27272A]"
        >
          View History
        </button>
      </div>

      {/* Cancel Subscription */}
      {subscription?.status !== 'canceled' && !willCancel && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#27272A]">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 dark:text-white">
              Cancel subscription
            </p>
            <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
              You will lose access to all premium features at period end
            </p>
          </div>
          <button
            onClick={() => setIsCancelDialogOpen(true)}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-md text-sm cursor-pointer hover:bg-red-50 transition-colors dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Cancel Plan
          </button>
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
              {subscription?.currentPeriodEnd &&
                ` (${formatDate(subscription.currentPeriodEnd)})`
              }.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelling}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-[#27272A] dark:hover:text-white transition-colors dark:border-[#27272A] dark:text-white disabled:opacity-50"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 dark:hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cancelling ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoices Dialog */}
      <Dialog open={isInvoicesDialogOpen} onOpenChange={setIsInvoicesDialogOpen}>
        <DialogContent className="w-full max-w-lg z-100 fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] dark:bg-[#09090B] dark:border">
          <DialogHeader>
            <DialogTitle>Billing History</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-96 overflow-y-auto">
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <FiLoader className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No invoices yet
              </p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#27272A] rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.number || 'Invoice'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
                        {formatDate(invoice.date)} - ${invoice.amount.toFixed(2)} {invoice.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {invoice.status || 'Unknown'}
                      </span>
                      {invoice.invoicePdf && (
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 dark:hover:bg-[#3f3f46] rounded-md transition-colors"
                          title="Download PDF"
                        >
                          <FiDownload className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </a>
                      )}
                      {invoice.hostedInvoiceUrl && (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 dark:hover:bg-[#3f3f46] rounded-md transition-colors"
                          title="View Invoice"
                        >
                          <FiExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
