export default function EditableField({
  label,
  field,
  profile,
  setProfile,
  isEditing,
  type = "text",
  placeholder = "",
  options = [],
}) {
  return (
    <div className="flex justify-between items-center border-b py-3">
      <span className="font-semibold text-gray-700">
        {label}
      </span>

      {isEditing ? (
        type === "select" ? (
          <select
            value={profile[field] || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                [field]: e.target.value,
              })
            }
            className="border rounded-lg px-3 py-2 w-72"
          >
            {options.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={profile[field] || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                [field]: e.target.value,
              })
            }
            placeholder={placeholder}
            className="border rounded-lg px-3 py-2 w-72"
          />
        )
      ) : (
        <span className="text-gray-600 text-right max-w-xs break-words">
          {profile[field] || "--"}
        </span>
      )}
    </div>
  );
}