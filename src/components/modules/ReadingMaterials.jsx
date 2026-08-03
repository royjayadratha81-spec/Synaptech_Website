import React from "react";

export default function ReadingMaterials({

  readingMaterials,

  readingProgress,

  onOpenMaterial,

  onMarkRead,

}) {
  if (readingMaterials.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">
          📖 Reading Materials
        </h2>

        <p className="text-gray-500">
          No reading materials available.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-6">
        📖 Reading Materials
      </h2>

      {readingMaterials.map((material) => {

    const progress =
        readingProgress[material.id] || {};

    const opened =
        progress.opened || false;

    const completed =
        progress.completed || false;

    return (
        
  <div
    key={material.id}
    className="border rounded-xl p-5 mb-6"
  >
    <h3 className="text-lg font-semibold mb-2">
      {material.title}
    </h3>

    <div className="flex items-center gap-2 text-gray-600 mb-2">
      📘
      <span>Reading Material</span>
    </div>

    <p className="text-gray-600 mb-4">
      Estimated Reading Time :
      <strong> 60 mins</strong>
    </p>

    <div className="flex justify-between items-center mb-4">
      <span className="font-medium text-gray-600">
        Status
      </span>

      {completed ? (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
          ✅ Completed
        </span>
      ) : (
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
          Not Started
        </span>
      )}
    </div>
    <div className="flex flex-col gap-3">

  <button
    onClick={() => onOpenMaterial(material)}
    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition"
  >
    Open Material
  </button>

  {completed ? (

    <button
      disabled
      className="w-full bg-green-600 text-white py-2 rounded-xl opacity-70 cursor-not-allowed"
    >
      ✓ Read
    </button>

  ) : (

    <button
      disabled={!opened}
      onClick={() => onMarkRead(material)}
      className={`w-full py-2 rounded-xl transition ${
        opened
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      Mark as Read
    </button>

  )}

</div>

  </div>
);
})}
    </div>
  );
}