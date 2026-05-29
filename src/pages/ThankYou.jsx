import { Link } from "react-router-dom";
import logo from "../assets/Synaptech_Education_Logo.png";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      
      <div className="bg-white shadow-2xl rounded-2xl max-w-3xl w-full p-10 text-center">

        {/* Logo */}
        <img
          src={logo}
          alt="Synaptech Education"
          className="mx-auto h-24 mb-6"
        />

        {/* Success Heading */}
        <h1 className="text-4xl font-bold text-green-600 mb-4">
          Registration Successful 🎉
        </h1>

        {/* Main Message */}
        <p className="text-xl text-gray-700 mb-4">
          Thank you for choosing Synaptech Education.
        </p>

        <p className="text-lg text-gray-600 mb-3">
          Your registration has been received successfully.
        </p>

        <p className="text-lg text-gray-600 mb-6">
          Your Admission Counsellor will soon be in touch with you for further admission processes.
        </p>

        {/* Process Section */}
        <div className="bg-blue-50 rounded-lg p-5 text-left mb-6">
          <h2 className="font-bold text-blue-700 mb-3">
            What Happens Next?
          </h2>

          <ul className="space-y-2 text-gray-700">
            <li>✅ Registration Verification</li>
            <li>✅ Admission Counselling</li>
            <li>✅ Fee Payment Guidance</li>
            <li>✅ LMS Account Activation</li>
            <li>✅ Course Access & Orientation</li>
          </ul>
        </div>

        {/* Email Confirmation */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-green-700">
            Please check your registered email for enrollment confirmation.
          </p>
        </div>

        {/* Contact Information */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-2">
            Need Assistance?
          </h3>

          <p className="text-gray-700">
            📧 admission@synaptecheducation.in
          </p>

          <p className="text-gray-700">
            🌐 www.synaptecheducation.in
          </p>
        </div>

        {/* Home Button */}
        <Link
          to="/"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold inline-block transition duration-300"
        >
          Return to Homepage
        </Link>

      </div>

    </div>
  );
}