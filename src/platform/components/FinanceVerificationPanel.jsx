import { useMemo, useState } from "react";

import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaWallet,
} from "react-icons/fa";

import { verifyAdmissionsFinance } from "../services/admissionsApi";

const CLEARANCE_OPTIONS = [
  {
    value: "payment_received",
    label: "Payment received",
  },
  {
    value: "installment_approved",
    label: "Installment approved",
  },
  {
    value: "scholarship_approved",
    label: "Scholarship approved",
  },
  {
    value: "fee_waived",
    label: "Fee waived",
  },
];

const PAYMENT_METHOD_OPTIONS = [
  {
    value: "upi",
    label: "UPI",
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
  },
  {
    value: "card",
    label: "Card",
  },
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "cheque",
    label: "Cheque",
  },
  {
    value: "payment_gateway",
    label: "Payment gateway",
  },
  {
    value: "other",
    label: "Other",
  },
];

const INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-45";

function getTodayValue() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60 * 1000
  );

  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) {
    return "Date not recorded";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatAmount(value, currency = "INR") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function FinanceVerificationPanel({
  application,
  organizationId,
  applicantName,
  programmeName,
  canVerify = false,
  onVerified,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [clearanceType, setClearanceType] =
    useState("payment_received");

  const [amountReceived, setAmountReceived] =
    useState("");

  const [currency, setCurrency] =
    useState("INR");

  const [paymentMethod, setPaymentMethod] =
    useState("upi");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [paymentDate, setPaymentDate] =
    useState(getTodayValue);

  const [note, setNote] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const status = String(
    application?.status ||
      application?.application_status ||
      ""
  ).toLowerCase();

  const financeMetadata = useMemo(() => {
    const metadata = application?.metadata;

    if (
      !metadata ||
      typeof metadata !== "object" ||
      Array.isArray(metadata)
    ) {
      return {};
    }

    const financeVerification =
      metadata.finance_verification;

    return financeVerification &&
      typeof financeVerification === "object" &&
      !Array.isArray(financeVerification)
      ? financeVerification
      : {};
  }, [application]);

  const isPaymentReceived =
    clearanceType === "payment_received";

  if (status === "finance_verified") {
    const recordedAmount = formatAmount(
      financeMetadata.amount_received,
      financeMetadata.currency || "INR"
    );

    return (
      <div className="mt-4 rounded-[20px] border border-emerald-300/20 bg-emerald-400/[0.08] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <FaCheckCircle />
          </div>

          <div>
            <p className="text-sm font-black text-emerald-200">
              Finance clearance verified
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-100/65">
              {formatLabel(
                financeMetadata.clearance_type
              )}

              {recordedAmount
                ? ` · ${recordedAmount}`
                : ""}

              {financeMetadata.payment_method
                ? ` · ${formatLabel(
                    financeMetadata.payment_method
                  )}`
                : ""}
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Verified {formatDate(
                application.finance_verified_at ||
                  financeMetadata.verified_at
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "finance_pending") {
    return null;
  }

  if (!canVerify) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-amber-300/15 bg-amber-400/[0.06] p-4">
        <FaLock className="mt-0.5 shrink-0 text-amber-300" />

        <div>
          <p className="text-xs font-black text-amber-200">
            Finance verification pending
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            A Platform Super Admin, Tenant Admin, or Finance Admin must clear this gate.
          </p>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="mt-4 rounded-[20px] border border-emerald-300/15 bg-emerald-400/[0.055] p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <FaWallet />
            </div>

            <div>
              <p className="text-sm font-black text-white">
                Finance verification required
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Admissions has approved this application. Record the authorised Finance clearance next.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setExpanded(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black text-emerald-950 transition hover:bg-emerald-300"
          >
            <FaShieldAlt />
            Review Finance gate
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!application?.id) {
      setError(
        "The admission application ID is missing."
      );
      return;
    }

    const amount = isPaymentReceived
      ? Number(amountReceived)
      : 0;

    if (
      isPaymentReceived &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      setError(
        "Enter the positive amount actually received."
      );
      return;
    }

    const clearanceLabel =
      CLEARANCE_OPTIONS.find(
        (option) =>
          option.value === clearanceType
      )?.label || "Finance clearance";

    const confirmed = window.confirm(
      `Confirm ${clearanceLabel.toLowerCase()} for ${
        applicantName || "this applicant"
      }? This will finalize the admission, create the student as Awaiting LMS Access, and write the audit events. LMS access will remain disabled.`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const result =
        await verifyAdmissionsFinance({
          organizationId,
          applicationId: application.id,
          clearanceType,
          amountReceived: amount,
          currency,
          paymentMethod: isPaymentReceived
            ? paymentMethod
            : null,
          paymentReference:
            paymentReference || null,
          paymentDate: paymentDate || null,
          note: note || null,
        });

      setSuccess(
        result?.message ||
          "Finance verification completed."
      );

      if (typeof onVerified === "function") {
        await onVerified(result.application);
      }
    } catch (requestError) {
      console.error(
        "Admissions Finance verification failed:",
        requestError
      );

      setError(
        requestError?.message ||
          "Finance verification could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-[22px] border border-emerald-300/20 bg-emerald-400/[0.065] p-4"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200">
            <FaWallet />
            Verify Finance clearance
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {applicantName || "Applicant"}
            {programmeName
              ? ` · ${programmeName}`
              : ""}
          </p>
        </div>

        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
          Audit trail enabled
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Clearance type
          </span>

          <select
            value={clearanceType}
            disabled={submitting}
            onChange={(event) => {
              setClearanceType(event.target.value);
              setError("");
            }}
            className={INPUT_CLASS_NAME}
          >
            {CLEARANCE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-950"
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Payment date
          </span>

          <input
            type="date"
            value={paymentDate}
            disabled={submitting}
            onChange={(event) =>
              setPaymentDate(event.target.value)
            }
            className={INPUT_CLASS_NAME}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Amount received
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={amountReceived}
            required={isPaymentReceived}
            disabled={
              submitting || !isPaymentReceived
            }
            onChange={(event) =>
              setAmountReceived(event.target.value)
            }
            placeholder={
              isPaymentReceived
                ? "Enter actual amount"
                : "Not required"
            }
            className={INPUT_CLASS_NAME}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Currency
          </span>

          <input
            type="text"
            maxLength={3}
            value={currency}
            disabled={submitting}
            onChange={(event) =>
              setCurrency(
                event.target.value.toUpperCase()
              )
            }
            className={INPUT_CLASS_NAME}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Payment method
          </span>

          <select
            value={paymentMethod}
            required={isPaymentReceived}
            disabled={
              submitting || !isPaymentReceived
            }
            onChange={(event) =>
              setPaymentMethod(event.target.value)
            }
            className={INPUT_CLASS_NAME}
          >
            {PAYMENT_METHOD_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-950"
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Payment reference
          </span>

          <input
            type="text"
            maxLength={200}
            value={paymentReference}
            disabled={submitting}
            onChange={(event) =>
              setPaymentReference(event.target.value)
            }
            placeholder="UPI, bank or receipt reference"
            className={INPUT_CLASS_NAME}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Finance note
        </span>

        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          disabled={submitting}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="Optional internal note for the audit trail"
          className={`${INPUT_CLASS_NAME} resize-y`}
        />
      </label>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-xs text-red-200">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
          <FaCheckCircle className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaShieldAlt />
          )}

          {submitting
            ? "Verifying Finance"
            : "Confirm Finance verification"}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setExpanded(false);
            setError("");
            setSuccess("");
          }}
          className="rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-3 text-xs font-black text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
        <FaLock className="mt-1 shrink-0" />
        This action finalizes Finance and creates the student record as Awaiting LMS Access. It does not grant LMS access.
      </p>
    </form>
  );
}
