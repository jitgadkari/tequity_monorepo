"use client";

import { useState, useEffect, useRef } from "react";
import { Save, X, Edit2, Trash2, Plus, Building2, FileText, CheckCircle, AlertCircle, Copy } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";

interface CustomerPrompt {
  id: string;
  customerSlug: string;
  promptIdentifier: string;
  promptName: string;
  promptType: string;
  promptText: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
}

type TabType = 'defaults' | 'customers';

export default function CustomerPromptsPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('defaults');
  const formRef = useRef<HTMLDivElement>(null);

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerSlug, setSelectedCustomerSlug] = useState<string>("");

  // Prompts
  const [allPrompts, setAllPrompts] = useState<CustomerPrompt[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<CustomerPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomerPrompt | null>(null);
  const [defaultPromptForComparison, setDefaultPromptForComparison] = useState<CustomerPrompt | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customer_slug: "default",
    prompt_name: "",
    prompt_type: "decoding",
    prompt_text: "",
    description: "",
    is_active: true,
  });

  const promptTypes = [
    { value: 'decoding', label: 'Decoding', color: 'blue' },
    { value: 'validating', label: 'Validating', color: 'green' },
    { value: 'extracting', label: 'Extracting', color: 'purple' },
    { value: 'generating', label: 'Generating', color: 'orange' },
    { value: 'bifurcation', label: 'Bifurcation', color: 'pink' },
    { value: 'custom', label: 'Custom', color: 'gray' },
  ];

  useEffect(() => {
    fetchCustomers();
    fetchPrompts();
  }, []);

  useEffect(() => {
    // Separate default prompts
    const defaults = allPrompts.filter(p => p.customerSlug === 'default');
    setDefaultPrompts(defaults);
  }, [allPrompts]);

  useEffect(() => {
    // Close modal on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showForm]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      const data = await response.json();
      if (data.customers) {
        setCustomers(data.customers);
        if (data.customers.length > 0) {
          setSelectedCustomerSlug(data.customers[0].slug);
        }
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/customer-prompts");
      const data = await response.json();
      if (data.success) {
        setAllPrompts(data.prompts || []);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/customer-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Prompt saved successfully!");
        setShowForm(false);
        resetForm();
        fetchPrompts();
      } else {
        alert(data.message || data.error || "Failed to save prompt");
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("Failed to save prompt");
    }
  };

  const handleEdit = (prompt: CustomerPrompt, isCustomerView: boolean = false) => {
    setFormData({
      customer_slug: prompt.customerSlug,
      prompt_name: prompt.promptName,
      prompt_type: prompt.promptType,
      prompt_text: prompt.promptText,
      description: prompt.description || "",
      is_active: prompt.isActive,
    });
    setEditingPrompt(prompt);

    // If editing from customer view, load default for comparison
    if (isCustomerView && prompt.customerSlug !== 'default') {
      const defaultPrompt = defaultPrompts.find(
        p => p.promptIdentifier === prompt.promptIdentifier
      );
      setDefaultPromptForComparison(defaultPrompt || null);
    }

    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      const response = await fetch(`/api/customer-prompts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Prompt deleted successfully!");
        fetchPrompts();
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      alert("Failed to delete prompt");
    }
  };

  const handleAddDefaultPrompt = () => {
    setFormData({
      customer_slug: "default",
      prompt_name: "",
      prompt_type: "decoding",
      prompt_text: "",
      description: "",
      is_active: true,
    });
    setEditingPrompt(null);
    setDefaultPromptForComparison(null);
    setShowForm(true);
  };

  const handleCustomizePrompt = (defaultPrompt: CustomerPrompt) => {
    console.log('Customizing prompt:', defaultPrompt.promptName, 'for customer:', selectedCustomerSlug);
    setFormData({
      customer_slug: selectedCustomerSlug,
      prompt_name: defaultPrompt.promptName,
      prompt_type: defaultPrompt.promptType,
      prompt_text: defaultPrompt.promptText, // Pre-fill with default
      description: `Customized from default: ${defaultPrompt.promptName}`,
      is_active: true,
    });
    setEditingPrompt(null);
    setDefaultPromptForComparison(defaultPrompt);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      customer_slug: activeTab === 'defaults' ? 'default' : selectedCustomerSlug,
      prompt_name: "",
      prompt_type: "decoding",
      prompt_text: "",
      description: "",
      is_active: true,
    });
    setEditingPrompt(null);
    setDefaultPromptForComparison(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  const getPromptsByType = (type: string, customerSlug: string = 'default') => {
    return allPrompts.filter(
      p => p.promptType === type && p.customerSlug === customerSlug
    );
  };

  const hasCustomPrompt = (defaultPrompt: CustomerPrompt, customerSlug: string) => {
    return allPrompts.some(
      p => p.promptIdentifier === defaultPrompt.promptIdentifier && p.customerSlug === customerSlug
    );
  };

  const getCustomPrompt = (defaultPrompt: CustomerPrompt, customerSlug: string) => {
    return allPrompts.find(
      p => p.promptIdentifier === defaultPrompt.promptIdentifier && p.customerSlug === customerSlug
    );
  };

  const getPromptTypeColor = (type: string) => {
    const typeObj = promptTypes.find(t => t.value === type);
    return typeObj?.color || 'gray';
  };

  const selectedCustomer = customers.find(c => c.slug === selectedCustomerSlug);

  return (
    <div className={`flex min-h-screen ${isLight ? "bg-gray-50" : "bg-zinc-950"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-x-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className={`text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                Customer Prompts Management
              </h1>
              <p className={`mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Configure AI prompts for each customer application
              </p>
            </div>

            {/* Tabs */}
            <div className={`border-b mb-6 ${isLight ? "border-gray-200" : "border-gray-700"}`}>
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('defaults')}
                  className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                    activeTab === 'defaults'
                      ? isLight
                        ? "text-blue-600"
                        : "text-blue-400"
                      : isLight
                      ? "text-gray-500 hover:text-gray-700"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Default Prompts Library
                  {activeTab === 'defaults' && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      isLight ? "bg-blue-600" : "bg-blue-400"
                    }`} />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                    activeTab === 'customers'
                      ? isLight
                        ? "text-blue-600"
                        : "text-blue-400"
                      : isLight
                      ? "text-gray-500 hover:text-gray-700"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Customer Prompts
                  {activeTab === 'customers' && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      isLight ? "bg-blue-600" : "bg-blue-400"
                    }`} />
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Form Modal */}
            {showForm && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
                onClick={handleCancel}
              >
                <div
                  ref={formRef}
                  className={`${isLight ? "bg-white" : "bg-gray-800"} rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`sticky top-0 ${isLight ? "bg-white" : "bg-gray-800"} border-b ${isLight ? "border-gray-200" : "border-gray-700"} px-6 py-4 flex items-center justify-between`}>
                    <h2 className={`text-xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                      {editingPrompt ? "Edit Prompt" : "Add New Prompt"}
                      {formData.customer_slug !== 'default' && ` - ${selectedCustomer?.name || formData.customer_slug}`}
                    </h2>
                    <button
                      onClick={handleCancel}
                      className={`p-2 rounded-lg transition-colors ${
                        isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                  <div className={defaultPromptForComparison ? "grid grid-cols-2 gap-6" : ""}>
                    {/* Left side - Form */}
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Prompt Name *
                        </label>
                        <input
                          type="text"
                          value={formData.prompt_name}
                          onChange={(e) => setFormData({ ...formData, prompt_name: e.target.value })}
                          required
                          placeholder="e.g., Vendor Message Decode"
                          className={`w-full border rounded-lg px-3 py-2 ${
                            isLight
                              ? "border-gray-300 bg-white text-gray-900"
                              : "border-gray-600 bg-gray-700 text-white"
                          }`}
                        />
                        <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          This will create identifier: {formData.prompt_type}:{formData.prompt_name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-')}
                        </p>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Prompt Type *
                        </label>
                        <select
                          value={formData.prompt_type}
                          onChange={(e) => setFormData({ ...formData, prompt_type: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2 ${
                            isLight
                              ? "border-gray-300 bg-white text-gray-900"
                              : "border-gray-600 bg-gray-700 text-white"
                          }`}
                        >
                          {promptTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Prompt Text *
                        </label>
                        <textarea
                          value={formData.prompt_text}
                          onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                          required
                          rows={defaultPromptForComparison ? 15 : 10}
                          placeholder="Enter the AI prompt... Use {extracted_text} placeholder"
                          className={`w-full border rounded-lg px-3 py-2 font-mono text-sm ${
                            isLight
                              ? "border-gray-300 bg-white text-gray-900"
                              : "border-gray-600 bg-gray-700 text-white"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          placeholder="Optional description"
                          className={`w-full border rounded-lg px-3 py-2 ${
                            isLight
                              ? "border-gray-300 bg-white text-gray-900"
                              : "border-gray-600 bg-gray-700 text-white"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="is_active" className={`text-sm font-medium ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Active
                        </label>
                      </div>
                    </div>

                    {/* Right side - Default Comparison */}
                    {defaultPromptForComparison && (
                      <div className={`border-l pl-6 ${isLight ? "border-gray-200" : "border-gray-700"}`}>
                        <h3 className={`text-sm font-medium mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                          Default Prompt (for comparison)
                        </h3>
                        <div className={`${isLight ? "bg-gray-50" : "bg-gray-900"} rounded-lg p-4 mb-3`}>
                          <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                            {defaultPromptForComparison.promptName}
                          </p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            {defaultPromptForComparison.promptIdentifier}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                            Default Prompt Text
                          </label>
                          <textarea
                            value={defaultPromptForComparison.promptText}
                            readOnly
                            rows={15}
                            className={`w-full border rounded-lg px-3 py-2 font-mono text-sm ${
                              isLight
                                ? "border-gray-300 bg-gray-100 text-gray-700"
                                : "border-gray-600 bg-gray-900 text-gray-300"
                            }`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, prompt_text: defaultPromptForComparison.promptText })}
                          className={`mt-2 text-sm flex items-center gap-1 ${
                            isLight ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                          Copy default text
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`flex gap-2 pt-4 sticky bottom-0 ${isLight ? "bg-white" : "bg-gray-800"} border-t ${isLight ? "border-gray-200" : "border-gray-700"} -mx-6 px-6 py-4 mt-6`}>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Prompt
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                        isLight
                          ? "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </form>
                </div>
              </div>
            )}

            {/* Default Prompts Tab Content */}
            {activeTab === 'defaults' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                    Manage default prompts that will be available to all customers
                  </p>
                  <button
                    onClick={handleAddDefaultPrompt}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Default Prompt
                  </button>
                </div>

                {promptTypes.map(type => {
                  const typePrompts = getPromptsByType(type.value, 'default');

                  return (
                    <div key={type.value} className={`${isLight ? "bg-white" : "bg-gray-800"} shadow rounded-lg mb-4 overflow-hidden`}>
                      <div className={`px-6 py-3 ${isLight ? "bg-gray-50" : "bg-gray-700"} flex items-center justify-between`}>
                        <h3 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                          {type.label}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          isLight ? "bg-gray-200 text-gray-700" : "bg-gray-600 text-gray-300"
                        }`}>
                          {typePrompts.length} prompt{typePrompts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {typePrompts.length > 0 ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {typePrompts.map(prompt => (
                            <div key={prompt.id} className={`px-6 py-4 flex items-center justify-between ${
                              isLight ? "hover:bg-gray-50" : "hover:bg-gray-700"
                            }`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                                    {prompt.promptName}
                                  </p>
                                </div>
                                <p className={`text-xs mt-1 font-mono ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                  {prompt.promptIdentifier}
                                </p>
                                {prompt.description && (
                                  <p className={`text-sm mt-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                                    {prompt.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(prompt)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(prompt.id)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1 text-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`px-6 py-8 text-center ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No default prompts for {type.label} yet</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customer Prompts Tab Content */}
            {activeTab === 'customers' && (
              <div>
                {/* Customer Selection */}
                <div className={`${isLight ? "bg-white" : "bg-gray-800"} shadow rounded-lg p-6 mb-6`}>
                  <div className="flex items-center gap-4">
                    <Building2 className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-gray-400"}`} />
                    <div className="flex-1">
                      <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                        Select Customer
                      </label>
                      <select
                        value={selectedCustomerSlug}
                        onChange={(e) => setSelectedCustomerSlug(e.target.value)}
                        className={`w-full md:w-96 border rounded-lg px-4 py-2.5 ${
                          isLight
                            ? "border-gray-300 bg-white text-gray-900"
                            : "border-gray-600 bg-gray-700 text-white"
                        }`}
                      >
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.slug}>
                            {customer.name} ({customer.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {selectedCustomerSlug && (
                  <>
                    <p className={`text-sm mb-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                      Showing prompts for <strong>{selectedCustomer?.name}</strong>.
                      🔵 = Using Default | 🟢 = Customized
                    </p>

                    {promptTypes.map(type => {
                      const defaultTypePrompts = getPromptsByType(type.value, 'default');

                      return (
                        <div key={type.value} className={`${isLight ? "bg-white" : "bg-gray-800"} shadow rounded-lg mb-4 overflow-hidden`}>
                          <div className={`px-6 py-3 ${isLight ? "bg-gray-50" : "bg-gray-700"} flex items-center justify-between`}>
                            <h3 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                              {type.label}
                            </h3>
                          </div>
                          {defaultTypePrompts.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                              {defaultTypePrompts.map(defaultPrompt => {
                                const isCustomized = hasCustomPrompt(defaultPrompt, selectedCustomerSlug);
                                const customPrompt = isCustomized ? getCustomPrompt(defaultPrompt, selectedCustomerSlug) : null;
                                const displayPrompt = customPrompt || defaultPrompt;

                                return (
                                  <div key={defaultPrompt.id} className={`px-6 py-4 flex items-center justify-between ${
                                    isLight ? "hover:bg-gray-50" : "hover:bg-gray-700"
                                  }`}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        {isCustomized ? (
                                          <span title="Customized"><CheckCircle className="w-4 h-4 text-green-500" /></span>
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-blue-500" title="Using Default" />
                                        )}
                                        <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                                          {displayPrompt.promptName}
                                        </p>
                                        {!isCustomized && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                            Using Default
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-xs mt-1 font-mono ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                        {displayPrompt.promptIdentifier}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isCustomized ? (
                                        <>
                                          <button
                                            onClick={() => handleEdit(customPrompt!, true)}
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                            Edit Custom
                                          </button>
                                          <button
                                            onClick={() => handleDelete(customPrompt!.id)}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1 text-sm"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleCustomizePrompt(defaultPrompt)}
                                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                                        >
                                          <Plus className="w-4 h-4" />
                                          Customize
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={`px-6 py-8 text-center ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No default prompts for {type.label}</p>
                              <p className="text-xs mt-1">Create defaults first in the Default Prompts tab</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
