import KpiCard from "../dashboard/KpiCard";

export default function FinanceKPIs({
  students,
  expectedRevenue,
  revenueCollected,
  outstandingRevenue,
  receiptsUploaded,
  pendingReceipts,
  unpaidAdmissions,
  filter,
  setFilter,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">

      <KpiCard
        title="Students"
        value={students.length}
        icon="👨‍🎓"
        variant="blue"
        active={filter === "all"}
        onClick={() => setFilter("all")}
      />

      <KpiCard
        title="Expected Revenue"
        value={`₹${expectedRevenue.toLocaleString()}`}
        icon="💰"
        variant="green"
      />

      <KpiCard
        title="Revenue Collected"
        value={`₹${revenueCollected.toLocaleString()}`}
        icon="💵"
        variant="green"
        active={filter === "paid"}
        onClick={() => setFilter("paid")}
      />

      <KpiCard
        title="Outstanding Dues"
        value={`₹${outstandingRevenue.toLocaleString()}`}
        icon="🟠"
        variant="orange"
        active={filter === "outstanding"}
        onClick={() => setFilter("outstanding")}
      />

      <KpiCard
        title="Receipts Uploaded"
        value={receiptsUploaded}
        icon="📄"
        variant="cyan"
        active={filter === "uploaded"}
        onClick={() => setFilter("uploaded")}
      />

      <KpiCard
        title="Pending Receipts"
        value={pendingReceipts}
        icon="⏳"
        variant="red"
        active={filter === "pendingReceipt"}
        onClick={() => setFilter("pendingReceipt")}
      />

      <KpiCard
        title="Unpaid Admissions"
        value={unpaidAdmissions}
        icon="🚫"
        variant="yellow"
        active={filter === "unpaid"}
        onClick={() => setFilter("unpaid")}
      />

    </div>
  );
}