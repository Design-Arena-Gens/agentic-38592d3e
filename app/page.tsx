"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2
} from "lucide-react";
import { defaultDocument } from "@/lib/default-data";
import { generateOutputs, type GeneratedOutputs } from "@/lib/outputs";
import type {
  AdditionalCharge,
  DocumentInput,
  LineItem,
  OutputFormats,
  Tax
} from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const formatOptions: OutputFormats["formats"][number][] = [
  "markdown",
  "html_email",
  "pdf_ready",
  "json"
];

const emptyLineItem: LineItem = {
  description: "",
  hsn_sac: "",
  quantity: 1,
  unit: "unit",
  unit_price: 0,
  discount: undefined,
  tax: []
};

const emptyCharge: AdditionalCharge = {
  label: "",
  amount: 0
};

const sectionCard =
  "rounded-3xl bg-white shadow-brand/30 shadow-lg border border-white/60 backdrop-blur-sm";

const sectionTitle =
  "text-lg font-semibold text-primary flex items-center justify-between gap-2";

export default function HomePage() {
  const [formData, setFormData] = useState<DocumentInput>(defaultDocument);
  const [outputs, setOutputs] = useState<GeneratedOutputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState(
    JSON.stringify(defaultDocument, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] =
    useState<OutputFormats["formats"][number]>("html_email");

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);
    setError(null);
    generateOutputs(formData)
      .then((result) => {
        if (!isMounted) return;
        setOutputs(result);
        setRawJson(JSON.stringify(formData, null, 2));
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Unable to generate outputs.";
        setError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [formData]);

  useEffect(() => {
    if (!outputs) return;
    const available = formData.outputs.formats.filter((format) =>
      Boolean(outputs[format])
    );
    if (!available.includes(activeTab) && available.length) {
      setActiveTab(available[0]);
    }
  }, [outputs, formData.outputs.formats, activeTab]);

  const handleFieldChange = useCallback(
    <K extends keyof DocumentInput>(field: K, value: DocumentInput[K]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    },
    []
  );

  const updateLineItem = useCallback(
    (index: number, updates: Partial<LineItem>) => {
      setFormData((prev) => {
        const nextItems = [...prev.line_items];
        nextItems[index] = {
          ...nextItems[index],
          ...updates
        };
        return {
          ...prev,
          line_items: nextItems
        };
      });
    },
    []
  );

  const removeLineItem = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, idx) => idx !== index)
    }));
  }, []);

  const addLineItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      line_items: [...prev.line_items, { ...emptyLineItem }]
    }));
  }, []);

  const updateTax = useCallback(
    (lineIndex: number, taxIndex: number, updates: Partial<Tax>) => {
      setFormData((prev) => {
        const lineItems = [...prev.line_items];
        const taxes = [...(lineItems[lineIndex].tax ?? [])];
        taxes[taxIndex] = { ...taxes[taxIndex], ...updates };
        lineItems[lineIndex] = { ...lineItems[lineIndex], tax: taxes };
        return { ...prev, line_items: lineItems };
      });
    },
    []
  );

  const addTax = useCallback((lineIndex: number) => {
    setFormData((prev) => {
      const lineItems = [...prev.line_items];
      const taxes = [...(lineItems[lineIndex].tax ?? [])];
      taxes.push({ name: "CGST", rate: 9 });
      lineItems[lineIndex] = { ...lineItems[lineIndex], tax: taxes };
      return { ...prev, line_items: lineItems };
    });
  }, []);

  const removeTax = useCallback((lineIndex: number, taxIndex: number) => {
    setFormData((prev) => {
      const lineItems = [...prev.line_items];
      const taxes = [...(lineItems[lineIndex].tax ?? [])].filter(
        (_, idx) => idx !== taxIndex
      );
      lineItems[lineIndex] = { ...lineItems[lineIndex], tax: taxes };
      return { ...prev, line_items: lineItems };
    });
  }, []);

  const addCharge = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      additional_charges: [...(prev.additional_charges ?? []), { ...emptyCharge }]
    }));
  }, []);

  const updateCharge = useCallback(
    (index: number, updates: Partial<AdditionalCharge>) => {
      setFormData((prev) => {
        const charges = [...(prev.additional_charges ?? [])];
        charges[index] = { ...charges[index], ...updates };
        return { ...prev, additional_charges: charges };
      });
    },
    []
  );

  const removeCharge = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_charges: (prev.additional_charges ?? []).filter(
        (_, idx) => idx !== index
      )
    }));
  }, []);

  const handleFormatToggle = useCallback(
    (format: OutputFormats["formats"][number]) => {
      setFormData((prev) => {
        const formats = prev.outputs.formats.includes(format)
          ? prev.outputs.formats.filter((item) => item !== format)
          : [...prev.outputs.formats, format];
        return { ...prev, outputs: { ...prev.outputs, formats } };
      });
    },
    []
  );

  const handleJsonApply = useCallback(() => {
    try {
      const parsed = JSON.parse(rawJson);
      setFormData(parsed);
      setJsonError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid JSON payload.";
      setJsonError(message);
    }
  }, [rawJson]);

  const summaryMetrics = useMemo(() => {
    if (!outputs) return null;
    const { totals } = outputs;
    return [
      {
        label: "Grand Total",
        value: formatCurrency(totals.roundedGrandTotal)
      },
      {
        label: "Subtotal",
        value: formatCurrency(totals.subtotal)
      },
      {
        label: "Taxes",
        value: formatCurrency(totals.taxes)
      }
    ];
  }, [outputs]);

  const handleCopy = useCallback(
    async (format: OutputFormats["formats"][number]) => {
      if (!outputs || !outputs[format]) return;
      await navigator.clipboard.writeText(outputs[format] as string);
    },
    [outputs]
  );

  const handleDownload = useCallback(
    (format: OutputFormats["formats"][number]) => {
      if (!outputs || !outputs[format]) return;
      const blob = new Blob([outputs[format] as string], {
        type:
          format === "json"
            ? "application/json"
            : format === "markdown"
              ? "text/markdown"
              : "text/html"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formData.doc_no}-${format}.${format === "markdown" ? "md" : "html"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [outputs, formData.doc_no]
  );

  const activeContent = outputs?.[activeTab];
  const bankDetails = useMemo(
    () => ({
      account_name: formData.bank_details?.account_name ?? "",
      bank: formData.bank_details?.bank ?? "",
      account_no: formData.bank_details?.account_no ?? "",
      ifsc: formData.bank_details?.ifsc ?? "",
      upi_id: formData.bank_details?.upi_id ?? ""
    }),
    [formData.bank_details]
  );

  return (
    <main className="min-h-screen pb-24">
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#f7f8fc] via-[#eef1ff] to-[#f4f7ff]">
        <div className="absolute inset-x-0 top-[-150px] -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-1/2 w-[1200px] -translate-x-1/2 rotate-[10deg] bg-gradient-to-tr from-[#c8aa6e]/30 via-[#1b1f3b]/10 to-transparent opacity-60 shadow-xl" />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 pt-16">
          <header className="flex flex-col gap-6 pb-10 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-primary/60">
                Design Arena · Finance Ops
              </p>
              <h1 className="font-display text-4xl font-semibold text-primary lg:text-5xl">
                Professional Finance Document Generator
              </h1>
              <p className="max-w-2xl text-lg text-primary/70">
                Generate polished invoices, quotations, and bills tailored for
                Design Arena clients. Configure every detail, and download in
                Markdown, HTML email, PDF-ready HTML, and JSON instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-primary/20 hover:shadow-lg"
                onClick={() => setFormData(defaultDocument)}
              >
                <RefreshCcw className="h-4 w-4" />
                Reset to Sample
              </button>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-8 px-6 pb-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="space-y-6">
          <section className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className={sectionTitle}>
              <span>Document Details</span>
              <span className="text-sm text-primary/50">
                Cavedevelopers Finance Desk
              </span>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary/70">
                  Document Type
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-2xl border border-primary/10 bg-[#f9f9fc] px-4 py-3 text-sm font-medium text-primary shadow-inner focus:border-primary/40 focus:outline-none"
                    value={formData.document_type}
                    onChange={(event) =>
                      handleFieldChange(
                        "document_type",
                        event.target.value as DocumentInput["document_type"]
                      )
                    }
                  >
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                    <option value="bill">Bill</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary/70">
                  Document Number
                </label>
                <input
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                  value={formData.doc_no}
                  onChange={(event) =>
                    handleFieldChange("doc_no", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary/70">
                  Document Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                  value={formData.doc_date}
                  onChange={(event) =>
                    handleFieldChange("doc_date", event.target.value)
                  }
                />
              </div>
              {formData.document_type !== "quotation" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary/70">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                    value={formData.due_date ?? ""}
                    onChange={(event) =>
                      handleFieldChange("due_date", event.target.value)
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary/70">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                    value={formData.valid_until ?? ""}
                    onChange={(event) =>
                      handleFieldChange("valid_until", event.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </section>

          <section className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <h2 className={sectionTitle}>Company Profile</h2>
                <div className="grid gap-4">
                  {(
                    [
                      ["name", "Company Name"],
                      ["tagline", "Tagline"],
                      ["address", "Address"],
                      ["gst", "GST"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                      ["website", "Website"],
                      ["logo_url", "Logo URL"]
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                        {label}
                      </label>
                      <input
                        className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                        value={(formData.company[field] as string) ?? ""}
                        onChange={(event) =>
                          handleFieldChange("company", {
                            ...formData.company,
                            [field]: event.target.value
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                <h2 className={sectionTitle}>Bill To</h2>
                <div className="grid gap-4">
                  {(
                    [
                      ["name", "Client Name"],
                      ["address", "Address"],
                      ["gst", "GST"],
                      ["email", "Email"],
                      ["phone", "Phone"]
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                        {label}
                      </label>
                      <input
                        className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                        value={(formData.bill_to[field] as string) ?? ""}
                        onChange={(event) =>
                          handleFieldChange("bill_to", {
                            ...formData.bill_to,
                            [field]: event.target.value
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className={sectionTitle}>
              <span>Line Items</span>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-primary/90"
                onClick={addLineItem}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {formData.line_items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-primary/10 bg-[#fafbff] p-5 shadow-inner"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-primary/40">
                      <span>Item {index + 1}</span>
                    </div>
                    <button
                      className="rounded-full bg-white p-2 text-primary/40 transition hover:text-primary hover:shadow-md"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                        Description
                      </label>
                      <textarea
                        className="min-h-[80px] w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(index, {
                            description: event.target.value
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                          HSN / SAC
                        </label>
                        <input
                          className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                          value={item.hsn_sac ?? ""}
                          onChange={(event) =>
                            updateLineItem(index, {
                              hsn_sac: event.target.value
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                          value={item.quantity}
                          onChange={(event) =>
                            updateLineItem(index, {
                              quantity: Number(event.target.value)
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                          Unit
                        </label>
                        <input
                          className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                          value={item.unit}
                          onChange={(event) =>
                            updateLineItem(index, { unit: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                          value={item.unit_price}
                          onChange={(event) =>
                            updateLineItem(index, {
                              unit_price: Number(event.target.value)
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                        Discount
                      </label>
                      <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-inner sm:flex-row sm:items-center">
                        <select
                          className="rounded-2xl border border-primary/10 bg-[#f4f6ff] px-3 py-2 text-sm font-medium focus:border-primary/40 focus:outline-none"
                          value={item.discount?.type ?? "none"}
                          onChange={(event) =>
                            updateLineItem(index, {
                              discount:
                                event.target.value === "none"
                                  ? undefined
                                  : {
                                      type: event.target.value as
                                        | "percent"
                                        | "flat",
                                      value:
                                        item.discount?.value ??
                                        (event.target.value === "percent"
                                          ? 5
                                          : 1000)
                                    }
                            })
                          }
                        >
                          <option value="none">None</option>
                          <option value="percent">Percent</option>
                          <option value="flat">Flat</option>
                        </select>
                        {item.discount && (
                          <input
                            type="number"
                            step={0.01}
                            className="flex-1 rounded-2xl border border-primary/10 bg-white px-4 py-2 text-sm focus:border-primary/40 focus:outline-none"
                            value={item.discount.value}
                            onChange={(event) =>
                              updateLineItem(index, {
                                discount: {
                                  ...item.discount!,
                                  value: Number(event.target.value)
                                }
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                          Taxes
                        </label>
                        <button
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
                          onClick={() => addTax(index)}
                        >
                          <Plus className="h-3 w-3" />
                          Add Tax
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(item.tax ?? []).map((tax, taxIndex) => (
                          <div
                            key={taxIndex}
                            className="flex flex-col gap-2 rounded-2xl border border-primary/10 bg-white p-3 shadow-inner sm:flex-row"
                          >
                            <input
                              className="flex-1 rounded-2xl border border-primary/10 bg-[#f9f9fe] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                              value={tax.name}
                              onChange={(event) =>
                                updateTax(index, taxIndex, {
                                  name: event.target.value
                                })
                              }
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-24 rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                                value={tax.rate}
                                onChange={(event) =>
                                  updateTax(index, taxIndex, {
                                    rate: Number(event.target.value)
                                  })
                                }
                              />
                              <span className="text-sm text-primary/50">%</span>
                              <button
                                className="rounded-full bg-primary/10 p-2 text-primary/60 transition hover:bg-primary/20 hover:text-primary"
                                onClick={() => removeTax(index, taxIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {!(item.tax ?? []).length && (
                          <p className="text-sm text-primary/50">
                            No taxes applied. Add CGST/SGST/IGST as needed.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!formData.line_items.length && (
                <div className="rounded-3xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-primary/40">
                  Add at least one line item to generate the document.
                </div>
              )}
            </div>
          </section>

          <section className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className={sectionTitle}>Charges & Adjustments</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                      Shipping
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm focus:border-primary/40 focus:outline-none"
                      value={formData.shipping ?? 0}
                      onChange={(event) =>
                        handleFieldChange("shipping", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                        Additional Charges
                      </label>
                      <button
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
                        onClick={addCharge}
                      >
                        <Plus className="h-3 w-3" />
                        Add Charge
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(formData.additional_charges ?? []).map((charge, idx) => (
                        <div
                          key={idx}
                          className="grid gap-3 rounded-2xl border border-primary/10 bg-[#fafaff] p-4 shadow-inner sm:grid-cols-[1fr_auto_auto]"
                        >
                          <input
                            className="rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                            placeholder="Label"
                            value={charge.label}
                            onChange={(event) =>
                              updateCharge(idx, { label: event.target.value })
                            }
                          />
                          <input
                            type="number"
                            step={0.01}
                            className="rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                            placeholder="Amount"
                            value={charge.amount}
                            onChange={(event) =>
                              updateCharge(idx, {
                                amount: Number(event.target.value)
                              })
                            }
                          />
                          <button
                            className="rounded-full bg-white p-2 text-primary/40 transition hover:text-primary"
                            onClick={() => removeCharge(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {!(formData.additional_charges ?? []).length && (
                        <p className="text-sm text-primary/40">
                          Add optional delivery fees or surcharges.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                      Rounding Preference
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {["none", "nearest", "up", "down"].map((mode) => (
                        <button
                          key={mode}
                          className={cn(
                            "rounded-2xl border px-3 py-2 text-sm font-medium capitalize transition",
                            formData.rounding === mode
                              ? "border-primary bg-primary text-white shadow-lg"
                              : "border-primary/10 bg-white text-primary hover:border-primary/30"
                          )}
                          onClick={() =>
                            handleFieldChange(
                              "rounding",
                              mode as DocumentInput["rounding"]
                            )
                          }
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className={sectionTitle}>Messaging & Bank</h2>
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                    Notes
                  </label>
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                    value={formData.notes ?? ""}
                    onChange={(event) =>
                      handleFieldChange("notes", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                    Terms
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                    value={(formData.terms ?? []).join("\n")}
                    onChange={(event) =>
                      handleFieldChange("terms", event.target.value.split("\n"))
                    }
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-primary/50">
                    Bank Details
                  </label>
                  {(
                    [
                      ["account_name", "Account Name"],
                      ["bank", "Bank"],
                      ["account_no", "Account Number"],
                      ["ifsc", "IFSC"],
                      ["upi_id", "UPI ID"]
                    ] as const
                  ).map(([field, label]) => (
                    <input
                      key={field}
                      placeholder={label}
                      className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-primary/40 focus:outline-none"
                      value={bankDetails[field] ?? ""}
                      onChange={(event) =>
                        handleFieldChange("bank_details", {
                          ...bankDetails,
                          [field]: event.target.value
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <h2 className={sectionTitle}>Output Preferences</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {formatOptions.map((format) => (
                    <button
                      key={format}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition",
                        formData.outputs.formats.includes(format)
                          ? "border-primary bg-primary text-white shadow-lg"
                          : "border-primary/10 bg-white text-primary hover:border-primary/30"
                      )}
                      onClick={() => handleFormatToggle(format)}
                    >
                      {format.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition",
                      formData.outputs.show_amount_in_words
                        ? "border-primary bg-primary text-white"
                        : "border-primary/10 bg-white text-primary hover:border-primary/30"
                    )}
                    onClick={() =>
                      handleFieldChange("outputs", {
                        ...formData.outputs,
                        show_amount_in_words: !formData.outputs
                          .show_amount_in_words
                      })
                    }
                  >
                    Amount in Words
                  </button>
                  <button
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition",
                      formData.outputs.show_qr
                        ? "border-primary bg-primary text-white"
                        : "border-primary/10 bg-white text-primary hover:border-primary/30"
                    )}
                    onClick={() =>
                      handleFieldChange("outputs", {
                        ...formData.outputs,
                        show_qr: !formData.outputs.show_qr
                      })
                    }
                  >
                    Payment QR
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={sectionTitle}>Advanced JSON Editor</h2>
                </div>
                <textarea
                  className="min-h-[200px] w-full rounded-2xl border border-primary/10 bg-[#0e1020]/95 px-4 py-3 font-mono text-sm text-white shadow-inner focus:border-primary/40 focus:outline-none"
                  value={rawJson}
                  onChange={(event) => setRawJson(event.target.value)}
                />
                {jsonError && (
                  <p className="text-sm text-red-500">{jsonError}</p>
                )}
                <button
                  className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  onClick={handleJsonApply}
                >
                  Apply JSON Payload
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/50">
                  Finance Snapshot
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-primary">
                  Executive Summary
                </h2>
              </div>
              {isGenerating && (
                <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
              )}
            </div>
            {outputs && summaryMetrics ? (
              <div className="mt-6 grid gap-4">
                {summaryMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-primary/10 bg-[#fafbff] p-4 shadow-inner"
                  >
                    <div className="text-xs uppercase tracking-[0.3em] text-primary/40">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-primary">
                      {metric.value}
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-primary/10 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-primary/40">
                    Tax Breakup
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {Object.entries(outputs.totals.taxBreakup).map(
                      ([label, amount]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between text-primary/70"
                        >
                          <span>{label}</span>
                          <span className="font-medium text-primary">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      )
                    )}
                    {!Object.keys(outputs.totals.taxBreakup).length && (
                      <p className="text-primary/50">No taxes applied.</p>
                    )}
                  </div>
                </div>
                {outputs.amount_in_words && (
                  <div className="rounded-2xl border border-primary/10 bg-primary text-white p-5 shadow-lg">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                      Amount in Words
                    </p>
                    <p className="mt-3 text-lg font-semibold leading-relaxed">
                      {outputs.amount_in_words}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 text-sm text-primary/50">
                Configure document parameters to see a live summary.
              </div>
            )}
          </div>

          <div className={cn(sectionCard, "p-6 lg:p-8")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/50">
                  Export Center
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-primary">
                  Document Outputs
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/30"
                  onClick={() => activeTab && handleCopy(activeTab)}
                  disabled={!activeContent}
                >
                  <div className="flex items-center gap-1.5">
                    <Copy className="h-4 w-4" />
                    Copy
                  </div>
                </button>
                <button
                  className="rounded-xl border border-primary/10 bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-primary/90"
                  onClick={() => activeTab && handleDownload(activeTab)}
                  disabled={!activeContent}
                >
                  <div className="flex items-center gap-1.5">
                    <Download className="h-4 w-4" />
                    Download
                  </div>
                </button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {formData.outputs.formats.map((format) => (
                <button
                  key={format}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition",
                    activeTab === format
                      ? "border-primary bg-primary text-white"
                      : "border-primary/10 bg-white text-primary hover:border-primary/30"
                  )}
                  onClick={() => setActiveTab(format)}
                >
                  {format.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-6 min-h-[320px] rounded-3xl border border-primary/10 bg-[#fdfdff] p-4 shadow-inner">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              {!error && !activeContent && (
                <div className="flex h-full items-center justify-center text-sm text-primary/40">
                  Select a format to view generated output.
                </div>
              )}
              {!error && activeContent && (
                <div className="h-full overflow-auto rounded-2xl bg-white p-4">
                  {activeTab === "html_email" ? (
                    <div
                      className="min-h-[480px]"
                      dangerouslySetInnerHTML={{
                        __html: outputs?.html_email ?? ""
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-primary/80">
                      {outputs?.[activeTab]}
                    </pre>
                  )}
                </div>
              )}
            </div>
            {outputs?.qr_data_url && (
              <div className="mt-6 rounded-2xl border border-primary/10 bg-white p-5 text-center shadow-inner">
                <p className="text-xs uppercase tracking-[0.3em] text-primary/40">
                  Payment QR
                </p>
                <img
                  src={outputs.qr_data_url}
                  alt="UPI QR"
                  className="mx-auto mt-4 h-36 w-36 rounded-2xl shadow-lg"
                />
                <p className="mt-2 text-xs text-primary/50">
                  {outputs.qr_string}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="border-t border-primary/10 bg-white/80 py-10 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 text-sm text-primary/60">
          <span>
            Built for Design Arena · Finance Document Generator v1.0
          </span>
          <span>
            Ready for deployment on Vercel · Crafted with Next.js & Tailwind
          </span>
        </div>
      </footer>
    </main>
  );
}
