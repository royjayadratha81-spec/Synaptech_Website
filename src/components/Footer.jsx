import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10">

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-2 gap-8">

          <div>
            <h3 className="text-2xl font-bold mb-4">
              Synaptech Education
            </h3>

            <p className="text-gray-300">
              Industry-focused training in Data Science,
              Artificial Intelligence, Generative AI and
              Agentic AI.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">
              Quick Links
            </h3>

            <div className="flex flex-col gap-2">

              <Link to="/terms" className="hover:text-blue-400">
                Terms & Conditions
              </Link>

              <Link to="/privacy" className="hover:text-blue-400">
                Privacy Policy
              </Link>

              <Link to="/refund-policy" className="hover:text-blue-400">
                Cancellation & Refund Policy
              </Link>

              <Link to="/contact" className="hover:text-blue-400">
                Contact Us
              </Link>

            </div>
          </div>

        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">

          © 2026 Synaptech Education. All Rights Reserved.

        </div>

      </div>

    </footer>
  );
}