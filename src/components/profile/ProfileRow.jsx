export default function ProfileRow({
  label,
  value,
}) {
  return (
    <div className="flex justify-between items-center border-b py-3">

      <span className="font-semibold text-gray-700">
        {label}
      </span>

      <span className="text-gray-600 text-right">
        {value || "--"}
      </span>

    </div>
  );
}