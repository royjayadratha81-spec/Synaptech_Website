export default function PremiumSectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="mb-8">

      <div className="flex items-center gap-5">

        {/* Icon Badge */}
        <div className="
          h-14
          w-14
          rounded-2xl
          bg-gradient-to-br
          from-blue-600
          to-violet-600
          flex
          items-center
          justify-center
          text-white
          shadow-xl
          shadow-blue-500/30
        ">
          {icon}
        </div>

        <div>

          <h2 className="
            text-3xl
            font-extrabold
            bg-gradient-to-r
            from-blue-700
            via-indigo-600
            to-violet-600
            bg-clip-text
            text-transparent
          ">
            {title}
          </h2>

          <p className="text-gray-500 mt-1">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="mt-6 h-px bg-gradient-to-r from-blue-500 via-violet-300 to-transparent"></div>

    </div>
  );
}