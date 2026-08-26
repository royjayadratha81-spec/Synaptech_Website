import { FaClipboardCheck, FaUserCheck, FaDownload } from "react-icons/fa";

export default function LatestFeedbackCard({ feedback }) {

    if (!feedback) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-3">
                    Latest Evaluation
                </h2>

                <p className="text-gray-500">
                    No evaluated assessments yet.
                </p>
            </div>
        );
    }
    const evaluationDate = feedback?.evaluationDate?.toDate
    ? feedback.evaluationDate.toDate()
    : feedback?.evaluationDate instanceof Date
        ? feedback.evaluationDate
        : feedback?.evaluationDate
            ? new Date(feedback.evaluationDate)
            : null;

    return (

        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">

            <div className="flex items-center gap-3 mb-5">

                <FaClipboardCheck
                    className="text-green-600 text-3xl"
                />

                <h2 className="text-2xl font-bold">
                    Latest Evaluation
                </h2>

            </div>

            <div className="space-y-3">

                <h3 className="text-xl font-semibold">
                    {feedback.assignmentTitle}
                </h3>

                <p>
                    <strong>Marks :</strong> {feedback.marks}/10
                </p>

                <p>
                    <strong>Remarks :</strong>
                    {" "}
                    {feedback.remarks}
                </p>

                <p>
                    <strong>Evaluated By :</strong>
                    {" "}
                    {feedback.evaluatedBy}
                </p>

                <p>
  {evaluationDate && !isNaN(evaluationDate.getTime())
    ? evaluationDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Date not available"}
</p>

                {feedback.fileUrl && (

                    <a
                        href={feedback.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 mt-3 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
                    >

                        <FaDownload />

                        Download Submitted File

                    </a>

                )}

            </div>

        </div>

    );

}